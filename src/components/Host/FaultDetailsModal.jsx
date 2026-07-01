import PropTypes from 'prop-types';

import { ContentModal } from '../common';

import { getSeverityTagClass } from './FaultUtils';

const FaultDetailsModal = ({ fault, onClose }) => (
  <ContentModal isOpen onClose={onClose} title="Fault Details" icon="fas fa-exclamation-triangle">
    {/* Complete Fault Information */}
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">Fault Information</h3>
        <div className="table-responsive">
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <strong>UUID</strong>
                </td>
                <td className="font-monospace">{fault.uuid}</td>
              </tr>
              <tr>
                <td>
                  <strong>Message ID</strong>
                </td>
                <td>
                  <span className="font-monospace fw-semibold">{fault.msgId}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Severity</strong>
                </td>
                <td>
                  <span className={`badge ${getSeverityTagClass(fault.severity)}`}>
                    {fault.severity}
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Time</strong>
                </td>
                <td>{fault.time || 'N/A'}</td>
              </tr>
              {fault.details?.host && (
                <tr>
                  <td>
                    <strong>Host</strong>
                  </td>
                  <td className="font-monospace">{fault.details.host}</td>
                </tr>
              )}
              {fault.details?.platform && (
                <tr>
                  <td>
                    <strong>Platform</strong>
                  </td>
                  <td className="font-monospace">{fault.details.platform}</td>
                </tr>
              )}
              {fault.details?.faultClass && (
                <tr>
                  <td>
                    <strong>Fault Class</strong>
                  </td>
                  <td className="font-monospace">{fault.details.faultClass}</td>
                </tr>
              )}
              {fault.details?.affects && (
                <tr>
                  <td>
                    <strong>Affects</strong>
                  </td>
                  <td className="font-monospace">{fault.details.affects}</td>
                </tr>
              )}
              {fault.details?.problemIn && (
                <tr>
                  <td>
                    <strong>Problem In</strong>
                  </td>
                  <td className="font-monospace">{fault.details.problemIn}</td>
                </tr>
              )}
              {fault.details?.description && (
                <tr>
                  <td>
                    <strong>Description</strong>
                  </td>
                  <td>{fault.details.description}</td>
                </tr>
              )}
              {fault.details?.response && (
                <tr>
                  <td>
                    <strong>Response</strong>
                  </td>
                  <td className="small text-muted">{fault.details.response}</td>
                </tr>
              )}
              {fault.details?.impact && (
                <tr>
                  <td>
                    <strong>Impact</strong>
                  </td>
                  <td>
                    <span className="fw-semibold text-danger">{fault.details.impact}</span>
                  </td>
                </tr>
              )}
              {fault.details?.action && (
                <tr>
                  <td>
                    <strong>Recommended Action</strong>
                  </td>
                  <td>
                    <div>
                      <div className="alert alert-info">{fault.details.action}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Raw Output Display */}
    {fault.raw_output && (
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Detailed Output</h3>
          <div>
            <pre
              className="card bg-dark text-light p-4 small"
              style={{ maxHeight: '400px', overflow: 'auto' }}
            >
              {fault.raw_output}
            </pre>
          </div>
        </div>
      </div>
    )}

    {/* Show message if no details available */}
    {!fault.details && (
      <div className="alert alert-info">
        <p>No detailed information available for this fault.</p>
      </div>
    )}
  </ContentModal>
);

FaultDetailsModal.propTypes = {
  fault: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FaultDetailsModal;
