// Build the tabbed section tree from the raw settings values. Object values
// become sections/subsections; everything else is a field.
export const organizeBySection = settingsData => {
  const sections = [];

  const collectSectionContent = (obj, basePath = []) => {
    const content = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // This is a subsection
        content.push({
          type: 'subsection',
          name: key,
          path: [...basePath, key],
          fields: collectSectionContent(value, [...basePath, key]),
        });
      } else {
        // This is a field
        content.push({
          type: 'field',
          key,
          value,
          path: [...basePath, key],
        });
      }
    });

    return content;
  };

  Object.entries(settingsData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sections.push({
        name: key,
        content: collectSectionContent(value, [key]),
      });
    }
  });

  return sections;
};

// Walk the schema to the descriptor for a field path. Object nodes nest their
// children under `properties`; free-form map nodes (e.g. logging.categories)
// describe every child through a `values` vocabulary instead — synthesized here
// as an enum so map entries render as dropdowns.
export const schemaNodeForPath = (schema, path) => {
  let node = schema?.[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!node) {
      return null;
    }
    if (node.properties) {
      node = node.properties[path[i]];
    } else if (Array.isArray(node.values)) {
      node = { type: 'string', enum: node.values };
    } else {
      return null;
    }
  }
  return node || null;
};

// Check if a section is orchestration-related
export const isOrchestrationSection = sectionName =>
  sectionName === 'zones' ||
  sectionName.includes('orchestration') ||
  sectionName.includes('zone_management');
