import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMachineDefaults, getMachineOsTypes } from '../../api/machineAPI';
import {
  getProvisioners,
  getProvisionerVersion,
  createMachine,
  getArtifacts,
  getIsoArtifacts,
  getBridgedInterfaces,
  getNextServerId,
  getTemplates,
  getTemplateSources,
  getRemoteTemplates,
  getMediaList,
  getIpSuggestions,
} from '../../api/provisioningAPI';
import { getZfsPools, getZfsDatasets } from '../../api/zfsAPI';
import { flattenBoxCatalog, pickDefaultSource } from '../../utils/boxCatalog';
import { hasFeature, hasHypervisor } from '../../utils/capabilities';
import { resourceLabel } from '../../utils/resourceLabel';
import { FormModal, ResourceIssueList, validationDetails, resourceWarnings } from '../common';

import {
  GeneralStep,
  BoxStep,
  DisksStep,
  SystemStep,
  ResourcesStep,
  NetworkStep,
  ProvisioningStep,
  ConfirmStep,
} from './CreateWizardSteps';
import { buildHardwarePayload, buildPortsPayload } from './HardwareEditor';
import {
  withAddressing,
  cdromEntry,
  filesystemEntries,
  flattenBridgedInterfaces,
  isoFilenames,
} from './machineHelpers';
import { dslConfiguration, seedAnswers, pruneHidden, validateAnswers } from './ProvisionerFieldDsl';
import { seedRoles } from './ProvisionerFormFields';

// Machine-create wizard — stepped tabs with Back/Next and a footer Advanced
// toggle. POST /machines answers the create-orchestration shape
// {parent_task_id, machine_name, sub_tasks, requires_download}; the machine
// row appears at the finalize child. A package whose rendered document
// carries hosts[] N>1 answers {multi_host: true, count, machines:
// [{machine_name, parent_task_id, sub_tasks}, …hosts[] order]} — N parents,
// names FINAL, machine k+1 chained on machine k (the converged M-Q1 wire).

const STEPS = [
  { id: 'general', label: 'General' },
  { id: 'box', label: 'OS / Box' },
  { id: 'system', label: 'System' },
  { id: 'disks', label: 'Disks' },
  { id: 'resources', label: 'CPU & Memory' },
  { id: 'network', label: 'Network' },
  { id: 'provisioning', label: 'Provisioning' },
  { id: 'confirm', label: 'Confirm' },
];

const BOX_SETTING_KEYS = ['box', 'box_version', 'box_arch', 'box_url'];

const emptyDiskConfig = () => ({
  bootSize: '',
  // sparse rides the wire EXPLICITLY (disk spec v1: spelled, never
  // defaulted) — seeded true, the agents' frozen default.
  bootSparse: true,
  bootPath: '',
  bootVolumeName: '',
  // ZFS placement (bhyve) — which pool + parent dataset the boot zvol lands
  // in (zoneweaver executor: pool||'rpool', dataset||'zones').
  bootPool: '',
  bootDataset: '',
  // copy is the ruled default — legal same-pool, cross-pool, and on vbox.
  bootCloneStrategy: 'copy',
  // VBox attachment placement for the boot entry (controller/port ride
  // every entry on the frozen wire).
  bootController: '',
  bootPort: '',
  // VBox FILE placement — where the CREATED disk file lands (blank/template
  // only; absent = the machine folder).
  bootDirectory: '',
  additional: [],
  cdroms: [],
  // controllers[] rows + per-media controller/port addressing. Empty = the
  // agent's single-SATA shape.
  controllers: [],
  // bhyve lofs mounts — top-level `filesystems[]` on the create spec.
  filesystems: [],
});

const emptyCloudInit = () => ({
  enabled: false,
  dns_domain: '',
  password: '',
  resolvers: '',
  sshkey: '',
});

// Every settings.* key the wizard edits. hostname/domain required;
// server_id required under prefix naming, prefilled from
// GET /machines/ids/next; box fields optional. The package-override keys
// (firmware_type…vagrant_user_pass) exist because template values are
// DEFAULTS, never locks (Mark's ruling 2026-07-17) — the rendered
// settings BECOME the machine's settings, so the wizard must let the
// user override what the package would otherwise write.
const SETTING_KEYS = [
  'hostname',
  'domain',
  'server_id',
  'vcpus',
  'memory',
  'os_type',
  'boot_priority',
  'box',
  'box_version',
  'box_arch',
  'box_url',
  'firmware_type',
  'provider_type',
  'setup_wait',
  'show_console',
  'debug_build',
  'post_provision',
  'consoleport',
  'vagrant_user',
  'vagrant_user_pass',
  'vagrant_ssh_insert_key',
];

const emptySettings = () => ({
  ...Object.fromEntries(SETTING_KEYS.map(key => [key, ''])),
  vcpus: 2,
  memory: '2G',
});

// The proven provision sequence (sync build sheet, 2026-07-07): networks[0]
// SHOULD be the user's bridged external — the networking role makes it the
// machine's REAL network post-provision (route + DNS). Seeded by default;
// the role's netplan template reads dns[0] AND dns[1] even under DHCP.
const defaultExternalNetwork = () => ({
  type: 'external',
  bridge: '',
  dhcp4: true,
  dhcp6: false,
  mac: 'auto',
  dns: ['1.1.1.1', '8.8.8.8'],
});

const MachineCreateModal = ({ isOpen, onClose, currentServer, onCompleted }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [provisioners, setProvisioners] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [remoteBoxes, setRemoteBoxes] = useState([]);
  const [catalogNote, setCatalogNote] = useState('');
  // Registry filter over the merged image list (Mark's ask): '' = all.
  const [sourceNames, setSourceNames] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('');
  const [boxPickCustom, setBoxPickCustom] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [versionKey, setVersionKey] = useState('');
  // The registry LIST is a summary — metadata (roles + the field DSL) rides
  // the version DETAIL only, fetched on pick. `pending` gates the
  // "predates the field DSL" hint so it never flashes mid-fetch.
  const [versionDetail, setVersionDetail] = useState(null);
  const [versionPending, setVersionPending] = useState(false);
  const versionFetchSeq = useRef(0);
  const [name, setName] = useState('');
  const [settings, setSettings] = useState(emptySettings);
  const [bootSource, setBootSource] = useState('template');
  const [diskConfig, setDiskConfig] = useState(emptyDiskConfig);
  const [bootOrder, setBootOrder] = useState([]);
  const [zones, setZones] = useState({});
  const [cloudInit, setCloudInit] = useState(emptyCloudInit);
  // hardware.<section>.<key> values — blank means not sent.
  const [hardware, setHardware] = useState({});
  const [serialRows, setSerialRows] = useState([]);
  const [parallelRows, setParallelRows] = useState([]);
  const [vboxJson, setVboxJson] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [networks, setNetworks] = useState([]);
  const [roles, setRoles] = useState([]);
  // The DSL answers — ONE flat map keyed by exact field name; hidden fields
  // never ride the wire (pruned at buildSpec). advanced_properties is gone.
  const [properties, setProperties] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [syncMethod, setSyncMethod] = useState('rsync');
  // The provisioning-transport removal SIGNAL (converged: option (b) — one
  // per-create key both agents fold into their native transport; per-agent
  // ruled defaults when absent: Go keep, zoneweaver remove). '' = unsent.
  const [removeTransport, setRemoveTransport] = useState('');
  const [safeIdPath, setSafeIdPath] = useState('');
  const [startAfterCreate, setStartAfterCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Resource-validation 400 details[] (catalog §3) — rendered per entry.
  const [errorDetails, setErrorDetails] = useState([]);
  const [artifacts, setArtifacts] = useState(null);
  // Cached ISO filenames — the cdrom rows' {iso} references resolve these.
  const [isoOptions, setIsoOptions] = useState([]);
  const [bridgeOptions, setBridgeOptions] = useState([]);
  // The same uplinks WITH their class for the Network step's dropdown —
  // phys + aggr + etherstub (Mark: all three, labeled).
  const [bridgeChoices, setBridgeChoices] = useState([]);
  // ADVISORY free-IP feed for static addressing (converged wire) — null =
  // the agent doesn't serve it, the address field stays plain.
  const [ipSuggestions, setIpSuggestions] = useState(null);
  // ZFS placement pickers (bhyve Disks step) — live pools + filesystem
  // datasets; the pickers keep a Custom… escape so any premade path stays
  // typable.
  const [zfsPools, setZfsPools] = useState([]);
  const [zfsDatasets, setZfsDatasets] = useState([]);
  // Existing zvols — the bhyve `image` pickers' feed (in-use flag rides
  // once zoneweaver serves it; the agent refuses in-use attaches meanwhile).
  const [zfsVolumes, setZfsVolumes] = useState([]);
  // Registered media — the VBox `image` pickers' feed (GET /media, frozen
  // disk-spec wire); [] until the agent serves it, the path input stands.
  const [vboxMedia, setVboxMedia] = useState([]);
  // GET /machines/defaults — the ACTUAL values untouched fields get
  // (Mark's ask: never a bare "(agent default)" label). {settings, zones,
  // disks, notes}; agents without the endpoint leave it null and the
  // labels stay generic.
  const [agentDefaults, setAgentDefaults] = useState(null);
  // GET /machines/ostypes — the Guest OS Type dropdown feed; null (endpoint
  // absent, or 503 = no VirtualBox) keeps the plain text input.
  const [osTypes, setOsTypes] = useState(null);

  const singular = resourceLabel(currentServer, { plural: false });
  const bhyve = !!currentServer && hasHypervisor(currentServer, 'bhyve');
  const vbox = !!currentServer && hasHypervisor(currentServer, 'virtualbox');

  const family = useMemo(
    () => provisioners.find(collection => collection.name === familyName) || null,
    [provisioners, familyName]
  );
  const version = useMemo(
    () => family?.versions?.find(v => v.version === versionKey || v.dir === versionKey) || null,
    [family, versionKey]
  );

  // The DETAIL wins over the list row wherever both exist — the registry
  // list is a summary; metadata (roles + the field DSL) rides the detail.
  const versionInfo = versionDetail || version;
  const fieldConfig = useMemo(() => dslConfiguration(versionInfo), [versionInfo]);
  // Safe ID is PACKAGE-DECLARED need (manifest id_files — the agents'
  // working-copy staging keys), never a standing field: the generic package
  // ships no id files; domino-family manifests declare them.
  const needsSafeId = !!versionInfo?.id_files;
  // options_source pickers draw on what the wizard already fetched: host
  // NICs as `networks`, the local template registry as `images`.
  const fieldInventory = useMemo(
    () => ({
      networks: bridgeOptions,
      images: [...new Set(templates.map(t => `${t.organization}/${t.box_name}`))],
    }),
    [bridgeOptions, templates]
  );

  // Clone-strategy pool feed: the selected LOCAL template row's
  // available_pools; a not-yet-downloaded box lands deterministically on
  // config.template_pool. null = no pool knowledge, the set stays clone|copy.
  const templateAvailablePools = useMemo(() => {
    const row =
      templates.find(
        t =>
          `${t.organization}/${t.box_name}` === settings.box &&
          (!settings.box_version || t.version === settings.box_version)
      ) ||
      templates.find(t => `${t.organization}/${t.box_name}` === settings.box) ||
      null;
    if (row?.available_pools) {
      return row.available_pools;
    }
    const landingPool = agentDefaults?.config?.template_pool;
    return landingPool ? [landingPool] : null;
  }, [templates, settings.box, settings.box_version, agentDefaults]);

  const resetForm = useCallback(() => {
    setError('');
    setErrorDetails([]);
    setStepIndex(0);
    setMaxVisited(0);
    setShowAdvanced(false);
    setFamilyName('');
    setVersionKey('');
    versionFetchSeq.current += 1;
    setVersionDetail(null);
    setVersionPending(false);
    setName('');
    setSettings(emptySettings());
    setBootSource('template');
    setDiskConfig(emptyDiskConfig());
    setBootOrder([]);
    setZones({});
    setCloudInit(emptyCloudInit());
    setHardware({});
    setSerialRows([]);
    setParallelRows([]);
    setVboxJson('');
    setTagsInput('');
    setNotes('');
    setNetworks([defaultExternalNetwork()]);
    setRoles([]);
    setProperties({});
    setFieldErrors({});
    setSyncMethod('rsync');
    setRemoveTransport('');
    setSafeIdPath('');
    setStartAfterCreate(false);
  }, []);

  // ---- live picker feeds — fetched on open AND re-fetched on step entry
  // (the staleness fix), so all three share one loader each. ----
  const loadZfsFeeds = useCallback(() => {
    if (!currentServer || !hasFeature(currentServer, 'zfs')) {
      setZfsPools([]);
      setZfsDatasets([]);
      setZfsVolumes([]);
      return;
    }
    getZfsPools(currentServer.hostname, currentServer.port, currentServer.protocol).then(result => {
      setZfsPools(result.success ? result.data?.pools || [] : []);
    });
    getZfsDatasets(currentServer.hostname, currentServer.port, currentServer.protocol, {
      type: 'filesystem',
    }).then(result => {
      setZfsDatasets(result.success ? result.data?.datasets || [] : []);
    });
    getZfsDatasets(currentServer.hostname, currentServer.port, currentServer.protocol, {
      type: 'volume',
    }).then(result => {
      setZfsVolumes(result.success ? result.data?.datasets || [] : []);
    });
  }, [currentServer]);

  // Registered media (VBox image pickers) — agents without the surface
  // leave the list empty and the plain path input stands.
  const loadMedia = useCallback(() => {
    if (!currentServer || !hasHypervisor(currentServer, 'virtualbox')) {
      setVboxMedia([]);
      return;
    }
    getMediaList(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setVboxMedia(result.success ? result.data?.media || [] : []);
      }
    );
  }, [currentServer]);

  // Advisory free-IP suggestions for static addressing — absence (404/older
  // agent) leaves the field a plain input.
  const loadIpSuggestions = useCallback(() => {
    if (!currentServer) {
      return;
    }
    getIpSuggestions(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setIpSuggestions(result.success ? result.data || null : null);
      }
    );
  }, [currentServer]);

  // Uplink rows — failures leave the field free-text. The first option
  // autofills the seeded external network's bridge (untouched rows only).
  // Valid VNIC uplinks: phys + aggr + etherstub (Mark's ruling); the
  // converged flat-rows wire is {name, class, state, provisioning?} and
  // Go's bare-string spelling stays readable until it converges.
  const loadUplinks = useCallback(() => {
    if (!currentServer) {
      return;
    }
    getBridgedInterfaces(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        const rows = result.success ? flattenBridgedInterfaces(result.data) : [];
        setBridgeOptions(rows.map(entry => entry.name));
        setBridgeChoices(
          rows.map(entry => {
            const kind = entry.class
              ? ` (${entry.class}${entry.provisioning ? ' · provisioning' : ''})`
              : '';
            return {
              value: entry.name,
              label: `${entry.name}${kind}`,
              provisioning: entry.provisioning,
            };
          })
        );
        if (rows.length > 0) {
          setNetworks(prev =>
            prev.length > 0 && !prev[0].bridge
              ? [{ ...prev[0], bridge: rows[0].name }, ...prev.slice(1)]
              : prev
          );
        }
      }
    );
  }, [currentServer]);

  useEffect(() => {
    if (!isOpen || !currentServer) {
      return;
    }
    resetForm();
    getProvisioners(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        if (result.success) {
          setProvisioners(result.data?.provisioners || []);
        } else {
          setError(`Failed to load provisioners: ${result.message}`);
        }
      }
    );
    getMachineDefaults(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        setAgentDefaults(result.success ? result.data : null);
      }
    );
    getMachineOsTypes(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        const list = result.success ? result.data?.ostypes : null;
        setOsTypes(Array.isArray(list) && list.length > 0 ? list : null);
      }
    );
    // server_id is REQUIRED under prefix naming and never auto-assigned —
    // prefill from the agent's own next-free answer (canonical key server_id).
    getNextServerId(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        const next = result.success
          ? result.data?.server_id || result.data?.next_server_id || result.data?.next
          : null;
        if (next) {
          setSettings(prev => (prev.server_id ? prev : { ...prev, server_id: String(next) }));
        }
      }
    );
    // ONE image list: every enabled registry's catalog fetched in parallel
    // and merged, locals joining in the step's own union. Failures are loud
    // per registry, never a silent fall-back to text boxes.
    if (hasFeature(currentServer, 'templates')) {
      getTemplates(currentServer.hostname, currentServer.port, currentServer.protocol).then(
        result => {
          setTemplates(result.success ? result.data?.templates || [] : []);
        }
      );
      setRemoteBoxes([]);
      setCatalogNote('');
      setBoxPickCustom(false);
      setSourceNames([]);
      setSourceFilter('');
      getTemplateSources(currentServer.hostname, currentServer.port, currentServer.protocol).then(
        async result => {
          if (!result.success) {
            setCatalogNote(
              `Template sources unavailable (${result.message}) — enter box values manually.`
            );
            return;
          }
          const list = Array.isArray(result.data?.sources) ? result.data.sources : [];
          const enabled = list.filter(source => source.enabled !== false);
          if (enabled.length === 0) {
            setCatalogNote(
              'No template sources configured on the agent (Settings → template_sources or Manage → Templates → Add Registry) — enter box values manually.'
            );
            return;
          }
          const defaultName = pickDefaultSource(list)?.name;
          setSourceNames(enabled.map(source => source.name));
          const catalogs = await Promise.all(
            enabled.map(source =>
              getRemoteTemplates(
                currentServer.hostname,
                currentServer.port,
                currentServer.protocol,
                source.name
              ).then(catalog => ({ source, catalog }))
            )
          );
          const merged = [];
          const failures = [];
          const counts = [];
          catalogs.forEach(({ source, catalog }) => {
            if (!catalog.success) {
              failures.push(`${source.name} (${catalog.status || ''} ${catalog.message})`.trim());
              return;
            }
            const boxes = flattenBoxCatalog(catalog.data);
            counts.push(`${source.name}: ${boxes.length}`);
            if (boxes.length === 0) {
              // The registry ANSWERED but the parse found nothing — keep the
              // raw payload visible in devtools so the shape mismatch is
              // diagnosable instead of a silent empty list.
              console.warn(
                `📦 BOX CATALOG: ${source.name} answered with 0 usable boxes (the agent prunes non-virtualbox/foreign-arch entries) — raw payload:`,
                catalog.data
              );
            }
            boxes.forEach(entry => {
              merged.push({
                ...entry,
                source: source.name,
                sourceUrl: source.url || '',
                isDefaultSource: source.name === defaultName,
              });
            });
          });
          setRemoteBoxes(merged);
          const catalogNotes = [];
          if (failures.length > 0) {
            catalogNotes.push(`Catalog unreachable from: ${failures.join('; ')}`);
          }
          if (merged.length === 0 && counts.length > 0) {
            catalogNotes.push(
              `Registries answered but listed no boxes this host can use (${counts.join(', ')}) — the agent prunes non-virtualbox/foreign-arch boxes; if you expected entries, see the raw payload in the browser console`
            );
          }
          setCatalogNote(catalogNotes.join('. '));
        }
      );
    } else {
      setTemplates([]);
      setRemoteBoxes([]);
      setCatalogNote('');
    }
    // Registry suggestions for the roles editor + the cached-ISO picker.
    if (hasFeature(currentServer, 'artifacts')) {
      getArtifacts(currentServer.hostname, currentServer.port, currentServer.protocol).then(
        result => {
          setArtifacts(result.success ? result.data?.artifacts || [] : null);
        }
      );
      getIsoArtifacts(currentServer.hostname, currentServer.port, currentServer.protocol).then(
        result => {
          setIsoOptions(isoFilenames(result));
        }
      );
    } else {
      setArtifacts(null);
      setIsoOptions([]);
    }
    loadZfsFeeds();
    loadMedia();
    loadUplinks();
  }, [isOpen, currentServer, resetForm, loadZfsFeeds, loadMedia, loadUplinks]);

  // Re-fetch the feeds a step consumes each time it is ENTERED (Mark:
  // "sometimes the dropdown data is stale") — picker data is only ever as
  // old as the last visit to its step, never the modal open.
  useEffect(() => {
    if (!isOpen || !currentServer) {
      return;
    }
    const stepId = STEPS[stepIndex].id;
    if (stepId === 'disks') {
      loadZfsFeeds();
      loadMedia();
    } else if (stepId === 'network') {
      loadUplinks();
      loadIpSuggestions();
    }
  }, [isOpen, currentServer, stepIndex, loadZfsFeeds, loadMedia, loadUplinks, loadIpSuggestions]);

  const setSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  // Picking an image from a NON-default registry rides the SPEC — create
  // resolves the download source from box_url; default-registry (and
  // local-only) picks need nothing.
  const handleBoxPicked = entry => {
    setSetting(
      'box_url',
      entry && entry.sourceUrl && !entry.isDefaultSource ? entry.sourceUrl : ''
    );
  };

  const handleVersionChange = value => {
    setVersionKey(value);
    const nextVersion = family?.versions?.find(v => v.version === value || v.dir === value) || null;
    setRoles(seedRoles(nextVersion));
    // Defaults merge into the answers BEFORE conditionals evaluate — a
    // default-driven show_if is correct before the user touches anything.
    setProperties(seedAnswers(dslConfiguration(nextVersion)));
    setFieldErrors({});
    // The list row carries no metadata — fetch the DETAIL and reseed when it
    // lands (nothing DSL-driven can have been answered before that; the form
    // only renders from the detail). The seq guards a quick re-pick.
    versionFetchSeq.current += 1;
    const seq = versionFetchSeq.current;
    setVersionDetail(null);
    if (!nextVersion || !familyName || !currentServer) {
      setVersionPending(false);
      return;
    }
    setVersionPending(true);
    getProvisionerVersion(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      familyName,
      nextVersion.version || value
    ).then(result => {
      if (seq !== versionFetchSeq.current) {
        return; // a newer pick superseded this fetch
      }
      setVersionPending(false);
      if (!result.success) {
        return; // list-row fallback stands; the pre-DSL hint tells the truth
      }
      // BOTH agents nest the FULL provisioner.yml under `metadata` on the
      // version detail (converged A1/A2 answer) — the MANIFEST is what the
      // seeding contract reads (metadata.roles / metadata.configuration /
      // top-level id_files), so store exactly that.
      const manifest = result.data?.metadata || null;
      setVersionDetail(manifest);
      setRoles(seedRoles(manifest));
      setProperties(seedAnswers(dslConfiguration(manifest)));
    });
  };

  const handleFamilyChange = value => {
    setFamilyName(value);
    setVersionKey('');
    setRoles([]);
    setProperties({});
    setFieldErrors({});
    versionFetchSeq.current += 1;
    setVersionDetail(null);
    setVersionPending(false);
  };

  /** disks{controllers, boot, additional_disks, cdroms} — the device model. */
  const buildDisks = () => {
    const disks = {};
    const controllers = diskConfig.controllers
      .filter(row => row.type)
      .map(row => ({
        ...(row.name.trim() && { name: row.name.trim() }),
        type: row.type,
        ...(row.ports !== '' && { ports: Number(row.ports) }),
        ...(row.bootable && { bootable: true }),
      }));
    if (controllers.length > 0) {
      disks.controllers = controllers;
    }
    // DISK SPEC v1 — zero inference: the boot TYPE is DECLARED and the
    // wizard ALWAYS writes it (template|image|blank|none). Per-type keys
    // only; placement rides the entry (pool/dataset bhyve).
    const boot = {
      type: { template: 'template', scratch: 'blank', existing: 'image', none: 'none' }[bootSource],
    };
    if (bootSource === 'existing') {
      if (diskConfig.bootPath) {
        boot.path = diskConfig.bootPath;
      }
    } else if (bootSource === 'scratch' || bootSource === 'template') {
      if (diskConfig.bootSize) {
        boot.size = diskConfig.bootSize;
      }
      boot.sparse = diskConfig.bootSparse;
      if (diskConfig.bootVolumeName) {
        boot.volume_name = diskConfig.bootVolumeName;
      }
      if (bhyve) {
        if (diskConfig.bootPool.trim()) {
          boot.pool = diskConfig.bootPool.trim();
        }
        if (diskConfig.bootDataset.trim()) {
          boot.dataset = diskConfig.bootDataset.trim();
        }
      }
      // Converged key on BOTH hypervisors (bhyve clone|copy|localize, vbox
      // clone|copy) — always spelled on template boots, copy default.
      if (bootSource === 'template' && diskConfig.bootCloneStrategy) {
        boot.clone_strategy = diskConfig.bootCloneStrategy;
      }
      // VBox file placement — created disks only (blank/template).
      if (vbox && diskConfig.bootDirectory.trim()) {
        boot.directory = diskConfig.bootDirectory.trim();
      }
    }
    // VBox attachment placement — controller/port ride any non-none entry.
    if (vbox && boot.type !== 'none') {
      if (diskConfig.bootController.trim()) {
        boot.controller = diskConfig.bootController.trim();
      }
      if (diskConfig.bootPort !== '') {
        boot.port = Number(diskConfig.bootPort);
      }
    }
    disks.boot = boot;
    // additional_disks[] — the same TYPED entries (image | blank).
    const additional = diskConfig.additional
      .map(row => {
        let base = null;
        if (row.mode === 'existing') {
          base = row.path && { type: 'image', path: row.path };
        } else if (row.size) {
          base = { type: 'blank', size: row.size, sparse: row.sparse !== false };
          if (row.volume_name?.trim()) {
            base.volume_name = row.volume_name.trim();
          }
          if (bhyve && row.pool?.trim()) {
            base.pool = row.pool.trim();
          }
          if (bhyve && row.dataset?.trim()) {
            base.dataset = row.dataset.trim();
          }
          if (vbox && row.directory?.trim()) {
            base.directory = row.directory.trim();
          }
        }
        return base && withAddressing(base, row);
      })
      .filter(Boolean);
    if (additional.length > 0) {
      disks.additional_disks = additional;
    }
    const cdroms = diskConfig.cdroms
      .map(row => {
        const base = cdromEntry(row);
        return base && withAddressing(base, row);
      })
      .filter(Boolean);
    if (cdroms.length > 0) {
      disks.cdroms = cdroms;
    }
    return Object.keys(disks).length > 0 ? disks : null;
  };

  /** cloud_init in the base's verbatim vocabulary — only when it says something. */
  const buildCloudInit = () => {
    const resolvers = cloudInit.resolvers
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);
    if (!cloudInit.enabled) {
      return null;
    }
    return {
      enabled: true,
      ...(cloudInit.dns_domain && { dns_domain: cloudInit.dns_domain }),
      ...(cloudInit.password && { password: cloudInit.password }),
      ...(resolvers.length > 0 && { resolvers }),
      ...(cloudInit.sshkey && { sshkey: cloudInit.sshkey }),
    };
  };

  const parseVboxPassthrough = () => {
    if (!vboxJson.trim()) {
      return null;
    }
    try {
      return JSON.parse(vboxJson);
    } catch {
      return null; // validateStep('system') reports it — never sent broken
    }
  };

  /** The exact POST body — the Confirm step renders it, Create sends it. */
  const buildSpec = () => {
    const mergedSettings = {};
    SETTING_KEYS.forEach(key => {
      // Box fields ride ONLY the template boot source — a blank/existing/
      // diskless create must not trigger template resolution.
      if (bootSource !== 'template' && BOX_SETTING_KEYS.includes(key)) {
        return;
      }
      const value = settings[key];
      if (value !== '' && value !== undefined && value !== null) {
        mergedSettings[key] = value;
      }
    });
    // boot_priority is an int 1-100 on the wire (default 95 when absent).
    if (mergedSettings.boot_priority !== undefined) {
      mergedSettings.boot_priority = Number(mergedSettings.boot_priority);
    }
    // Numeric/boolean settings keep their JSON types on the wire.
    ['setup_wait', 'consoleport'].forEach(key => {
      if (mergedSettings[key] !== undefined) {
        mergedSettings[key] = Number(mergedSettings[key]);
      }
    });
    ['show_console', 'debug_build', 'post_provision', 'vagrant_ssh_insert_key'].forEach(key => {
      if (mergedSettings[key] !== undefined) {
        mergedSettings[key] = mergedSettings[key] === 'true';
      }
    });
    // Ordered floppy|dvd|disk|net|none list (max 4) — empty means agent default.
    if (bootOrder.length > 0) {
      mergedSettings.boot_order = bootOrder;
    }
    const disks = buildDisks();
    const filesystems = filesystemEntries(diskConfig.filesystems);
    const builtCloudInit = buildCloudInit();
    const vboxPassthrough = parseVboxPassthrough();
    const hardwarePayload = buildHardwarePayload(hardware) || {};
    const serial = buildPortsPayload(serialRows);
    if (serial.length > 0) {
      hardwarePayload.serial = serial;
    }
    const parallel = buildPortsPayload(parallelRows);
    if (parallel.length > 0) {
      hardwarePayload.parallel = parallel;
    }
    // Per-hypervisor sections (Mark's ruling): zones.* rides bhyve creates
    // ONLY; everything VirtualBox-specific — the knob tree, serial/parallel,
    // guest_agent, the raw passthrough — merges into ONE `vbox` section.
    // Empty means "agent default", never sent.
    const zoneFields = bhyve
      ? Object.fromEntries(
          Object.entries(zones).filter(([, value]) => value !== '' && value !== undefined)
        )
      : {};
    const vboxSection = vbox
      ? {
          ...hardwarePayload,
          ...(zones.guest_agent === true && { guest_agent: true }),
          ...(vboxPassthrough || {}),
        }
      : vboxPassthrough || {};
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    // Blank DNS inputs never ride the wire — the netplan template reads
    // dns[0]/dns[1] and an empty string there is worse than absence.
    const cleanedNetworks = networks.map(network => {
      const dns = (Array.isArray(network.dns) ? network.dns : []).filter(Boolean);
      const entry = { ...network };
      if (dns.length > 0) {
        entry.dns = dns;
      } else {
        delete entry.dns;
      }
      // Adapter-tuning keys (+ the optional route): blank = default, never
      // sent; numbers numeric.
      ['cable_connected', 'promisc', 'bandwidth_group', 'nic_type', 'route'].forEach(key => {
        if (entry[key] === '' || entry[key] === undefined) {
          delete entry[key];
        }
      });
      ['speed', 'boot_prio'].forEach(key => {
        if (entry[key] === '' || entry[key] === undefined) {
          delete entry[key];
        } else {
          entry[key] = Number(entry[key]);
        }
      });
      if (entry.cable_connected !== undefined) {
        entry.cable_connected = entry.cable_connected === 'on';
      }
      return entry;
    });
    return {
      ...(name.trim() && { name: name.trim() }),
      // Provisioning is 100% OPTIONAL (Mark's ruling, 2026-07-07): no
      // provisioner picked = no provisioner key at all — a machine is just
      // a machine.
      ...(familyName && {
        provisioner: { name: familyName, version: version?.version || versionKey },
      }),
      settings: mergedSettings,
      ...(disks && { disks }),
      ...(filesystems.length > 0 && { filesystems }),
      ...(Object.keys(zoneFields).length > 0 && { zones: zoneFields }),
      ...(Object.keys(vboxSection).length > 0 && { vbox: vboxSection }),
      ...(builtCloudInit && { cloud_init: builtCloudInit }),
      ...(tags.length > 0 && { tags }),
      ...(notes.trim() && { notes: notes.trim() }),
      networks: cleanedNetworks,
      roles,
      // Hidden fields' answers are NOT collected — their names are ABSENT
      // (Jinja undefined-renders-empty, the DSL contract).
      properties: pruneHidden(fieldConfig, properties, roles),
      sync_method: syncMethod,
      // The transport-removal signal — rides ONLY when the user chose;
      // absent = each agent's ruled default (Go keep, zoneweaver remove).
      ...(familyName &&
        removeTransport !== '' && {
          remove_transport_on_completion: removeTransport === 'true',
        }),
      // Rides ONLY when the picked version's manifest declares id_files —
      // package-declared need, never a standing key.
      ...(needsSafeId && safeIdPath.trim() && { safe_id_path: safeIdPath.trim() }),
      start_after_create: startAfterCreate,
    };
  };

  /** Per-step gate — the reason Next exists instead of free tab-jumping. */
  const validateStep = stepId => {
    if (stepId === 'general' && (!settings.hostname || !settings.domain)) {
      return 'Hostname and domain are required.';
    }
    if (stepId === 'system' && vboxJson.trim()) {
      try {
        JSON.parse(vboxJson);
      } catch {
        return 'The VBox passthrough section is not valid JSON.';
      }
    }
    if (stepId === 'disks') {
      if (bootSource === 'scratch' && !diskConfig.bootSize) {
        return 'A blank boot disk needs a size.';
      }
      if (bootSource === 'existing' && !diskConfig.bootPath) {
        return 'An existing boot disk needs its image path.';
      }
    }
    // Provisioning is OPTIONAL (Mark's ruling) — only a half-made choice
    // (family without version) blocks.
    if (stepId === 'provisioning' && familyName && !versionKey) {
      return 'Select a version for the chosen provisioner — or set it back to None.';
    }
    // The DSL's live validation pass — the agent re-runs it authoritatively
    // pre-render; visible fields only, required-only-while-visible.
    if (stepId === 'provisioning' && fieldConfig) {
      const errors = validateAnswers(fieldConfig, properties, roles);
      setFieldErrors(errors);
      const names = Object.keys(errors);
      if (names.length > 0) {
        return `Fix the highlighted configuration field${names.length > 1 ? 's' : ''}: ${names.join(', ')}.`;
      }
    }
    return '';
  };

  const handleNext = () => {
    const failure = validateStep(STEPS[stepIndex].id);
    if (failure) {
      setError(failure);
      return;
    }
    setError('');
    const next = Math.min(stepIndex + 1, STEPS.length - 1);
    setStepIndex(next);
    setMaxVisited(prev => Math.max(prev, next));
  };

  const handleCreate = async () => {
    // Re-validate EVERY step — pill navigation can reach Confirm with edits
    // Next never checked; the first failing step gets focus + its error.
    for (const step of STEPS) {
      const failure = validateStep(step.id);
      if (failure) {
        setError(failure);
        setStepIndex(STEPS.findIndex(entry => entry.id === step.id));
        return;
      }
    }
    setLoading(true);
    setError('');
    setErrorDetails([]);
    const result = await createMachine(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      buildSpec()
    );
    setLoading(false);
    if (!result.success) {
      // 400 Insufficient resources → per-entry details (catalog §3);
      // any other failure → the plain message.
      const details = validationDetails(result);
      setErrorDetails(details);
      setError(details.length > 0 ? '' : result.message);
      return;
    }
    const data = result.data || {};
    const warnings = resourceWarnings(data);
    if (data.multi_host && Array.isArray(data.machines)) {
      // hosts[] render fanned into N machines, created sequentially in
      // list order (machine k+1 chains on machine k's last task). Track
      // the FIRST parent; the rest follow it in the Tasks view.
      const names = data.machines.map(machine => machine.machine_name);
      onCompleted({
        message: [
          data.message || `Multi-host create queued — ${names.length} machines`,
          `created in order: ${names.join(', ')}`,
          ...warnings.map(warning => warning.message),
        ].join(' — '),
        machineName: names[0] || name.trim(),
        taskId: data.machines[0]?.parent_task_id || null,
        requiresDownload: warnings.length > 0,
      });
      onClose();
      return;
    }
    onCompleted({
      message: [
        data.message || 'Creation queued',
        ...warnings.map(warning => warning.message),
      ].join(' — '),
      machineName: data.machine_name || name.trim(),
      taskId: data.parent_task_id || data.task_id || null,
      requiresDownload: !!data.requires_download || warnings.length > 0,
    });
    onClose();
  };

  const isLastStep = stepIndex === STEPS.length - 1;
  const currentStepId = STEPS[stepIndex].id;

  // Hoisted so the multiline fragment carries its own parens
  // (react/jsx-wrap-multilines vs prettier fight inside the prop otherwise).
  const footerExtras = (
    <>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => setStepIndex(prev => Math.max(prev - 1, 0))}
        disabled={loading || stepIndex === 0}
      >
        Back
      </button>
      <div className="form-check form-switch ms-2">
        <input
          id="machine-create-advanced"
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={showAdvanced}
          onChange={e => setShowAdvanced(e.target.checked)}
          disabled={loading}
        />
        <label className="form-check-label" htmlFor="machine-create-advanced">
          Advanced
        </label>
      </div>
    </>
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={isLastStep ? handleCreate : handleNext}
      title={`Create: ${singular}`}
      icon="fas fa-plus"
      submitText={isLastStep ? 'Create' : 'Next'}
      loading={loading}
      showCancelButton
      additionalActions={footerExtras}
    >
      <ul className="nav nav-pills mb-3 flex-wrap gap-1">
        {STEPS.map((step, index) => (
          <li key={step.id} className="nav-item">
            <button
              type="button"
              className={`nav-link py-1 px-2 ${index === stepIndex ? 'active' : ''}`}
              onClick={() => {
                setError('');
                setStepIndex(index);
              }}
              disabled={loading || index > maxVisited}
            >
              {step.label}
            </button>
          </li>
        ))}
      </ul>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {errorDetails.length > 0 && <ResourceIssueList details={errorDetails} />}

      {currentStepId === 'general' && (
        <GeneralStep
          name={name}
          setName={setName}
          settings={settings}
          setSetting={setSetting}
          startAfterCreate={startAfterCreate}
          setStartAfterCreate={setStartAfterCreate}
          tagsInput={tagsInput}
          setTagsInput={setTagsInput}
          notes={notes}
          setNotes={setNotes}
          advanced={showAdvanced}
          loading={loading}
        />
      )}
      {currentStepId === 'box' && (
        <BoxStep
          settings={settings}
          setSetting={setSetting}
          templates={templates}
          catalogNote={catalogNote}
          remoteBoxes={remoteBoxes}
          onBoxPicked={handleBoxPicked}
          sourceNames={sourceNames}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          boxPickCustom={boxPickCustom}
          setBoxPickCustom={setBoxPickCustom}
          bootSource={bootSource}
          setBootSource={setBootSource}
          advanced={showAdvanced}
          loading={loading}
        />
      )}
      {currentStepId === 'system' && (
        <SystemStep
          zones={zones}
          setZone={(key, value) => setZones(prev => ({ ...prev, [key]: value }))}
          settings={settings}
          setSetting={setSetting}
          agentDefaults={agentDefaults}
          osTypes={osTypes}
          hardware={hardware}
          onHardwareChange={(sectionId, key, value) =>
            setHardware(prev => ({
              ...prev,
              [sectionId]: { ...(prev[sectionId] || {}), [key]: value },
            }))
          }
          serialRows={serialRows}
          setSerialRows={setSerialRows}
          parallelRows={parallelRows}
          setParallelRows={setParallelRows}
          cloudInit={cloudInit}
          setCloudInit={patch => setCloudInit(prev => ({ ...prev, ...patch }))}
          vboxJson={vboxJson}
          setVboxJson={setVboxJson}
          vbox={hasHypervisor(currentServer, 'virtualbox')}
          bhyve={hasHypervisor(currentServer, 'bhyve')}
          advanced={showAdvanced}
          loading={loading}
        />
      )}
      {currentStepId === 'disks' && (
        <DisksStep
          bootSource={bootSource}
          setBootSource={setBootSource}
          disks={diskConfig}
          setDisks={patch => setDiskConfig(prev => ({ ...prev, ...patch }))}
          bootOrder={bootOrder}
          setBootOrder={setBootOrder}
          diskif={zones.diskif ?? ''}
          setDiskif={value => setZones(prev => ({ ...prev, diskif: value }))}
          agentDefaults={agentDefaults}
          isoOptions={isoOptions}
          currentServer={currentServer}
          vbox={hasHypervisor(currentServer, 'virtualbox')}
          bhyve={hasHypervisor(currentServer, 'bhyve')}
          zfsPools={zfsPools}
          zfsDatasets={zfsDatasets}
          zfsVolumes={zfsVolumes}
          vboxMedia={vboxMedia}
          availablePools={templateAvailablePools}
          advanced={showAdvanced}
          loading={loading}
        />
      )}
      {currentStepId === 'resources' && (
        <ResourcesStep settings={settings} setSetting={setSetting} loading={loading} />
      )}
      {currentStepId === 'network' && (
        <NetworkStep
          networks={networks}
          onNetworksChange={setNetworks}
          bridgeChoices={bridgeChoices}
          ipSuggestions={ipSuggestions}
          nicEnums={agentDefaults?.knob_values || null}
          loading={loading}
        />
      )}
      {currentStepId === 'provisioning' && (
        <ProvisioningStep
          provisioners={provisioners}
          familyName={familyName}
          onFamilyChange={handleFamilyChange}
          family={family}
          versionKey={versionKey}
          onVersionChange={handleVersionChange}
          version={versionInfo}
          versionPending={versionPending}
          showSafeId={needsSafeId}
          settings={settings}
          setSetting={setSetting}
          fieldConfig={fieldConfig}
          answers={properties}
          fieldErrors={fieldErrors}
          onAnswerChange={(key, value) => setProperties(prev => ({ ...prev, [key]: value }))}
          inventory={fieldInventory}
          roles={roles}
          onRolesChange={setRoles}
          artifacts={artifacts}
          syncMethod={syncMethod}
          setSyncMethod={setSyncMethod}
          syncMethodOptions={agentDefaults?.knob_values?.['settings.sync_method'] || null}
          removeTransport={removeTransport}
          setRemoveTransport={setRemoveTransport}
          removeTransportDefault={
            agentDefaults?.knob_defaults?.['transport.remove_on_completion'] ?? null
          }
          safeIdPath={safeIdPath}
          setSafeIdPath={setSafeIdPath}
          advanced={showAdvanced}
          loading={loading}
        />
      )}
      {currentStepId === 'confirm' && <ConfirmStep spec={buildSpec()} />}
    </FormModal>
  );
};

MachineCreateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  onCompleted: PropTypes.func.isRequired,
};

export default MachineCreateModal;
