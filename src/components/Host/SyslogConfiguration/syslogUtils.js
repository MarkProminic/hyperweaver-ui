/**
 * Get Bootstrap alert class based on validation state
 * @param {Array} errors - Validation errors
 * @param {Array} warnings - Validation warnings
 * @returns {string} Bootstrap alert class name
 */
export const getValidationColor = (errors, warnings) => {
  if (errors && errors.length > 0) {
    return 'alert-danger';
  }
  if (warnings && warnings.length > 0) {
    return 'alert-warning';
  }
  return 'alert-success';
};

/**
 * Get Bootstrap badge class based on service status state
 * @param {object} status - Service status object
 * @returns {string} Bootstrap badge class name
 */
export const getServiceStatusColor = status => {
  switch (status?.state?.toLowerCase()) {
    case 'online':
      return 'text-bg-success';
    case 'offline':
      return 'text-bg-danger';
    case 'maintenance':
      return 'text-bg-warning';
    default:
      return 'text-bg-secondary';
  }
};

/**
 * Determine service type from config FMRI
 * @param {object} config - Syslog configuration object
 * @returns {object} Service type info { name, display, icon }
 */
export const getServiceType = config => {
  if (config?.service_fmri?.includes('rsyslog')) {
    return { name: 'rsyslog', display: 'rsyslog (Modern)', icon: 'fa-cogs' };
  } else if (config?.service_fmri?.includes('system-log')) {
    return {
      name: 'syslog',
      display: 'syslog (Traditional)',
      icon: 'fa-file-alt',
    };
  }
  return { name: 'unknown', display: 'Unknown', icon: 'fa-question' };
};

/**
 * Match rsyslog-specific directives (module, global, include, input)
 * @param {string} fullLine - The full rule line text
 * @returns {object|null} Processed display info or null if not a directive
 */
const matchRsyslogDirective = fullLine => {
  if (fullLine.includes('module(load=')) {
    const moduleMatch = fullLine.match(/module\(load="(?<moduleName>[^"]+)"/);
    return {
      isValid: true,
      selector: '(rsyslog module)',
      actionType: 'rsyslog_module',
      target: moduleMatch ? moduleMatch.groups.moduleName : 'unknown',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  if (fullLine.includes('global(')) {
    return {
      isValid: true,
      selector: '(rsyslog global)',
      actionType: 'rsyslog_global',
      target: 'Global configuration',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  if (fullLine.includes('include(')) {
    const includeMatch = fullLine.match(/include\(file="(?<filePath>[^"]+)"/);
    return {
      isValid: true,
      selector: '(rsyslog include)',
      actionType: 'rsyslog_include',
      target: includeMatch ? includeMatch.groups.filePath : 'unknown',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  if (fullLine.includes('input(type=')) {
    const inputMatch = fullLine.match(/input\(type="(?<inputType>[^"]+)"/);
    return {
      isValid: true,
      selector: '(rsyslog input)',
      actionType: 'rsyslog_input',
      target: inputMatch ? inputMatch.groups.inputType : 'unknown',
      isComplex: false,
      hasConditionals: false,
      isRsyslogDirective: true,
    };
  }

  return null;
};

/**
 * Match traditional syslog m4 macro constructs
 * @param {string} fullLine - The full rule line text
 * @returns {object|null} Processed display info or null if not an m4 construct
 */
const matchM4Construct = fullLine => {
  if (fullLine.trim() === ')' || fullLine.trim().startsWith(')')) {
    return {
      isValid: true,
      selector: '(m4 macro close)',
      actionType: 'm4_block_end',
      target: 'End ifdef block',
      isComplex: true,
      hasConditionals: true,
      isM4Construct: true,
    };
  }

  if (fullLine.includes('ifdef(') && fullLine.includes(', ,')) {
    return {
      isValid: true,
      selector: '(m4 macro start)',
      actionType: 'm4_block_start',
      target: 'Begin conditional block',
      isComplex: true,
      hasConditionals: true,
      isM4Construct: true,
    };
  }

  return null;
};

/**
 * Match special target patterns (omusrmsg, async file, ifdef constructs)
 * @param {object} rule - The parsed rule object
 * @param {string} target - The action target string
 * @param {string} fullLine - The full rule line text
 * @param {boolean} isMultiSelector - Whether the rule has multiple selectors
 * @returns {object|null} Processed display info or null if no special match
 */
const matchSpecialTarget = (rule, target, fullLine, isMultiSelector) => {
  if (target.startsWith(':omusrmsg:')) {
    const username = target.replace(':omusrmsg:', '');
    return {
      isValid: true,
      selector: rule.selector || '',
      actionType: username === '*' ? 'all_users' : 'user',
      target: username,
      isComplex: isMultiSelector,
      hasConditionals: false,
      isRsyslogDirective: true,
      originalRule: rule,
    };
  }

  if (target.startsWith('-/')) {
    return {
      isValid: true,
      selector: rule.selector || '',
      actionType: 'file_async',
      target: target.substring(1),
      isComplex: isMultiSelector,
      hasConditionals: false,
      isRsyslogDirective: true,
      originalRule: rule,
    };
  }

  if (fullLine.includes('ifdef(') && target.includes(',')) {
    const ifdefMatch = target.match(
      /ifdef\(`(?<condition>[^']+)', (?<trueAction>[^,]+), (?<falseAction>[^)]+)\)/
    );
    if (ifdefMatch) {
      const { condition, trueAction, falseAction } = ifdefMatch.groups;
      return {
        isValid: true,
        selector: rule.selector || '',
        actionType: 'conditional_choice',
        target: `IF ${condition}: ${trueAction.trim()} ELSE: ${falseAction.trim()}`,
        isComplex: true,
        hasConditionals: true,
        isM4Construct: true,
        originalRule: rule,
      };
    }
  }

  return null;
};

/**
 * Detect action type from target string content
 * @param {string} target - The action target string
 * @returns {object} Object with actionType and possibly modified target
 */
const detectActionType = target => {
  if (target.includes('ifdef(')) {
    return { actionType: 'conditional', target };
  }
  if (target.includes('/')) {
    return { actionType: 'file', target };
  }
  if (target.includes('@')) {
    return { actionType: 'remote_host', target: target.replace('@', '') };
  }
  if (target === '*') {
    return { actionType: 'all_users', target };
  }
  if (target.includes('`') && target.includes(',')) {
    return {
      actionType: 'multiple_users',
      target: target.replace(/`/g, '').replace(/'/g, ''),
    };
  }
  if (target.includes(',')) {
    return { actionType: 'multiple_users', target };
  }
  return { actionType: 'user', target };
};

/**
 * Enhanced rule processing for display - handles both syslog and rsyslog syntax
 * @param {object} rule - Parsed rule object from API
 * @returns {object} Processed rule display info
 */
export const processRuleDisplay = rule => {
  const fullLine = rule.full_line || '';

  const rsyslogMatch = matchRsyslogDirective(fullLine);
  if (rsyslogMatch) {
    return rsyslogMatch;
  }

  const m4Match = matchM4Construct(fullLine);
  if (m4Match) {
    return m4Match;
  }

  if (!rule.selector && !rule.action) {
    return {
      isValid: false,
      selector: '(empty)',
      actionType: 'malformed',
      target: '(incomplete)',
      isComplex: false,
      hasConditionals: false,
    };
  }

  const hasConditionals =
    fullLine.includes('ifdef(') || fullLine.includes('`') || rule.action?.includes('ifdef(');

  const isMultiSelector = rule.selector?.includes(';') || rule.selector?.includes(',');

  let actionType = rule.parsed?.action_type || 'unknown';
  let target = String(rule.parsed?.action_target || rule.action || '');

  const specialMatch = matchSpecialTarget(rule, target, fullLine, isMultiSelector);
  if (specialMatch) {
    return specialMatch;
  }

  if (actionType === 'unknown' || actionType === 'specific_users') {
    ({ actionType, target } = detectActionType(target));
  }

  return {
    isValid: true,
    selector: rule.selector || '',
    actionType,
    target,
    isComplex: isMultiSelector || hasConditionals,
    hasConditionals,
    isMultiSelector,
    originalRule: rule,
  };
};

/**
 * Get display info for an action type
 * @param {string} actionType - The action type identifier
 * @param {boolean} isComplex - Whether this is a complex rule
 * @returns {object} Display info { class, icon, text }
 */
export const getActionTypeDisplay = (actionType, isComplex) => {
  const baseClass = isComplex ? 'text-bg-warning' : '';

  switch (actionType) {
    case 'file':
      return {
        class: `${isComplex ? baseClass : 'text-bg-info'}`,
        icon: 'fa-file',
        text: 'File',
      };
    case 'file_async':
      return { class: `text-bg-info`, icon: 'fa-file', text: 'Async File' };
    case 'remote_host':
      return {
        class: `text-bg-warning`,
        icon: 'fa-server',
        text: 'Remote',
      };
    case 'all_users':
      return {
        class: `${isComplex ? baseClass : 'text-bg-danger'}`,
        icon: 'fa-users',
        text: 'All Users',
      };
    case 'user':
      return {
        class: `${isComplex ? baseClass : 'text-bg-primary'}`,
        icon: 'fa-user',
        text: 'User',
      };
    case 'multiple_users':
      return {
        class: `${isComplex ? baseClass : 'text-bg-primary'}`,
        icon: 'fa-users',
        text: 'Multi-User',
      };
    case 'conditional':
      return { class: 'text-bg-warning', icon: 'fa-code', text: 'Conditional' };
    case 'conditional_choice':
      return {
        class: 'text-bg-warning',
        icon: 'fa-code-branch',
        text: 'If/Else',
      };
    case 'm4_block_start':
      return { class: 'text-bg-info', icon: 'fa-play', text: 'Block Start' };
    case 'm4_block_end':
      return { class: 'text-bg-info', icon: 'fa-stop', text: 'Block End' };
    case 'rsyslog_module':
      return {
        class: 'text-bg-success',
        icon: 'fa-puzzle-piece',
        text: 'Module',
      };
    case 'rsyslog_global':
      return { class: 'text-bg-success', icon: 'fa-cogs', text: 'Global' };
    case 'rsyslog_include':
      return {
        class: 'text-bg-success',
        icon: 'fa-folder-open',
        text: 'Include',
      };
    case 'rsyslog_input':
      return {
        class: 'text-bg-success',
        icon: 'fa-sign-in-alt',
        text: 'Input',
      };
    case 'malformed':
      return {
        class: 'text-bg-secondary',
        icon: 'fa-question',
        text: 'Malformed',
      };
    default:
      return {
        class: 'text-bg-secondary',
        icon: 'fa-question',
        text: actionType || 'Unknown',
      };
  }
};
