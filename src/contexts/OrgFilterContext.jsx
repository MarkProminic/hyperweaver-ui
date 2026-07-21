import PropTypes from 'prop-types';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { getKnownOrgs } from '../api/orgAccessAPI';

import { useAuth } from './AuthContext';
import { useMode } from './ModeContext';

/**
 * Org-switcher context (Wave 7, ruled shape): a VIEW FILTER over the aggregated UI.
 * activeOrg '' = all organizations. D15's union access stays the enforcement truth —
 * this only narrows what renders and defaults org_uuid on creates. Direct mode has no
 * org layer; the filter stays off there.
 */
const OrgFilterContext = createContext();

export const useOrgFilter = () => {
  const context = useContext(OrgFilterContext);
  if (!context) {
    throw new Error('useOrgFilter must be used within an OrgFilterProvider');
  }
  return context;
};

/**
 * Is a registry row visible under the active org filter? Fails OPEN: rows without the
 * Server's org_uuids annotation, and unassigned rows (empty list — open to every
 * authenticated user), always show.
 * @param {Object} server - Registry row
 * @param {string} activeOrg - Active org uuid ('' = all)
 * @returns {boolean}
 */
export const serverVisibleUnderOrg = (server, activeOrg) =>
  !activeOrg ||
  !Array.isArray(server?.org_uuids) ||
  server.org_uuids.length === 0 ||
  server.org_uuids.includes(activeOrg);

/**
 * Same fail-open rule for machine rows (org_uuids decoration pending on the Server —
 * sync ask stands; rows without it always show).
 * @param {Object} machine - Machine row
 * @param {string} activeOrg - Active org uuid ('' = all)
 * @returns {boolean}
 */
export const machineVisibleUnderOrg = (machine, activeOrg) =>
  !activeOrg ||
  !Array.isArray(machine?.org_uuids) ||
  machine.org_uuids.length === 0 ||
  machine.org_uuids.includes(activeOrg);

/**
 * Filter a /stats machine-NAME array under the active org. The org annotation lives on
 * GET machines rows (Server-decorated org_uuids), so an active filter joins one rows
 * fetch against the names; names without a row, rows without the annotation, and the
 * no-filter case all fail open. Costs zero requests while the filter is off.
 * @param {Function} makeAgentRequest - The agent request fn (hostname, port, protocol, path)
 * @param {Object} server - Agent server object
 * @param {string[]} names - /stats allmachines-style name array
 * @param {string} activeOrg - Active org uuid ('' = all)
 * @returns {Promise<string[]>} Names visible under the filter
 */
export const filterMachineNamesUnderOrg = async (makeAgentRequest, server, names, activeOrg) => {
  if (!activeOrg || names.length === 0) {
    return names;
  }
  const result = await makeAgentRequest(server.hostname, server.port, server.protocol, 'machines');
  if (!result.success || !Array.isArray(result.data?.machines)) {
    return names;
  }
  const rows = new Map(result.data.machines.map(row => [row.name, row]));
  return names.filter(name => machineVisibleUnderOrg(rows.get(name) ?? null, activeOrg));
};

export const OrgFilterProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isDirect, ready: modeReady } = useMode();
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrgState] = useState(
    () => localStorage.getItem('hyperweaver_activeOrg') || ''
  );

  useEffect(() => {
    if (!modeReady || isDirect || !isAuthenticated) {
      setOrgs([]);
      return;
    }
    getKnownOrgs().then(list => {
      setOrgs(list);
      setActiveOrgState(current =>
        current && !list.some(org => org.uuid === current) ? '' : current
      );
    });
  }, [modeReady, isDirect, isAuthenticated]);

  const setActiveOrg = useCallback(uuid => {
    setActiveOrgState(uuid);
    if (uuid) {
      localStorage.setItem('hyperweaver_activeOrg', uuid);
    } else {
      localStorage.removeItem('hyperweaver_activeOrg');
    }
  }, []);

  const activeOrgRow = useMemo(
    () => orgs.find(org => org.uuid === activeOrg) || null,
    [orgs, activeOrg]
  );

  const value = useMemo(
    () => ({
      orgs,
      activeOrg,
      activeOrgRow,
      setActiveOrg,
      available: !isDirect && orgs.length > 0,
    }),
    [orgs, activeOrg, activeOrgRow, setActiveOrg, isDirect]
  );

  return <OrgFilterContext.Provider value={value}>{children}</OrgFilterContext.Provider>;
};

OrgFilterProvider.propTypes = {
  children: PropTypes.node,
};

export default OrgFilterContext;
