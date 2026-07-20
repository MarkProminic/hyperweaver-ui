/**
 * Staged-move → machine-modify PUT body translation, per host kind.
 * bhyve speaks update_nics/add_nics/remove_nics (physical vnic names; the
 * agent creates on-demand from global_nic + vlan_id); vbox speaks
 * nics[] re-attachment, add_nics (always bridged — the agent's rule) and
 * remove_nics by adapter number.
 * @param {string} hostKind - 'bhyve' | 'vbox'
 * @param {Array<object>} moves - staged tray rows for ONE machine
 * @returns {{body?: object, error?: string}} error 'unnamed' when a bhyve
 *   add is missing its vnic name
 */
export const buildNicBody = (hostKind, moves) => {
  const adds = moves.filter(move => move.isAdd);
  const removes = moves.filter(move => move.isRemove);
  const updates = moves.filter(move => !move.isAdd && !move.isRemove);
  if (hostKind === 'vbox') {
    return {
      body: {
        ...(updates.length > 0
          ? {
              nics: updates.map(move => ({
                adapter: move.adapter,
                mode: move.toMode,
                ...(move.toMode === 'nat' ? {} : { network: move.toCarrier }),
              })),
            }
          : {}),
        ...(adds.length > 0
          ? { add_nics: adds.map(move => ({ global_nic: move.toCarrier })) }
          : {}),
        ...(removes.length > 0 ? { remove_nics: removes.map(move => move.adapter) } : {}),
      },
    };
  }
  if (adds.some(move => !String(move.newName || '').trim())) {
    return { error: 'unnamed' };
  }
  return {
    body: {
      ...(updates.length > 0
        ? {
            update_nics: updates.map(move => ({
              physical: move.link,
              global_nic: move.toCarrier,
              ...(move.toVlanId > 0 ? { vlan_id: move.toVlanId } : {}),
            })),
          }
        : {}),
      ...(adds.length > 0
        ? {
            add_nics: adds.map(move => ({
              physical: String(move.newName).trim(),
              global_nic: move.toCarrier,
              ...(move.toVlanId > 0 ? { vlan_id: move.toVlanId } : {}),
            })),
          }
        : {}),
      ...(removes.length > 0 ? { remove_nics: removes.map(move => move.link) } : {}),
    },
  };
};

export default buildNicBody;
