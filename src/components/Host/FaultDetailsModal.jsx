import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

import { getSeverityTagClass } from './FaultUtils';

const FaultDetailsModal = ({ fault, onClose }) => {
  const { t } = useTranslation();

  return (
    <ContentModal
      isOpen
      onClose={onClose}
      title={t('host.faultDetailsModal.title')}
      icon="fas fa-exclamation-triangle"
    >
      {/* Complete Fault Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">{t('host.faultDetailsModal.faultInfo')}</h3>
          <div className="table-responsive">
            <table className="table">
              <tbody>
                <tr>
                  <td>
                    <strong>{t('host.faultDetailsModal.uuid')}</strong>
                  </td>
                  <td className="font-monospace">{fault.uuid}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.faultDetailsModal.messageId')}</strong>
                  </td>
                  <td>
                    <span className="font-monospace fw-semibold">{fault.msgId}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.faultDetailsModal.severity')}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getSeverityTagClass(fault.severity)}`}>
                      {fault.severity}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('host.faultDetailsModal.time')}</strong>
                  </td>
                  <td>{fault.time || t('host.faultDetailsModal.na')}</td>
                </tr>
                {fault.details?.host && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.host')}</strong>
                    </td>
                    <td className="font-monospace">{fault.details.host}</td>
                  </tr>
                )}
                {fault.details?.platform && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.platform')}</strong>
                    </td>
                    <td className="font-monospace">{fault.details.platform}</td>
                  </tr>
                )}
                {fault.details?.faultClass && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.faultClass')}</strong>
                    </td>
                    <td className="font-monospace">{fault.details.faultClass}</td>
                  </tr>
                )}
                {fault.details?.affects && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.affects')}</strong>
                    </td>
                    <td className="font-monospace">{fault.details.affects}</td>
                  </tr>
                )}
                {fault.details?.problemIn && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.problemIn')}</strong>
                    </td>
                    <td className="font-monospace">{fault.details.problemIn}</td>
                  </tr>
                )}
                {fault.details?.description && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.description')}</strong>
                    </td>
                    <td>{fault.details.description}</td>
                  </tr>
                )}
                {fault.details?.response && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.response')}</strong>
                    </td>
                    <td className="small text-muted">{fault.details.response}</td>
                  </tr>
                )}
                {fault.details?.impact && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.impact')}</strong>
                    </td>
                    <td>
                      <span className="fw-semibold text-danger">{fault.details.impact}</span>
                    </td>
                  </tr>
                )}
                {fault.details?.action && (
                  <tr>
                    <td>
                      <strong>{t('host.faultDetailsModal.recommendedAction')}</strong>
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
            <h3 className="fs-6 fw-bold">{t('host.faultDetailsModal.detailedOutput')}</h3>
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
          <p>{t('host.faultDetailsModal.noDetails')}</p>
        </div>
      )}
    </ContentModal>
  );
};

FaultDetailsModal.propTypes = {
  fault: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FaultDetailsModal;
