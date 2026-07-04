import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useServers } from '../contexts/ServerContext';
import { UserSettings } from '../contexts/UserSettingsContext';

/**
 * SidebarTree — the single-select navigation tree (contract §2 / I2D-1).
 *
 * ONE component, mode-gated:
 *  - Aggregated (role=server): a renameable Datacenter root (= Dashboard) → hosts →
 *    machines (machines lazy-loaded per host on expand).
 *  - Direct (role=agent): no root; the one host, auto-expanded, → its machines.
 *
 * Selection is navigation/focus only — no checkboxes, no multi-select (bulk is a
 * separate modal, phase B). Clicking a node sets the ServerContext selection and
 * routes: Datacenter → Dashboard, Host → Host Overview, Machine → Zone Overview.
 */

// A running machine gets a filled green dot; a stopped one an outline dot (matches ZoneManager).
const MachineNode = ({ server, name, running }) => {
  const { currentServer, currentZone, selectServer, selectZone } = useServers();
  const navigate = useNavigate();
  const active = currentServer?.id === server.id && currentZone === name;

  const handleClick = () => {
    if (currentServer?.id !== server.id) {
      selectServer(server); // clears zone, so set it after
    }
    selectZone(name);
    navigate('/ui/zones');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`btn w-100 d-flex align-items-center gap-2 hw-tree-row hw-tree-machine ${active ? 'active' : ''}`}
      title={name}
    >
      <i
        className={`${running ? 'fas' : 'far'} fa-circle fa-xs ${running ? 'text-success' : 'text-secondary'}`}
      />
      <span className="text-truncate">{name}</span>
    </button>
  );
};

MachineNode.propTypes = {
  server: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) })
    .isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool,
};

// A host row: caret toggles lazy-loaded machines; the name selects the host + its Overview.
const HostNode = ({ server, autoExpanded = false }) => {
  const { currentServer, currentZone, selectServer, makeAgentRequest } = useServers();
  const { sidebarMinimized } = useContext(UserSettings);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(autoExpanded);
  const [machines, setMachines] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const hostActive = currentServer?.id === server.id && !currentZone;

  // Lazy-load this host's machines the first time it's expanded (contract C8 pattern).
  useEffect(() => {
    let cancelled = false;
    if (!expanded || machines !== null || sidebarMinimized) {
      return undefined;
    }
    makeAgentRequest(server.hostname, server.port, server.protocol, 'stats')
      .then(res => {
        if (cancelled) {
          return;
        }
        if (res.success) {
          setMachines({
            all: res.data.allzones || [],
            running: res.data.runningzones || [],
          });
        } else {
          setLoadError(true);
        }
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [expanded, machines, sidebarMinimized, makeAgentRequest, server]);

  const handleSelectHost = () => {
    selectServer(server);
    navigate('/ui/hosts');
  };

  if (sidebarMinimized) {
    // Icon-only: select the host; no machine expansion at this width.
    return (
      <button
        type="button"
        onClick={handleSelectHost}
        className={`btn w-100 d-flex justify-content-center hw-tree-row ${hostActive ? 'active' : ''}`}
        title={server.entityName || server.hostname}
      >
        <i className="fas fa-server" />
      </button>
    );
  }

  return (
    <div>
      <div
        className={`d-flex align-items-center hw-tree-row hw-tree-host hw-tree-rowflex ${hostActive ? 'active' : ''}`}
      >
        <button
          type="button"
          className="btn px-1"
          onClick={() => setExpanded(prev => !prev)}
          title={expanded ? 'Collapse' : 'Expand'}
          aria-label={expanded ? 'Collapse host' : 'Expand host'}
        >
          <i className={`fas fa-angle-${expanded ? 'down' : 'right'}`} />
        </button>
        <button
          type="button"
          onClick={handleSelectHost}
          className="btn flex-grow-1 d-flex align-items-center gap-2 text-start"
          title={server.entityName || server.hostname}
        >
          <i className="fas fa-server" />
          <span className="text-truncate">{server.entityName || server.hostname}</span>
        </button>
      </div>

      {expanded && !sidebarMinimized && (
        <div className="hw-tree-children">
          {machines === null && !loadError && (
            <div className="hw-tree-row hw-tree-machine text-muted small py-1">
              <i className="fas fa-spinner fa-spin me-2" />
              Loading…
            </div>
          )}
          {loadError && (
            <div className="hw-tree-row hw-tree-machine text-danger small py-1">
              <i className="fas fa-circle-xmark fa-xs me-2" />
              Unreachable
            </div>
          )}
          {machines && machines.all.length === 0 && (
            <div className="hw-tree-row hw-tree-machine text-muted small py-1">No machines</div>
          )}
          {machines &&
            machines.all.map(name => (
              <MachineNode
                key={name}
                server={server}
                name={name}
                running={machines.running.includes(name)}
              />
            ))}
        </div>
      )}
    </div>
  );
};

HostNode.propTypes = {
  server: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
    entityName: PropTypes.string,
  }).isRequired,
  autoExpanded: PropTypes.bool,
};

// The aggregate root (Aggregated only) — its Overview IS the Dashboard (contract §2).
// Admins get an Add-Host affordance that routes to the existing servers/add flow.
const DatacenterNode = ({ label, canAddHost }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarMinimized } = useContext(UserSettings);
  const { currentServer, currentZone } = useServers();
  // Datacenter is "focused" when nothing host/zone-specific is selected and we're on the dashboard.
  const active =
    !currentServer &&
    !currentZone &&
    (location.pathname === '/ui' || location.pathname === '/ui/dashboard');

  if (sidebarMinimized) {
    return (
      <button
        type="button"
        onClick={() => navigate('/ui/dashboard')}
        className={`btn w-100 d-flex justify-content-center hw-tree-row hw-tree-datacenter ${active ? 'active' : ''}`}
        title={label}
      >
        <i className="fas fa-sitemap" />
      </button>
    );
  }

  return (
    <div
      className={`d-flex align-items-center hw-tree-row hw-tree-datacenter hw-tree-rowflex ${active ? 'active' : ''}`}
    >
      <button
        type="button"
        onClick={() => navigate('/ui/dashboard')}
        className="btn flex-grow-1 d-flex align-items-center gap-2 text-start"
        title={label}
      >
        <i className="fas fa-sitemap" />
        <span className="fw-semibold text-truncate">{label}</span>
      </button>
      {canAddHost && (
        <button
          type="button"
          className="btn px-1"
          title="Add a host"
          aria-label="Add a host"
          onClick={() => navigate('/ui/settings/hyperweaver?tab=servers')}
        >
          <i className="fas fa-plus" />
        </button>
      )}
    </div>
  );
};

DatacenterNode.propTypes = {
  label: PropTypes.string.isRequired,
  canAddHost: PropTypes.bool,
};

const SidebarTree = () => {
  const { isDirect } = useMode();
  const { servers, currentServer } = useServers();
  const { datacenterLabel, user } = useAuth();
  const canAddHost = user?.role === 'admin' || user?.role === 'super-admin';

  // Direct mode: exactly one host (the origin agent), auto-expanded, no Datacenter root.
  if (isDirect) {
    const self = currentServer || servers[0];
    if (!self) {
      return null;
    }
    return (
      <div className="hw-tree">
        <HostNode server={self} autoExpanded />
      </div>
    );
  }

  // Aggregated: Datacenter root (= Dashboard) → hosts → machines.
  return (
    <div className="hw-tree">
      <DatacenterNode label={datacenterLabel || 'Datacenter'} canAddHost={canAddHost} />
      {servers.map(server => (
        <HostNode key={server.id ?? server.hostname} server={server} />
      ))}
    </div>
  );
};

export default SidebarTree;
