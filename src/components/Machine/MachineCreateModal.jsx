import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getMachineDefaults, getMachineOsTypes } from '../../api/machineAPI';
import {
  getProvisioners,
  createMachine,
  getArtifacts,
  getIsoArtifacts,
  getBridgedInterfaces,
  getNextServerId,
  getTemplates,
  getTemplateSources,
  getRemoteTemplates,
} from '../../api/provisioningAPI';
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
import { dslConfiguration, seedAnswers, pruneHidden, validateAnswers } from './ProvisionerFieldDsl';
import { seedRoles } from './ProvisionerFormFields';

// Machine-create wizard — stepped tabs with Back/Next and a footer Advanced
// toggle. POST /machines answers the create-orchestration shape
// {parent_task_id, machine_name, sub_tasks, requires_download}; the machine
// row appears at the finalize child.

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
  bootSparse: false,
  bootPath: '',
  bootVolumeName: '',
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
// GET /machines/ids/next; box fields optional.
const SETTING_KEYS = [
  'hostname',
  'domain',
  'machine_domain',
  'server_id',
  'vcpus',
  'memory',
  'os_type',
  'boot_priority',
  'box',
  'box_version',
  'box_arch',
  'box_url',
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
  // GET /machines/defaults — the ACTUAL values untouched fields get
  // (Mark's ask: never a bare "(agent default)" label). {settings, zones,
  // disks, notes}; agents without the endpoint leave it null and the
  // labels stay generic.
  const [agentDefaults, setAgentDefaults] = useState(null);
  // GET /machines/ostypes — the Guest OS Type dropdown feed; null (endpoint
  // absent, or 503 = no VirtualBox) keeps the plain text input.
  const [osTypes, setOsTypes] = useState(null);

  const singular = resourceLabel(currentServer, { plural: false });

  const family = useMemo(
    () => provisioners.find(collection => collection.name === familyName) || null,
    [provisioners, familyName]
  );
  const version = useMemo(
    () => family?.versions?.find(v => v.version === versionKey || v.dir === versionKey) || null,
    [family, versionKey]
  );

  const fieldConfig = useMemo(() => dslConfiguration(version), [version]);
  // options_source pickers draw on what the wizard already fetched: host
  // NICs as `networks`, the local template registry as `images`.
  const fieldInventory = useMemo(
    () => ({
      networks: bridgeOptions,
      images: [...new Set(templates.map(t => `${t.organization}/${t.box_name}`))],
    }),
    [bridgeOptions, templates]
  );

  const resetForm = useCallback(() => {
    setError('');
    setErrorDetails([]);
    setStepIndex(0);
    setMaxVisited(0);
    setShowAdvanced(false);
    setFamilyName('');
    setVersionKey('');
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
    setSafeIdPath('');
    setStartAfterCreate(false);
  }, []);

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
          const rows = Array.isArray(result.data) ? result.data : result.data?.artifacts || [];
          setIsoOptions(
            result.success
              ? rows.filter(row => row.file_exists !== false).map(row => row.filename)
              : []
          );
        }
      );
    } else {
      setArtifacts(null);
      setIsoOptions([]);
    }
    // Bridge suggestions — failures leave the field free-text. The first
    // option autofills the seeded external network's bridge (untouched rows
    // only — the user's own pick always wins).
    getBridgedInterfaces(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        const list = result.success
          ? result.data?.interfaces || result.data?.bridged_interfaces || result.data || []
          : [];
        const options = (Array.isArray(list) ? list : [])
          .map(entry => (typeof entry === 'string' ? { name: entry } : entry || {}))
          .filter(entry => !entry.class || entry.class === 'phys' || entry.class === 'aggr')
          .map(entry => entry.name || entry.device || '')
          .filter(Boolean);
        setBridgeOptions(options);
        if (options.length > 0) {
          setNetworks(prev =>
            prev.length > 0 && !prev[0].bridge
              ? [{ ...prev[0], bridge: options[0] }, ...prev.slice(1)]
              : prev
          );
        }
      }
    );
  }, [isOpen, currentServer, resetForm]);

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
  };

  const handleFamilyChange = value => {
    setFamilyName(value);
    setVersionKey('');
    setRoles([]);
    setProperties({});
    setFieldErrors({});
  };

  /** Optional controller/port addressing on a media row (device model). */
  const withAddressing = (entry, row) => {
    if (row.controller?.trim()) {
      entry.controller = row.controller.trim();
    }
    if (row.port !== undefined && row.port !== '') {
      entry.port = Number(row.port);
    }
    return entry;
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
    if (bootSource === 'existing' && diskConfig.bootPath) {
      disks.boot = { path: diskConfig.bootPath };
    } else if (bootSource === 'scratch' || bootSource === 'template') {
      const boot = {};
      if (diskConfig.bootSize) {
        boot.size = diskConfig.bootSize;
      }
      if (diskConfig.bootSparse) {
        boot.sparse = true;
      }
      if (diskConfig.bootVolumeName) {
        boot.volume_name = diskConfig.bootVolumeName;
      }
      if (Object.keys(boot).length > 0) {
        disks.boot = boot;
      }
    }
    const additional = diskConfig.additional
      .map(row => {
        const base =
          row.mode === 'existing' ? row.path && { path: row.path } : row.size && { size: row.size };
        return base && withAddressing(base, row);
      })
      .filter(Boolean);
    if (additional.length > 0) {
      disks.additional_disks = additional;
    }
    // {iso} references the cached-ISO registry by filename; {path} stays the
    // raw agent-host passthrough.
    const cdroms = diskConfig.cdroms
      .map(row => {
        const base =
          row.source === 'iso' ? row.iso && { iso: row.iso } : row.path && { path: row.path };
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

  const parseVbox = () => {
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
    // Ordered floppy|dvd|disk|net|none list (max 4) — empty means agent default.
    if (bootOrder.length > 0) {
      mergedSettings.boot_order = bootOrder;
    }
    const disks = buildDisks();
    const filesystems = (diskConfig.filesystems || [])
      .filter(row => row.special.trim() && row.dir.trim())
      .map(row => ({
        special: row.special.trim(),
        dir: row.dir.trim(),
        ...(row.type.trim() && { type: row.type.trim() }),
        ...(row.options.trim() && { options: row.options.trim() }),
      }));
    const builtCloudInit = buildCloudInit();
    const vbox = parseVbox();
    const hardwarePayload = buildHardwarePayload(hardware) || {};
    const serial = buildPortsPayload(serialRows);
    if (serial.length > 0) {
      hardwarePayload.serial = serial;
    }
    const parallel = buildPortsPayload(parallelRows);
    if (parallel.length > 0) {
      hardwarePayload.parallel = parallel;
    }
    // zones.* System fields — empty means "agent default", never sent.
    const zoneFields = Object.fromEntries(
      Object.entries(zones).filter(([, value]) => value !== '' && value !== undefined)
    );
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
      // Adapter-tuning keys: blank = default, never sent; numbers numeric.
      ['cable_connected', 'promisc', 'bandwidth_group', 'nic_type'].forEach(key => {
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
      ...(Object.keys(hardwarePayload).length > 0 && { hardware: hardwarePayload }),
      ...(builtCloudInit && { cloud_init: builtCloudInit }),
      ...(vbox && { vbox }),
      ...(tags.length > 0 && { tags }),
      ...(notes.trim() && { notes: notes.trim() }),
      networks: cleanedNetworks,
      roles,
      // Hidden fields' answers are NOT collected — their names are ABSENT
      // (Jinja undefined-renders-empty, the DSL contract).
      properties: pruneHidden(fieldConfig, properties, roles),
      sync_method: syncMethod,
      safe_id_path: safeIdPath,
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
    const warnings = resourceWarnings(result.data);
    onCompleted({
      message: [
        result.data?.message || 'Creation queued',
        ...warnings.map(warning => warning.message),
      ].join(' — '),
      machineName: result.data?.machine_name || name.trim(),
      taskId: result.data?.parent_task_id || result.data?.task_id || null,
      requiresDownload: !!result.data?.requires_download || warnings.length > 0,
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
          bridgeOptions={bridgeOptions}
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
          version={version}
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
