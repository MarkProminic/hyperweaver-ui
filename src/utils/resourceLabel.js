import i18n from '../i18n';

/**
 * Capability-driven resource label — "Zones" vs "Machines" (contract C7 / roadmap item 1).
 *
 * A bhyve agent calls its instances "zones"; a VirtualBox agent calls them "machines".
 * The label is DERIVED from the agent's `hypervisors` capability array (see C7 —
 * `hypervisors` is a string[], today always array-of-one, `bhyve` | `virtualbox`), never
 * hardcoded per agent. Across a set (the aggregated tree spanning several hosts) the neutral
 * shared noun "machines" wins whenever there's any non-bhyve or a mix (O1).
 *
 * Rule (robust to 1-or-many, matches C7): union over the visible scope →
 *   all-`bhyve`            → "Zone(s)"
 *   any `virtualbox` / mix → "Machine(s)"
 *   absent / legacy / none → "Machine(s)"  (neutral shared noun, O1)
 *
 * @param {Object|Object[]|null|undefined} servers - one server (registry row / Direct
 *   self-server, each carrying `capabilities`) or an array of them.
 * @param {Object} [opts]
 * @param {boolean} [opts.plural=true] - plural ("Zones"/"Machines") vs singular ("Zone"/"Machine").
 * @returns {string} The capability-appropriate label.
 */
export const resourceLabel = (servers, { plural = true } = {}) => {
  const list = Array.isArray(servers) ? servers : [servers].filter(Boolean);
  const hypervisors = list.flatMap(server => server?.capabilities?.hypervisors ?? []);

  // Only "all bhyve" (with at least one known hypervisor) reads as "Zones"; everything
  // else — virtualbox, a mix, or an unknown/legacy agent with no capability — is "Machines".
  const allBhyve =
    hypervisors.length > 0 && hypervisors.every(hypervisor => hypervisor === 'bhyve');
  if (allBhyve) {
    return plural ? i18n.t('common.nounZones') : i18n.t('common.nounZone');
  }
  return plural ? i18n.t('common.nounMachines') : i18n.t('common.nounMachine');
};

// NOTE: the former machinesPath() dual-path helper is deliberately GONE — the UI calls
// the canonical /machines/* paths unconditionally on every agent (sync-file ruling,
// 2026-07-05: one path, one vocabulary, no fallback).
