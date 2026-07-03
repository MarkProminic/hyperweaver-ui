import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { hasFeature } from '../utils/capabilities';

import BootEnvironmentManagement from './Host/BootEnvironmentManagement';
import FaultManagement from './Host/FaultManagement';
import EnhancedFileManager from './Host/FileManager/EnhancedFileManager';
import NetworkHostnameManagement from './Host/NetworkHostnameManagement';
import PackageManagement from './Host/Package/Management';
import ProcessManagement from './Host/ProcessManagement';
import ServiceManagement from './Host/ServiceManagement';
import StorageManagement from './Host/StorageManagement';
import TimeNTPManagement from './Host/TimeNTPManagement';
import UserGroupManagement from './Host/UserGroupManagement';

// Tabs gate on the agent's capability feature tokens (dual-mode plan §3.1) where a
// token exists; the rest stay ungated until Agent API v1 grows the vocabulary
// (same gap as the Devices/PPT page). Legacy agents without a features array
// render everything — hasFeature's render-all rule.
const TABS = [
  { id: 'services', label: 'Services', icon: 'fas fa-cogs' },
  { id: 'network', label: 'Network', icon: 'fas fa-network-wired', feature: 'vnics' },
  { id: 'packages', label: 'Package Management', icon: 'fas fa-box', feature: 'packages' },
  {
    id: 'boot-environments',
    label: 'Boot Environments',
    icon: 'fas fa-layer-group',
    feature: 'boot-environments',
  },
  { id: 'storage', label: 'Storage', icon: 'fas fa-database', feature: 'zfs' },
  { id: 'time-ntp', label: 'Time', icon: 'fas fa-clock' },
  { id: 'processes', label: 'Processes', icon: 'fas fa-tasks' },
  {
    id: 'fault-management',
    label: 'Fault Management',
    icon: 'fas fa-exclamation-triangle',
    feature: 'fault-management',
  },
  { id: 'file-manager', label: 'File Manager', icon: 'fas fa-folder' },
  { id: 'user-group', label: 'User and Groups', icon: 'fas fa-users' },
];

const HostManage = () => {
  const [activeTab, setActiveTab] = useState('services');

  const { user } = useAuth();
  const { currentServer } = useServers();
  const navigate = useNavigate();

  const visibleTabs = TABS.filter(tab => !tab.feature || hasFeature(currentServer, tab.feature));
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
            <div className="titlebar card-header active d-flex justify-content-between align-items-center mb-0 p-3">
              <div>
                <strong>Host Management</strong>
              </div>
              <div>
                <button className="btn" onClick={() => navigate('/ui/hosts')}>
                  <span className="me-1">
                    <i className="fas fa-arrow-left" />
                  </span>
                  <span>Back to Hosts</span>
                </button>
              </div>
            </div>
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
          {/* Server Header */}
          <div className="titlebar card-header active d-flex justify-content-between align-items-center mb-0 p-3">
            <div>
              <div>
                <strong>Host Management: {currentServer.hostname}</strong>
              </div>
            </div>
          </div>

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

          <div className="px-4">
            {/* Services Tab */}
            {effectiveTab === 'services' && (
              <div>
                <div className="mb-4">
                  <h2 className="fs-5 fw-bold">Service Management</h2>
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
                  <h2 className="fs-5 fw-bold">Network</h2>
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
                  <h2 className="fs-5 fw-bold">Package Management</h2>
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
                  <h2 className="fs-5 fw-bold">Boot Environment Management</h2>
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
                  <h2 className="fs-5 fw-bold">Storage</h2>
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
                  <h2 className="fs-5 fw-bold">Time</h2>
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
                  <h2 className="fs-5 fw-bold">Process Management</h2>
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
                  <h2 className="fs-5 fw-bold">Fault Management</h2>
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
                  <h2 className="fs-5 fw-bold">File Manager</h2>
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

            {/* User & Group Management Tab */}
            {effectiveTab === 'user-group' && (
              <div>
                <div className="mb-4">
                  <h2 className="fs-5 fw-bold">User and Groups</h2>
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
