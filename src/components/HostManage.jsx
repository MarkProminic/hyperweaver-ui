import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useServers } from '../contexts/ServerContext';
import { hasFeature, hasHypervisor } from '../utils/capabilities';

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
import RecipesManagement from './Host/RecipesManagement';
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
  { id: 'services', labelKey: 'tabServices', icon: 'fas fa-cogs', feature: 'services' },
  // ONE Network tab for every agent (Mark's ruling: same components
  // everywhere, never per-agent UIs) — it shows when ANY of its sections'
  // tokens is live; the sections inside gate individually.
  {
    id: 'network',
    labelKey: 'tabNetwork',
    icon: 'fas fa-network-wired',
    featuresAny: ['vnics', 'hosts-file'],
  },
  { id: 'packages', labelKey: 'tabPackages', icon: 'fas fa-box', feature: 'packages' },
  {
    id: 'boot-environments',
    labelKey: 'tabBootEnvironments',
    icon: 'fas fa-layer-group',
    feature: 'boot-environments',
  },
  { id: 'storage', labelKey: 'tabStorage', icon: 'fas fa-database', feature: 'zfs' },
  { id: 'time-ntp', labelKey: 'tabTime', icon: 'fas fa-clock', feature: 'time-sync' },
  { id: 'processes', labelKey: 'tabProcesses', icon: 'fas fa-tasks', feature: 'processes' },
  {
    id: 'fault-management',
    labelKey: 'tabFaultManagement',
    icon: 'fas fa-exclamation-triangle',
    feature: 'fault-management',
  },
  {
    id: 'file-manager',
    labelKey: 'tabFileManager',
    icon: 'fas fa-folder',
    feature: 'file-browser',
  },
  {
    id: 'user-group',
    labelKey: 'tabUserGroups',
    icon: 'fas fa-users',
    feature: 'system-users',
  },
  // Token regate (Mark's option-(a) word): the registry surface rides its
  // own `provisioner-registry` token — zoneweaver's always-on `provisioning`
  // names its pipeline, not a registry, and gains this token at parity.
  {
    id: 'provisioning',
    labelKey: 'tabProvisioners',
    icon: 'fas fa-cubes',
    feature: 'provisioner-registry',
  },
  // The dormant-but-available host-side provisioning network (Mark's
  // ruling) — rides the existing `provisioning` token, no gate of its own.
  {
    id: 'provisioning-network',
    labelKey: 'tabProvisioningNetwork',
    icon: 'fas fa-diagram-project',
    feature: 'provisioning',
  },
  // zlogin console recipes — a zoneweaver/bhyve-only capability (platform-
  // scoped per its sync entry; no token exists), never shown on vbox hosts.
  {
    id: 'recipes',
    labelKey: 'tabRecipes',
    icon: 'fas fa-scroll',
    feature: 'provisioning',
    bhyveOnly: true,
  },
  {
    id: 'templates',
    labelKey: 'tabTemplates',
    icon: 'fas fa-compact-disc',
    feature: 'templates',
  },
  // Host-level ordered boot/shutdown (catalog §8) — rides `machines`.
  {
    id: 'orchestration',
    labelKey: 'tabOrchestration',
    icon: 'fas fa-arrow-down-1-9',
    feature: 'machines',
  },
  // `artifacts` alone also names the zoneweaver ISO/storage-location surface
  // (its own sub-tab under Storage); the file cache lights up only where the
  // registry ships too — the agreed convergence gate.
  {
    id: 'installer-files',
    labelKey: 'tabInstallerFiles',
    icon: 'fas fa-box-archive',
    features: ['artifacts', 'provisioner-registry'],
  },
  // Agent database maintenance — /database/* ships ungated on both agents.
  { id: 'database', labelKey: 'tabDatabase', icon: 'fas fa-database' },
];

const HostManage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('services');

  const { user } = useAuth();
  const { currentServer } = useServers();
  const navigate = useNavigate();

  const visibleTabs = TABS.filter(tab => {
    if (tab.bhyveOnly && !hasHypervisor(currentServer, 'bhyve')) {
      return false;
    }
    // featuresAny: a tab whose SECTIONS gate individually shows when any
    // of their tokens is live.
    if (tab.featuresAny) {
      return tab.featuresAny.some(token => hasFeature(currentServer, token));
    }
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
          <title>{t('pages.hostManage.titleAccessDenied')}</title>
        </Helmet>
        <div className="container-fluid m-2">
          <div className="alert alert-danger">{t('pages.hostManage.adminRequired')}</div>
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
          <title>{t('pages.hostManage.titleNoServerSelected')}</title>
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <HostPageHeader title={t('pages.hostManage.pageTitle')}>
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={() => navigate('/ui/hosts')}
              >
                <i className="fas fa-arrow-left me-2" />
                <span>{t('pages.hostManage.backToHosts')}</span>
              </button>
            </HostPageHeader>
            <div className="px-4">
              <div className="alert alert-info">
                <p>{t('pages.hostManage.selectServerPrompt')}</p>
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
        <title>{t('pages.hostManage.titleManageHost', { hostname: currentServer.hostname })}</title>
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <HostPageHeader title={t('pages.hostManage.pageTitle')} />

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
                    <span>{t(`pages.hostManage.${tab.labelKey}`)}</span>
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
                    {t('pages.hostManage.descServicesPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descServicesPost')}
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
                    {t('pages.hostManage.descNetworkPre')} <strong>{currentServer.hostname}</strong>
                    . {t('pages.hostManage.descNetworkPost')}
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
                    {t('pages.hostManage.descPackagesPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descPackagesPost')}
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
                    {t('pages.hostManage.descBootEnvironmentsPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descBootEnvironmentsPost')}
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
                    {t('pages.hostManage.descStoragePre')} <strong>{currentServer.hostname}</strong>
                    . {t('pages.hostManage.descStoragePost')}
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
                    {t('pages.hostManage.descTimeNtpPre')} <strong>{currentServer.hostname}</strong>
                    . {t('pages.hostManage.descTimeNtpPost')}
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
                    {t('pages.hostManage.descProcessesPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descProcessesPost')}
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
                    {t('pages.hostManage.descFaultManagementPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descFaultManagementPost')}
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
                    {t('pages.hostManage.descFileManagerPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descFileManagerPost')}
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
                    {t('pages.hostManage.descProvisioningPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descProvisioningPost')}
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
                    {t('pages.hostManage.descProvisioningNetworkSeg1')}{' '}
                    <strong>{t('pages.hostManage.descProvisioningNetworkOne')}</strong>{' '}
                    {t('pages.hostManage.descProvisioningNetworkSeg2')}{' '}
                    <code>provisioning.network</code>{' '}
                    {t('pages.hostManage.descProvisioningNetworkSeg3')}{' '}
                    <strong>{currentServer.hostname}</strong>
                    {t('pages.hostManage.descProvisioningNetworkSeg4')}
                  </p>
                </div>

                <ProvisioningNetworkPanel server={currentServer} />
              </div>
            )}

            {/* Recipes Tab */}
            {effectiveTab === 'recipes' && (
              <div>
                <div className="mb-4">
                  <p>
                    {t('pages.hostManage.descRecipesSeg1')}{' '}
                    <strong>{currentServer.hostname}</strong>{' '}
                    {t('pages.hostManage.descRecipesSeg2')} <code>zone_setup</code>{' '}
                    {t('pages.hostManage.descRecipesSeg3')}
                  </p>
                </div>

                <RecipesManagement server={currentServer} />
              </div>
            )}

            {/* Orchestration Tab */}
            {effectiveTab === 'orchestration' && (
              <div>
                <div className="mb-4">
                  <p>
                    {t('pages.hostManage.descOrchestrationPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descOrchestrationPost')}
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
                    {t('pages.hostManage.descTemplatesPre')}{' '}
                    <strong>{currentServer.hostname}</strong>{' '}
                    {t('pages.hostManage.descTemplatesPost')}
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
                    {t('pages.hostManage.descInstallerFilesPre')}{' '}
                    <strong>{currentServer.hostname}</strong>{' '}
                    {t('pages.hostManage.descInstallerFilesPost')}
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
                    {t('pages.hostManage.descDatabasePre')}{' '}
                    <strong>{currentServer.hostname}</strong>{' '}
                    {t('pages.hostManage.descDatabasePost')}
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
                    {t('pages.hostManage.descUserGroupPre')}{' '}
                    <strong>{currentServer.hostname}</strong>.{' '}
                    {t('pages.hostManage.descUserGroupPost')}
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
