import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../contexts/ModeContext';
import { useOrgFilter, filterMachineNamesUnderOrg } from '../contexts/OrgFilterContext';
import { useServers } from '../contexts/ServerContext';
import { UserSettings } from '../contexts/UserSettingsContext';
import { useAgentHostname } from '../hooks/useAgentHostname';
import { hasMachines } from '../utils/capabilities';

import { useSidebarMenus } from './useSidebarMenus';

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

// The Dashboard route — while on it, ONLY the Datacenter node lights up
// (host/machine selections persist in context via the navbar auto-select,
// so selection alone can't drive the "you are here" highlight).
const onDashboardRoute = pathname => pathname === '/ui' || pathname === '/ui/dashboard';

// A running machine gets a filled green dot; a stopped one an outline dot (matches MachineManager).
const MachineNode = ({ server, name, running, onMenu = null }) => {
  const { currentServer, currentMachine, selectServer, selectMachine } = useServers();
  const navigate = useNavigate();
  const location = useLocation();
  const active =
    currentServer?.id === server.id &&
    currentMachine === name &&
    !onDashboardRoute(location.pathname);

  const handleClick = () => {
    if (currentServer?.id !== server.id) {
      selectServer(server); // clears the machine selection, so set it after
    }
    selectMachine(name);
    navigate('/ui/machines');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={event => {
        if (onMenu) {
          event.preventDefault();
          onMenu(event, { server, name, running });
        }
      }}
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
  onMenu: PropTypes.func,
};

// A host row: caret toggles lazy-loaded machines; the name selects the host + its Overview.
// Machine expansion is capability-gated (hasMachines): agents that don't offer machine
// management yet render as a plain host row — no caret, no machine fetch.
const HostNode = ({ server, autoExpanded = false, onHostMenu = null, onMachineMenu = null }) => {
  const { t } = useTranslation();
  const { currentServer, currentMachine, selectServer, makeAgentRequest } = useServers();
  const { activeOrg } = useOrgFilter();
  const { sidebarMinimized } = useContext(UserSettings);
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = useAgentHostname(server);
  const [expanded, setExpanded] = useState(autoExpanded);
  const [machines, setMachines] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const hostActive =
    currentServer?.id === server.id && !currentMachine && !onDashboardRoute(location.pathname);
  const machinesAvailable = hasMachines(server);

  // Lazy-load this host's machines on expand, then KEEP them fresh while
  // expanded: machines started or stopped outside this UI (VBoxManage, another
  // session, the agent itself) change the status dots within one poll cycle.
  // Collapse stops the polling; re-expanding refreshes immediately.
  useEffect(() => {
    let cancelled = false;
    if (!machinesAvailable || !expanded || sidebarMinimized) {
      return undefined;
    }
    const load = () => {
      makeAgentRequest(server.hostname, server.port, server.protocol, 'stats')
        .then(async res => {
          if (cancelled) {
            return;
          }
          if (res.success) {
            const visible = await filterMachineNamesUnderOrg(
              makeAgentRequest,
              server,
              res.data.allmachines || [],
              activeOrg
            );
            if (cancelled) {
              return;
            }
            setLoadError(false);
            setMachines({
              all: visible,
              running: (res.data.runningmachines || []).filter(name => visible.includes(name)),
            });
          } else {
            setLoadError(true);
          }
        })
        .catch(() => !cancelled && setLoadError(true));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [machinesAvailable, expanded, sidebarMinimized, makeAgentRequest, server, activeOrg]);

  const handleSelectHost = () => {
    selectServer(server);
    navigate('/ui/hosts');
  };

  const handleHostContext = event => {
    if (onHostMenu) {
      event.preventDefault();
      onHostMenu(event, server);
    }
  };

  if (sidebarMinimized) {
    // Icon-only: select the host; no machine expansion at this width.
    return (
      <button
        type="button"
        onClick={handleSelectHost}
        onContextMenu={handleHostContext}
        className={`btn w-100 d-flex justify-content-center hw-tree-row ${hostActive ? 'active' : ''}`}
        title={displayName}
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
        {machinesAvailable ? (
          <button
            type="button"
            className="btn px-1"
            onClick={() => setExpanded(prev => !prev)}
            title={
              expanded
                ? t('chrome.sidebarTree.collapseButton')
                : t('chrome.sidebarTree.expandButton')
            }
            aria-label={
              expanded
                ? t('chrome.sidebarTree.collapseHostAriaLabel')
                : t('chrome.sidebarTree.expandHostAriaLabel')
            }
          >
            <i className={`fas fa-angle-${expanded ? 'down' : 'right'}`} />
          </button>
        ) : (
          // Invisible caret keeps host names column-aligned next to expandable hosts.
          <span className="btn px-1 invisible" aria-hidden="true">
            <i className="fas fa-angle-right" />
          </span>
        )}
        <button
          type="button"
          onClick={handleSelectHost}
          onContextMenu={handleHostContext}
          className="btn flex-grow-1 d-flex align-items-center gap-2 text-start"
          title={displayName}
        >
          <i className="fas fa-server" />
          <span className="text-truncate">{displayName}</span>
        </button>
      </div>

      {machinesAvailable && expanded && !sidebarMinimized && (
        <div className="hw-tree-children">
          {machines === null && !loadError && (
            <div className="hw-tree-row hw-tree-machine text-muted small py-1">
              <i className="fas fa-spinner fa-spin me-2" />
              {t('chrome.sidebarTree.loadingMachines')}
            </div>
          )}
          {loadError && machines === null && (
            <div className="hw-tree-row hw-tree-machine text-danger small py-1">
              <i className="fas fa-circle-xmark fa-xs me-2" />
              {t('chrome.sidebarTree.unreachable')}
            </div>
          )}
          {machines && machines.all.length === 0 && (
            <div className="hw-tree-row hw-tree-machine text-muted small py-1">
              {t('chrome.sidebarTree.noMachines')}
            </div>
          )}
          {machines &&
            machines.all.map(name => (
              <MachineNode
                key={name}
                server={server}
                name={name}
                running={machines.running.includes(name)}
                onMenu={onMachineMenu}
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
  onHostMenu: PropTypes.func,
  onMachineMenu: PropTypes.func,
};

// The aggregate root (Aggregated only) — its Overview IS the Dashboard (contract §2).
// Admins get an Add-Host affordance that routes to the existing servers/add flow.
const DatacenterNode = ({ label, canAddHost }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarMinimized } = useContext(UserSettings);
  const { selectServer } = useServers();
  // Datacenter is "focused" by ROUTE alone: the navbar auto-selects a host
  // whenever none is picked, so a selection-based test could never be true
  // (Mark's report: the Dashboard never highlighted). Host/machine rows
  // stand down on this route via the same onDashboardRoute check.
  const active = onDashboardRoute(location.pathname);

  const handleSelect = () => {
    selectServer(null); // drop the machine focus; the navbar may re-pick a host
    navigate('/ui/dashboard');
  };

  if (sidebarMinimized) {
    return (
      <button
        type="button"
        onClick={handleSelect}
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
        onClick={handleSelect}
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
          title={t('chrome.sidebarTree.addHostButton')}
          aria-label={t('chrome.sidebarTree.addHostButton')}
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
  const { t } = useTranslation();
  const { isDirect } = useMode();
  const { servers, currentServer } = useServers();
  const { datacenterLabel, user } = useAuth();
  const canAddHost = user?.role === 'admin' || user?.role === 'super-admin';
  const { handleMachineMenu, handleHostMenu, elements } = useSidebarMenus();

  // Direct mode: exactly one host (the origin agent), auto-expanded, no Datacenter root.
  if (isDirect) {
    const self = currentServer || servers[0];
    if (!self) {
      return null;
    }
    return (
      <div className="hw-tree">
        <HostNode
          server={self}
          autoExpanded
          onHostMenu={handleHostMenu}
          onMachineMenu={handleMachineMenu}
        />
        {elements}
      </div>
    );
  }

  // Aggregated: Datacenter root (= Dashboard) → hosts → machines.
  return (
    <div className="hw-tree">
      <DatacenterNode
        label={datacenterLabel || t('chrome.sidebarTree.datacenterDefault')}
        canAddHost={canAddHost}
      />
      {servers.map(server => (
        <HostNode
          key={server.id ?? server.hostname}
          server={server}
          onHostMenu={handleHostMenu}
          onMachineMenu={handleMachineMenu}
        />
      ))}
      {elements}
    </div>
  );
};

export default SidebarTree;
