import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { hasFeature } from '../utils/capabilities';

import BootEnvironmentManagement from './Host/BootEnvironmentManagement';
import DatabasePanel from './Host/DatabasePanel';
import FaultManagement from './Host/FaultManagement';
import EnhancedFileManager from './Host/FileManager/EnhancedFileManager';
import HostPageHeader from './Host/HostPageHeader';
import InstallerFiles from './Host/InstallerFiles';
import NetworkHostnameManagement from './Host/NetworkHostnameManagement';
import OrchestrationPanel from './Host/OrchestrationPanel';
import PackageManagement from './Host/Package/Management';
import ProcessManagement from './Host/ProcessManagement';
import ProvisionerManagement from './Host/ProvisionerManagement';
import ProvisioningNetworkPanel from './Host/ProvisioningNetworkPanel';
import ServiceManagement from './Host/ServiceManagement';
import StorageManagement from './Host/StorageManagement';
import TemplatesManagement from './Host/TemplatesManagement';
import TimeNTPManagement from './Host/TimeNTPManagement';
import UserGroupManagement from './Host/UserGroupManagement';

// Every tab gates on an agent feature token (hasFeature; legacy agents with no
// features array render everything). Token names are the agents' real vocabulary
// (sync-file ACK 2026-07-05) — `services` is newly minted and zoneweaver-agent
// advertises it from its next session; the rest already exist.
const TABS = [
  { id: 'services', label: 'Services', icon: 'fas fa-cogs', feature: 'services' },
  { id: 'network', label: 'Network', icon: 'fas fa-network-wired', feature: 'vnics' },
  { id: 'packages', label: 'Package Management', icon: 'fas fa-box', feature: 'packages' },
  {
    id: 'boot-environments',
    label: 'Boot Environments',
    icon: 'fas fa-layer-group',
    feature: 'boot-environments',
  },
  { id: 'storage', label: 'Storage', icon: 'fas fa-database', feature: 'zfs' },
  { id: 'time-ntp', label: 'Time', icon: 'fas fa-clock', feature: 'time-sync' },
  { id: 'processes', label: 'Processes', icon: 'fas fa-tasks', feature: 'processes' },
  {
    id: 'fault-management',
    label: 'Fault Management',
    icon: 'fas fa-exclamation-triangle',
    feature: 'fault-management',
  },
  { id: 'file-manager', label: 'File Manager', icon: 'fas fa-folder', feature: 'file-browser' },
  { id: 'user-group', label: 'User and Groups', icon: 'fas fa-users', feature: 'system-users' },
  // Token regate (Mark's option-(a) word): the registry surface rides its
  // own `provisioner-registry` token — zoneweaver's always-on `provisioning`
  // names its pipeline, not a registry, and gains this token at parity.
  {
    id: 'provisioning',
    label: 'Provisioners',
    icon: 'fas fa-cubes',
    feature: 'provisioner-registry',
  },
  // The dormant-but-available host-side provisioning network (Mark's
  // ruling) — rides the existing `provisioning` token, no gate of its own.
  {
    id: 'provisioning-network',
    label: 'Provisioning Network',
    icon: 'fas fa-diagram-project',
    feature: 'provisioning',
  },
  { id: 'templates', label: 'Templates', icon: 'fas fa-compact-disc', feature: 'templates' },
  // Host-level ordered boot/shutdown (catalog §8) — rides `machines`.
  {
    id: 'orchestration',
    label: 'Orchestration',
    icon: 'fas fa-arrow-down-1-9',
    feature: 'machines',
  },
  // `artifacts` alone also names the zoneweaver ISO/storage-location surface
  // (its own sub-tab under Storage); the file cache lights up only where the
  // registry ships too — the agreed convergence gate.
  {
    id: 'installer-files',
    label: 'Installer Files',
    icon: 'fas fa-box-archive',
    features: ['artifacts', 'provisioner-registry'],
  },
  // Agent database maintenance — /database/* ships ungated on both agents.
  { id: 'database', label: 'Database', icon: 'fas fa-database' },
];

const HostManage = () => {
  const [activeTab, setActiveTab] = useState('services');

  const { user } = useAuth();
  const { currentServer } = useServers();
  const navigate = useNavigate();

  const visibleTabs = TABS.filter(tab => {
    const required = tab.features || (tab.feature ? [tab.feature] : []);
    return required.every(token => hasFeature(currentServer, token));
  });
  // A server switch can hide the selected tab — fall back to the first visible one
  // without touching state (clicking a tab still drives activeTab).
  const effectiveTab = visibleTabs.some(tab => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id;

  if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>Access Denied - Hyperweaver</title>
        </Helmet>
        <div className="container-fluid m-2">
          <div className="alert alert-danger">Admin privileges are required to manage servers.</div>
        </div>
      </div>
    );
  }

  // Show message if no server is selected
  if (!currentServer) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>No Server Selected - Hyperweaver</title>
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <HostPageHeader title="Host Management">
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => navigate('/ui/hosts')}
              >
                <i className="fas fa-arrow-left me-2" />
                <span>Back to Hosts</span>
              </button>
            </HostPageHeader>
            <div className="px-4">
              <div className="alert alert-info">
                <p>Please select a server from the navbar to manage its services.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{`Manage ${currentServer.hostname} - Hyperweaver`}</title>
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <HostPageHeader title="Host Management" />

          {/* Tab Navigation */}
          <div className="mb-0">
            <ul className="nav nav-tabs">
              {visibleTabs.map(tab => (
                <li key={tab.id} className="nav-item">
                  <a
                    className={effectiveTab === tab.id ? 'nav-link active' : 'nav-link'}
                    href={`#${tab.id}`}
                    onClick={e => {
                      e.preventDefault();
                      setActiveTab(tab.id);
                    }}
                    onKeyDown={e => {
                      if (e.key === ' ') {
                        e.preventDefault();
                        setActiveTab(tab.id);
                      }
                    }}
                  >
                    <span className="me-1">
                      <i className={tab.icon} />
                    </span>
                    <span>{tab.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-4 pt-3">
            {/* Services Tab */}
            {effectiveTab === 'services' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage OmniOS services on <strong>{currentServer.hostname}</strong>. You can
                    view, start, stop, restart, and refresh services running on this host.
                  </p>
                </div>

                <ServiceManagement server={currentServer} />
              </div>
            )}

            {/* Network & Hostname Tab */}
            {effectiveTab === 'network' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage network configuration and hostname settings on{' '}
                    <strong>{currentServer.hostname}</strong>. Configure VNICs, IP addresses, link
                    aggregates, and system hostname.
                  </p>
                </div>

                <NetworkHostnameManagement server={currentServer} />
              </div>
            )}

            {/* Package Management Tab */}
            {effectiveTab === 'packages' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage packages, repositories, and system updates on{' '}
                    <strong>{currentServer.hostname}</strong>. Install, uninstall, and search for
                    packages, manage publishers and repositories.
                  </p>
                </div>

                <PackageManagement server={currentServer} />
              </div>
            )}

            {/* Boot Environments Tab */}
            {effectiveTab === 'boot-environments' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage boot environments on <strong>{currentServer.hostname}</strong>. Create,
                    activate, mount, and delete boot environments for system administration and
                    recovery.
                  </p>
                </div>

                <BootEnvironmentManagement server={currentServer} />
              </div>
            )}

            {/* Storage Management Tab */}
            {effectiveTab === 'storage' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage ZFS storage configuration on <strong>{currentServer.hostname}</strong>.
                    Configure ZFS ARC settings, manage pools, datasets, and storage resources.
                  </p>
                </div>

                <StorageManagement server={currentServer} />
              </div>
            )}

            {/* Time & NTP Tab */}
            {effectiveTab === 'time-ntp' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage time synchronization services, NTP configuration, and timezone settings
                    on <strong>{currentServer.hostname}</strong>. Monitor time server peers,
                    configure NTP servers, and manage system timezone.
                  </p>
                </div>

                <TimeNTPManagement server={currentServer} />
              </div>
            )}

            {/* Process Management Tab */}
            {effectiveTab === 'processes' && (
              <div>
                <div className="mb-4">
                  <p>
                    Monitor and manage system processes on <strong>{currentServer.hostname}</strong>
                    . View running processes, send signals, terminate processes, and analyze process
                    details including open files and resource usage.
                  </p>
                </div>

                <ProcessManagement server={currentServer} />
              </div>
            )}

            {/* Fault Management Tab */}
            {effectiveTab === 'fault-management' && (
              <div>
                <div className="mb-4">
                  <p>
                    Monitor and manage system faults on <strong>{currentServer.hostname}</strong>.
                    View active faults, review system logs, manage fault resolution, and monitor
                    system health.
                  </p>
                </div>

                <FaultManagement server={currentServer} />
              </div>
            )}

            {/* File Manager Tab */}
            {effectiveTab === 'file-manager' && (
              <div>
                <div className="mb-4">
                  <p>
                    Browse and manage files on <strong>{currentServer.hostname}</strong>. Upload,
                    download, create folders, edit text files, and perform file operations with
                    drag-and-drop, keyboard shortcuts, and advanced features including archive
                    support.
                  </p>
                </div>

                <EnhancedFileManager server={currentServer} />
              </div>
            )}

            {/* Provisioners Tab */}
            {effectiveTab === 'provisioning' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage provisioner packages on <strong>{currentServer.hostname}</strong>. Import
                    package families from a folder, archive, or git repository; delete versions no
                    machine references. Machine creation builds its forms from these packages&apos;
                    metadata.
                  </p>
                </div>

                <ProvisionerManagement server={currentServer} />
              </div>
            )}

            {/* Provisioning Network Tab */}
            {effectiveTab === 'provisioning-network' && (
              <div>
                <div className="mb-4">
                  <p>
                    Each host has <strong>one</strong> provisioning network — a host-side interface
                    and DHCP server machines can use during provisioning, defined by the
                    agent&apos;s <code>provisioning.network</code> settings (subnet, host IP, DHCP
                    range). This page controls that one network&apos;s lifecycle on{' '}
                    <strong>{currentServer.hostname}</strong>; it is dormant by default.
                  </p>
                </div>

                <ProvisioningNetworkPanel server={currentServer} />
              </div>
            )}

            {/* Orchestration Tab */}
            {effectiveTab === 'orchestration' && (
              <div>
                <div className="mb-4">
                  <p>
                    Ordered machine boot and shutdown on <strong>{currentServer.hostname}</strong>.
                    When enabled, autostart machines boot highest-priority-first at agent start;
                    shutdown at agent exit runs lowest first. Priority edits apply immediately.
                  </p>
                </div>

                <OrchestrationPanel server={currentServer} />
              </div>
            )}

            {/* Templates Tab */}
            {effectiveTab === 'templates' && (
              <div>
                <div className="mb-4">
                  <p>
                    The local template registry on <strong>{currentServer.hostname}</strong> — the
                    base boxes machine creation clones from. Pull boxes here ahead of time, or let
                    creation chain the download automatically.
                  </p>
                </div>

                <TemplatesManagement server={currentServer} />
              </div>
            )}

            {/* Installer Files Tab */}
            {effectiveTab === 'installer-files' && (
              <div>
                <div className="mb-4">
                  <p>
                    The hash-verified file cache on <strong>{currentServer.hostname}</strong> —
                    installers, fixpacks, and hotfixes that machine creation mounts into working
                    directories. References that are absent, unhashed, or hash-mismatched fail the
                    machine start.
                  </p>
                </div>

                <InstallerFiles server={currentServer} />
              </div>
            )}

            {/* Database Tab */}
            {effectiveTab === 'database' && (
              <div>
                <div className="mb-4">
                  <p>
                    The agent&apos;s own storage on <strong>{currentServer.hostname}</strong> —
                    per-database file sizes and row counts, with vacuum, analyze, and retention
                    cleanup maintenance.
                  </p>
                </div>

                <DatabasePanel server={currentServer} />
              </div>
            )}

            {/* User & Group Management Tab */}
            {effectiveTab === 'user-group' && (
              <div>
                <div className="mb-4">
                  <p>
                    Manage system users, groups, and roles on{' '}
                    <strong>{currentServer.hostname}</strong>. Create, modify, and delete user
                    accounts, manage group memberships, configure RBAC roles, and set user
                    permissions and authorizations.
                  </p>
                </div>

                <UserGroupManagement server={currentServer} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostManage;
