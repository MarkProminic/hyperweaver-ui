// Box-catalog helpers. The agents proxy BoxVault /api/discover FILTERED to
// what the host can consume, so every listed version is installable. Shape:
// an ARRAY of boxes {name, user.primaryOrganization.name,
// versions:[{versionNumber, providers:[{architectures:[{name}]}]}]}.
// Non-conforming entries are skipped, never thrown.

/** Flatten the discover payload into picker rows. */
export const flattenBoxCatalog = payload => {
  // Payload variants seen in the wild: the bare ARRAY (BoxVault discover),
  // {boxes: [...]}, and {data: [...]} wrappers — tolerate all three.
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.boxes) && payload.boxes) ||
      (Array.isArray(payload?.data) && payload.data);
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map(box => {
      const organization =
        box?.user?.primaryOrganization?.name ||
        box?.organization?.name ||
        (typeof box?.organization === 'string' ? box.organization : '') ||
        box?.user?.username ||
        box?.owner ||
        '';
      const boxName = box?.name || '';
      if (!boxName) {
        return null;
      }
      const versionRows = Array.isArray(box.versions) ? box.versions : [];
      const versions = versionRows
        .map(version =>
          typeof version === 'string'
            ? version
            : version?.versionNumber || version?.version || version?.name || ''
        )
        .filter(Boolean);
      const architectures = [
        ...new Set(
          versionRows.flatMap(version =>
            (Array.isArray(version?.providers) ? version.providers : []).flatMap(provider =>
              (Array.isArray(provider?.architectures) ? provider.architectures : [])
                .map(architecture => architecture?.name)
                .filter(Boolean)
            )
          )
        ),
      ];
      return {
        value: organization ? `${organization}/${boxName}` : boxName,
        organization,
        boxName,
        versions,
        architectures,
      };
    })
    .filter(Boolean);
};

/**
 * The default source from GET /templates/sources — `default: true` where the
 * agent's config carries it (the Go agent), else the first source
 * (zoneweaver's listSources serves no default flag — source-verified).
 */
export const pickDefaultSource = sources => {
  const list = Array.isArray(sources) ? sources : [];
  return list.find(source => source?.default === true) || list[0] || null;
};
