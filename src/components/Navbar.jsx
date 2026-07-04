import { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import {
  canStartStopZones,
  canRestartZones,
  canDestroyZones,
  canControlHosts,
  canPowerOffHosts,
} from '../utils/permissions';

import { FormModal } from './common';
import Breadcrumb from './Navbar/Breadcrumb';
import BulkActionsModal from './Navbar/BulkActionsModal';
import ContextTabs from './Navbar/ContextTabs';
import { HostRestartOptions, HostShutdownOptions } from './Navbar/HostActionModalContent';
import { getActionVariant, getActionIcon, isShareableRoute } from './Navbar/navbarUtils';
import { useNavbarActions } from './Navbar/useNavbarActions';

/**
 * Navbar — two rows (contract §2, XenCenter-style):
 *   row 1: breadcrumb (Datacenter ▸ Host ▸ Machine) + scope-aware Controls dropdown
 *   row 2: context tabs for the focused node (ContextTabs)
 *
 * Selection moved to the SidebarTree, so the old Host/Zone selector dropdowns are gone; the
 * breadcrumb takes over their labeling role. The Controls dropdown (Zone/Host actions) and its
 * confirm modal are unchanged.
 */
// Routes whose top-right control is the Host Actions dropdown (host context). Explicit, so it's
// obvious which routes count — matches ContextTabs' host set (minus the Settings tab, which
// needs no power controls). Dashboard → Datacenter controls; /ui/zones → Zone controls.
const HOST_CONTROL_ROUTES = [
  '/ui/hosts',
  '/ui/host-manage',
  '/ui/host-networking',
  '/ui/host-devices',
  '/ui/host-storage',
];

const Navbar = () => {
  const {
    isModal,
    currentMode,
    setCurrentMode,
    currentAction,
    setCurrentAction,
    loading,
    hostActionOptions,
    setHostActionOptions,
    recoveryFailed,
    setRecoveryFailed,
    handleModalClick,
    handleZoneAction,
    handleHostAction,
    handleShareCurrentPage,
    navigate,
    location,
    user,
    allServers,
    currentServer,
    currentZone,
  } = useNavbarActions();

  // Bulk Actions modal target: { action, servers } or null (phase B). Servers = one host
  // (host scope) or all registered hosts (Datacenter scope).
  const [bulk, setBulk] = useState(null);

  const ZoneControlDropdown = () => {
    const userRole = user?.role;

    return (
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary">Zone Controls</Dropdown.Toggle>
        <Dropdown.Menu>
          {isShareableRoute(location.pathname) && currentServer && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={handleShareCurrentPage}
                title="Copy shareable link to clipboard"
              >
                <i className="fas fa-share-alt text-info me-2" />
                Share Link
              </Dropdown.Item>
              <Dropdown.Divider />
            </>
          )}

          {canStartStopZones(userRole) && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('shutdown');
                  setCurrentMode('zone');
                }}
              >
                <i className="fas fa-stop text-danger me-2" />
                Shutdown
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('start');
                  setCurrentMode('zone');
                }}
              >
                <i className="fas fa-play text-success me-2" />
                Power On
              </Dropdown.Item>
            </>
          )}

          {canRestartZones(userRole) && (
            <Dropdown.Item
              as="button"
              type="button"
              onClick={() => {
                handleModalClick();
                setCurrentAction('restart');
                setCurrentMode('zone');
              }}
            >
              <i className="fas fa-redo text-warning me-2" />
              Restart
            </Dropdown.Item>
          )}

          {canDestroyZones(userRole) && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('kill');
                  setCurrentMode('zone');
                }}
              >
                <i className="fas fa-skull text-danger me-2" />
                Force Kill
              </Dropdown.Item>
              <Dropdown.Item as="button" type="button">
                <i className="fas fa-camera me-2" />
                Snapshot
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('provision');
                  setCurrentMode('zone');
                }}
              >
                <i className="fas fa-cogs me-2" />
                Provision
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('destroy');
                  setCurrentMode('zone');
                }}
              >
                <i className="fas fa-trash text-danger me-2" />
                Destroy
              </Dropdown.Item>
            </>
          )}

          {!canDestroyZones(userRole) && (
            <>
              <Dropdown.Divider />
              <div className="text-muted text-center p-2 small">
                Advanced controls require admin privileges
              </div>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const HostControlDropdown = () => {
    const userRole = user?.role;

    return (
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary">Host Actions</Dropdown.Toggle>
        <Dropdown.Menu>
          {isShareableRoute(location.pathname) && currentServer && (
            <>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={handleShareCurrentPage}
                title="Copy shareable link to clipboard"
              >
                <i className="fas fa-share-alt text-info me-2" />
                Share Link
              </Dropdown.Item>
              <Dropdown.Divider />
            </>
          )}

          <Dropdown.Item as="button" type="button" onClick={() => navigate('/ui/hosts')}>
            <i className="fas fa-eye text-info me-2" />
            View Host Details
          </Dropdown.Item>
          <Dropdown.Item as="button" type="button" onClick={() => navigate('/ui/host-manage')}>
            <i className="fas fa-cogs text-info me-2" />
            Manage Host
          </Dropdown.Item>

          {canPowerOffHosts(userRole) && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('restart');
                  setCurrentMode('host');
                }}
              >
                <i className="fas fa-redo text-warning me-2" />
                Restart Host
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => {
                  handleModalClick();
                  setCurrentAction('shutdown');
                  setCurrentMode('host');
                }}
              >
                <i className="fas fa-power-off text-danger me-2" />
                Power Off Host
              </Dropdown.Item>
            </>
          )}

          {canStartStopZones(userRole) && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Bulk machine actions</Dropdown.Header>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'start', servers: [currentServer] })}
              >
                <i className="fas fa-play text-success me-2" />
                Start machines…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'stop', servers: [currentServer] })}
              >
                <i className="fas fa-stop text-danger me-2" />
                Shutdown machines…
              </Dropdown.Item>
              {canRestartZones(userRole) && (
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => setBulk({ action: 'restart', servers: [currentServer] })}
                >
                  <i className="fas fa-redo text-warning me-2" />
                  Restart machines…
                </Dropdown.Item>
              )}
            </>
          )}

          {!canControlHosts(userRole) && (
            <>
              <Dropdown.Divider />
              <div className="text-muted text-center p-2 small">
                Host controls require admin privileges
                <br />
                Users have read-only access to host information
              </div>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const DatacenterControlDropdown = () => {
    const userRole = user?.role;

    return (
      <Dropdown align="end">
        <Dropdown.Toggle variant="outline-secondary">Bulk Actions</Dropdown.Toggle>
        <Dropdown.Menu>
          {canStartStopZones(userRole) ? (
            <>
              <Dropdown.Header>Across all hosts</Dropdown.Header>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'start', servers: allServers })}
              >
                <i className="fas fa-play text-success me-2" />
                Start machines…
              </Dropdown.Item>
              <Dropdown.Item
                as="button"
                type="button"
                onClick={() => setBulk({ action: 'stop', servers: allServers })}
              >
                <i className="fas fa-stop text-danger me-2" />
                Shutdown machines…
              </Dropdown.Item>
              {canRestartZones(userRole) && (
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => setBulk({ action: 'restart', servers: allServers })}
                >
                  <i className="fas fa-redo text-warning me-2" />
                  Restart machines…
                </Dropdown.Item>
              )}
            </>
          ) : (
            <div className="text-muted text-center p-2 small">
              Bulk actions require admin privileges
            </div>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  // Controls are scope-aware, driven by the route (like the breadcrumb + tabs): the machine
  // view → machine controls; a host view → host actions + host-scope bulk; the Datacenter /
  // Dashboard → cross-host bulk. Other pages (accounts/settings/profile) → no controls.
  const renderControls = () => {
    const path = location.pathname;
    if (path === '/ui/zones') {
      return <ZoneControlDropdown />;
    }
    if (path === '/ui' || path === '/ui/dashboard') {
      return <DatacenterControlDropdown />;
    }
    if (HOST_CONTROL_ROUTES.includes(path)) {
      return <HostControlDropdown />;
    }
    return null;
  };

  return (
    <div>
      {/* Confirm modal for host/zone actions (portal — placement here is irrelevant) */}
      {!isModal && (
        <FormModal
          isOpen={!isModal}
          onClose={handleModalClick}
          onSubmit={() =>
            currentMode === 'host'
              ? handleHostAction(currentAction)
              : handleZoneAction(currentAction)
          }
          title={`Confirm ${currentMode} ${currentAction}`}
          icon={getActionIcon(currentAction)}
          submitText={loading ? 'Processing...' : currentAction}
          submitVariant={getActionVariant(currentAction)}
          loading={loading}
        >
          {currentMode === 'host' && currentServer && (
            <div>
              <div className="alert alert-warning">
                <p>
                  <strong>Target:</strong> {currentServer.hostname}
                </p>
                <p>
                  This action will {currentAction === 'restart' ? 'restart' : 'shutdown'} the entire
                  host system.
                </p>
                <p>
                  <strong>Warning:</strong> This will interrupt all system services and user
                  sessions.
                </p>
              </div>

              {currentAction === 'restart' && (
                <HostRestartOptions
                  hostActionOptions={hostActionOptions}
                  setHostActionOptions={setHostActionOptions}
                />
              )}

              {currentAction === 'shutdown' && (
                <HostShutdownOptions
                  hostActionOptions={hostActionOptions}
                  setHostActionOptions={setHostActionOptions}
                />
              )}
            </div>
          )}
          {currentMode === 'zone' && currentZone && (
            <div className="alert alert-info">
              <p>
                <strong>Target:</strong> {currentZone}
              </p>
              <p>This action will be performed on the selected zone.</p>
            </div>
          )}
        </FormModal>
      )}

      {/* Row 1: breadcrumb + scope-aware Controls */}
      <nav
        className="d-flex justify-content-between align-items-center gap-2 px-2 py-1"
        role="navigation"
        aria-label="main navigation"
      >
        <Breadcrumb />
        <div className="d-flex align-items-center flex-shrink-0">{renderControls()}</div>
      </nav>

      {/* Row 2: context tabs for the focused node */}
      <ContextTabs />

      {/* Bulk Actions modal (phase B) — scope-aware, launched from the Controls dropdowns */}
      {bulk && (
        <BulkActionsModal
          show
          action={bulk.action}
          servers={bulk.servers}
          onClose={() => setBulk(null)}
        />
      )}

      {recoveryFailed && (
        <div className="alert alert-warning alert-dismissible m-2">
          Host restart is taking longer than expected. Please refresh the page manually to check if
          the server is back online.
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setRecoveryFailed(false)}
          />
        </div>
      )}
    </div>
  );
};
export default Navbar;
