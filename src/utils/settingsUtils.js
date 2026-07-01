/**
 * Settings utility functions for processing and organizing configuration metadata
 */

/**
 * Maps configuration path to section name
 * @param {string} path - Configuration path (e.g., "frontend.theme")
 * @returns {string|undefined} Section name
 */
export const inferSection = path => {
  const sectionMap = {
    frontend: 'Frontend',
    server: 'Server',
    database: 'Database',
    mail: 'Mail',
    authentication: 'Authentication',
    cors: 'Security',
    logging: 'Logging',
    limits: 'Performance',
    environment: 'Environment',
    integrations: 'Integrations',
    gravatar: 'Integrations', // Map gravatar to Integrations
  };

  const pathParts = path.split('.');
  return sectionMap[pathParts[0]];
};

/**
 * Extracts subsection name from configuration path
 * @param {string} path - Configuration path
 * @param {string} section - Parent section name
 * @returns {string|null} Subsection name or null
 */
export const inferSubsection = (path, section) => {
  if (section === 'Integrations') {
    const pathParts = path.split('.');
    if (pathParts[0] === 'integrations' && pathParts[1]) {
      // Convert subsection name to title case
      return pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1);
    }
    if (pathParts[0] === 'gravatar') {
      return 'Gravatar';
    }
  }
  return null;
};

/**
 * Converts snake_case field name to Title Case label
 * @param {string} fieldName - Field name in snake_case
 * @returns {string} Title Case label
 */
export const generateLabel = fieldName =>
  fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Returns FontAwesome icon class for section
 * @param {string} section - Section name
 * @returns {string} FontAwesome icon class
 */
export const getSectionIcon = section => {
  const iconMap = {
    Application: 'fas fa-cogs',
    Server: 'fas fa-server',
    Frontend: 'fas fa-desktop',
    Database: 'fas fa-database',
    Mail: 'fas fa-envelope',
    Authentication: 'fas fa-shield-alt',
    Security: 'fas fa-lock',
    Logging: 'fas fa-file-alt',
    Performance: 'fas fa-tachometer-alt',
    Environment: 'fas fa-globe',
    Integrations: 'fas fa-puzzle-piece',
  };
  return iconMap[section] || 'fas fa-cog';
};

/**
 * Determines whether a field should be shown given the current values, by
 * evaluating its `conditional` ({ field, value }) against the live values.
 * A field with no conditional is always visible. Single source of truth used
 * by FieldRenderer (to skip a field) and by the settings UI (to hide empty
 * subsections and count only the fields that currently apply).
 * @param {object} field - Field metadata (may carry a `conditional`)
 * @param {object} values - Current settings values keyed by path
 * @returns {boolean} True if the field applies and should be rendered
 */
export const isFieldVisible = (field, values) => {
  if (!field.conditional) {
    return true;
  }

  const { field: dependsOn, value: showWhen } = field.conditional;
  const dependentValue = values[dependsOn];

  if (Array.isArray(showWhen)) {
    return showWhen.includes(dependentValue);
  }

  return dependentValue === showWhen;
};

/**
 * Ensures a section exists in organizedSections
 */
const ensureSection = (organizedSections, section, sectionMetadata) => {
  if (!organizedSections[section]) {
    const metadata = sectionMetadata[section] || {};
    organizedSections[section] = {
      title: section,
      icon: metadata.icon || getSectionIcon(section),
      description: metadata.description || '',
      fields: [],
      subsections: {},
    };
  }
};

/**
 * Ensures a subsection exists in a section
 */
const ensureSubsection = (organizedSections, section, subsection) => {
  if (!organizedSections[section].subsections[subsection]) {
    organizedSections[section].subsections[subsection] = {
      title: subsection,
      fields: [],
    };
  }
};

/**
 * Normalizes a field's conditional-visibility metadata into a single
 * { field: <full path>, value: <expected> } shape. The config file uses two
 * dialects: an explicit `conditional: { field, value }` (already full-path), and
 * a sibling-relative `depends_on: <name>` + `show_when: <value|[values]>`. This
 * folds the latter into the former so isFieldVisible has one form to evaluate.
 * @param {string} fullPath - The field's full config path
 * @param {object} value - Raw field metadata
 * @returns {object|null} Normalized conditional, or null if unconditional
 */
const normalizeConditional = (fullPath, value) => {
  if (value.conditional) {
    return value.conditional;
  }
  if (value.depends_on === undefined) {
    return null;
  }
  const lastDot = fullPath.lastIndexOf('.');
  const parentPath = lastDot === -1 ? '' : fullPath.slice(0, lastDot);
  const dependsPath = parentPath ? `${parentPath}.${value.depends_on}` : value.depends_on;
  return {
    field: dependsPath,
    value: value.show_when !== undefined ? value.show_when : true,
  };
};

/**
 * Creates field data object from value metadata
 */
const createFieldData = (fullPath, key, value) => ({
  key: fullPath,
  path: fullPath,
  type: value.type,
  label: value.label || generateLabel(key),
  description: value.description || '',
  placeholder: value.placeholder || '',
  required: value.required || false,
  options: value.options || null,
  validation: value.validation || {},
  conditional: normalizeConditional(fullPath, value),
  order: value.order || 0,
  value: value.value,
  collection:
    value.type === 'collection'
      ? {
          icon: value.icon || null,
          itemSchema: value.item_schema || {},
          itemLabelField: value.item_label_field || null,
          secretFields: value.secret_fields || [],
          keyLabel: value.key_label || 'Name',
          itemNoun: value.item_noun || 'Item',
          requiresRestart: value.requires_restart === true,
        }
      : null,
});

/**
 * Expands a collection's item_schema into FieldRenderer-compatible field objects
 * (path = the sub-field key, so each slots into a per-item values map), sorted by
 * order. Lets the generic CollectionManager render an item's editor with the
 * exact same field types, validation, and conditionals as top-level settings.
 * @param {object} itemSchema - The collection's item_schema metadata map
 * @returns {Array<object>} Field descriptors for FieldRenderer
 */
export const buildCollectionItemFields = (itemSchema = {}) =>
  Object.entries(itemSchema)
    .map(([key, meta]) => ({
      key,
      path: key,
      type: meta.type,
      label: meta.label || generateLabel(key),
      description: meta.description || '',
      placeholder: meta.placeholder || '',
      required: meta.required || false,
      options: meta.options || null,
      validation: meta.validation || {},
      conditional: meta.conditional || null,
      order: meta.order || 0,
      value: meta.value,
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

/**
 * Checks if a value is a metadata field
 */
const isMetadataField = value =>
  value && typeof value === 'object' && value.type && Object.hasOwn(value, 'value');

/**
 * Checks if a value is a nested object (not a field)
 */
const isNestedObject = value =>
  value && typeof value === 'object' && !Array.isArray(value) && !Object.hasOwn(value, 'type');

/**
 * Processes raw configuration into organized structure with sections, subsections, and fields
 * @param {object} config - Raw configuration object with metadata
 * @returns {{extractedValues: object, organizedSections: object}} Processed configuration
 */
export const processConfig = config => {
  const extractedValues = {};
  const organizedSections = {};
  const sectionMetadata = config._sections || {};

  const processObject = (obj, path = '', sectionName = 'General') => {
    for (const [key, value] of Object.entries(obj || {})) {
      // Skip metadata sections
      if (key === '_sections') {
        continue;
      }

      const fullPath = path ? `${path}.${key}` : key;

      if (isMetadataField(value)) {
        // Bare `type: object` values are legacy containers with no renderable
        // schema — skip them entirely (never enter `values`, never render).
        if (value.type === 'object') {
          continue;
        }

        const isCollection = value.type === 'collection';

        // Collections (keyed maps managed by CollectionManager via the dedicated
        // /api/settings/collections endpoints) must NOT enter the flat `values`
        // map — the generic save walks paths literally and would corrupt their
        // nested {value}-wrapped structure — but we DO surface the field so it
        // renders in its section/subsection.
        if (!isCollection) {
          extractedValues[fullPath] = value.value;
        }

        // Determine section from metadata or infer from path
        const section = value.section || inferSection(fullPath) || sectionName;
        const subsection = value.subsection || inferSubsection(fullPath, section);

        ensureSection(organizedSections, section, sectionMetadata);

        const fieldData = createFieldData(fullPath, key, value);

        if (subsection) {
          // Regular field processing for subsection fields
          ensureSubsection(organizedSections, section, subsection);
          organizedSections[section].subsections[subsection].fields.push(fieldData);
        } else {
          // Add to main section
          organizedSections[section].fields.push(fieldData);
        }
      } else if (isNestedObject(value)) {
        // This is a nested object, recurse with section inference
        const inferredSection = inferSection(fullPath) || sectionName;
        processObject(value, fullPath, inferredSection);
      } else if (Array.isArray(value) || typeof value !== 'object') {
        // This is a direct value (backward compatibility)
        extractedValues[fullPath] = value;
      }
    }
  };

  processObject(config);

  // Sort fields within each section and subsection by order
  Object.values(organizedSections).forEach(section => {
    section.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    Object.values(section.subsections).forEach(subsection => {
      subsection.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  });

  return { extractedValues, organizedSections };
};
