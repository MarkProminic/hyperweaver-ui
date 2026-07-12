import PropTypes from 'prop-types';

/**
 * Resource-validation rendering (catalog §3), shared by create/clone/modify:
 * - A 400 "Insufficient resources" answer carries details[] — each entry
 *   {resource: storage|memory|cpu, message}; render per-entry message with a
 *   resource icon, as a BLOCKING danger list.
 * - A success answer may carry resource_warnings[] — {resource, level:
 *   warning|critical, message, projected_percent}; render as a NON-blocking
 *   banner.
 * makeAgentRequest failures carry the agent's raw body in result.data, so
 * the details live at result.data.details.
 */

const RESOURCE_ICONS = {
  storage: 'fas fa-hdd',
  memory: 'fas fa-memory',
  cpu: 'fas fa-microchip',
};

const iconFor = resource => RESOURCE_ICONS[resource] || 'fas fa-exclamation-circle';

/** details[] from a failed makeAgentRequest result, [] when none. */
export const validationDetails = result =>
  Array.isArray(result?.data?.details) ? result.data.details : [];

/** resource_warnings[] from a success body, [] when none. */
export const resourceWarnings = data =>
  Array.isArray(data?.resource_warnings) ? data.resource_warnings : [];

/** Blocking list for a 400 Insufficient-resources answer. */
export const ResourceIssueList = ({ details }) => (
  <div className="alert alert-danger py-2">
    <strong>Insufficient resources</strong>
    <ul className="mb-0 mt-1 list-unstyled">
      {details.map(detail => (
        <li key={`${detail.resource || 'issue'}:${detail.message}`}>
          <i className={`${iconFor(detail.resource)} me-2`} />
          {detail.message}
        </li>
      ))}
    </ul>
  </div>
);

ResourceIssueList.propTypes = {
  details: PropTypes.array.isRequired,
};

/** Non-blocking banner for resource_warnings[] on a success answer. */
export const ResourceWarningBanner = ({ warnings, onDismiss }) => (
  <div
    className={`alert ${warnings.some(warning => warning.level === 'critical') ? 'alert-danger' : 'alert-warning'} py-2 d-flex justify-content-between align-items-start`}
  >
    <div>
      <strong>Resource pressure</strong>
      <ul className="mb-0 mt-1 list-unstyled">
        {warnings.map(warning => (
          <li key={`${warning.resource || 'warning'}:${warning.message}`}>
            <i className={`${iconFor(warning.resource)} me-2`} />
            {warning.message}
            {warning.projected_percent !== null && warning.projected_percent !== undefined && (
              <span className="text-muted small ms-1">
                (projected {warning.projected_percent}%)
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
    {onDismiss && (
      <button type="button" className="btn-close" aria-label="Dismiss" onClick={onDismiss} />
    )}
  </div>
);

ResourceWarningBanner.propTypes = {
  warnings: PropTypes.array.isRequired,
  onDismiss: PropTypes.func,
};
