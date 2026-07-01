import PropTypes from 'prop-types';
import Dropdown from 'react-bootstrap/Dropdown';

import {
  canStartStopZones,
  canRestartZones,
  canDestroyZones,
  canControlHosts,
  canPowerOffHosts,
} from '../utils/permissions';

import { FormModal } from './common';
import { HostRestartOptions, HostShutdownOptions } from './Navbar/HostActionModalContent';
import {
  getZoneStatus,
  getStatusDotColor,
  getActionVariant,
  getActionIcon,
  isShareableRoute,
} from './Navbar/navbarUtils';
import { useNavbarActions } from './Navbar/useNavbarActions';

const Navbar = () => {
  const {
    isModal,
    zones,
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
    selectServer,
    selectZone,
    clearZone,
  } = useNavbarActions();

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

  const ZoneList = ({ zones: zoneData }) => (
    <>
      {currentZone && (
        <Dropdown.Item as="button" type="button" onClick={clearZone}>
          <i className="fas fa-times text-warning me-2" />
          Deselect Zone
        </Dropdown.Item>
      )}
      {zoneData.data.allzones
        .filter(zone => zone !== currentZone)
        .map(zone => {
          const status = getZoneStatus(zones, zone);
          const statusColor = getStatusDotColor(status);

          return (
            <Dropdown.Item
              as="button"
              type="button"
              key={zone}
              onClick={() => selectZone(zone)}
              className="d-flex align-items-center gap-2"
            >
              <span>{zone}</span>
              <span className={statusColor} title={`Status: ${status}`}>
                <i className="fas fa-circle fa-xs" />
              </span>
            </Dropdown.Item>
          );
        })}
    </>
  );

  ZoneList.propTypes = {
    zones: PropTypes.shape({
      data: PropTypes.shape({
        allzones: PropTypes.arrayOf(PropTypes.string).isRequired,
      }).isRequired,
    }).isRequired,
  };

  return (
    <div>
      <nav
        className="d-flex justify-content-between align-items-center gap-2 p-2"
        role="navigation"
        aria-label="main navigation"
      >
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
                    This action will {currentAction === 'restart' ? 'restart' : 'shutdown'} the
                    entire host system.
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

        <div className="d-flex align-items-center gap-2">
          {currentServer ? (
            <Dropdown>
              <Dropdown.Toggle
                variant="outline-secondary"
                className="d-flex align-items-center gap-2"
              >
                <i className="fas fa-server" />
                <span className="text-uppercase small opacity-75">Host</span>
                <span className="fw-semibold">{currentServer.hostname}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {allServers &&
                  allServers.map(server => (
                    <Dropdown.Item
                      as="button"
                      type="button"
                      key={server.hostname}
                      active={server.hostname === currentServer.hostname}
                      onClick={() => selectServer(server)}
                      className="d-flex align-items-center gap-2"
                    >
                      <i className="fas fa-server" />
                      <span>{server.hostname}</span>
                    </Dropdown.Item>
                  ))}
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <a
              href="/ui/settings/hyperweaver?tab=servers"
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
            >
              <i className="fas fa-server" />
              <span className="text-uppercase small opacity-75">Host</span>
              <span className="fw-semibold">Add Server</span>
              <i className="fas fa-plus text-success" />
            </a>
          )}

          <div className="vr mx-1" />

          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="d-flex align-items-center gap-2"
            >
              <i className="fab fa-hive" />
              <span className="text-uppercase small opacity-75">Zone</span>
              {currentZone ? (
                <span className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">{currentZone}</span>
                  <span
                    className={getStatusDotColor(getZoneStatus(zones, currentZone))}
                    title={`Status: ${getZoneStatus(zones, currentZone)}`}
                  >
                    <i className="fas fa-circle fa-xs" />
                  </span>
                </span>
              ) : (
                <span className="fw-semibold opacity-75">None</span>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu>{zones && <ZoneList zones={zones} />}</Dropdown.Menu>
          </Dropdown>
        </div>

        <div className="d-flex align-items-center">
          {currentZone ? <ZoneControlDropdown /> : <HostControlDropdown />}
        </div>
      </nav>

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
