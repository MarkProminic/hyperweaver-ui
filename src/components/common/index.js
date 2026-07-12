/**
 * Common reusable components
 *
 * These components are designed to be used across the entire application
 * and provide consistent behavior, styling, and accessibility features.
 */

// Modal Components
export { default as ContentModal } from './ContentModal';
export { default as FormModal } from './FormModal';
export { default as ConfirmModal } from './ConfirmModal';

// Notification alert: X + 15s auto-dismiss (never for interactive prompts)
export { default as DismissibleAlert } from './DismissibleAlert';

// Agent-host path picking (file-browser token)
export { PathPickerModal, PathInput } from './PathPicker';

// Password input with show/hide reveal (Mark's blanket ruling)
export { default as RevealInput } from './RevealInput';

// Resource-validation rendering (catalog §3) — shared by create/clone/modify
export {
  ResourceIssueList,
  ResourceWarningBanner,
  validationDetails,
  resourceWarnings,
} from './ResourceIssues';
