import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmModal } from '../common';

import { getSeverityTagClass } from './FaultUtils';

const FaultTable = ({ faults, loading, onAction, onViewDetails }) => {
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState({});
  const [pendingAction, setPendingAction] = useState(null);

  const handleAction = async (fault, action, fmri = null) => {
    const key = `${fault.uuid}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));

    try {
      await onAction(fault.uuid, action, fmri);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const extractFmriFromAffects = affects => {
    // affects = "zfs://pool=Array-0 faulted but still in service"
    // Extract just the FMRI part before the status
    if (!affects) {
      return null;
    }
    return affects.split(/\s+/)[0]; // Returns "zfs://pool=Array-0"
  };

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }
    const fmri = extractFmriFromAffects(pendingAction.fault.details?.affects);
    handleAction(pendingAction.fault, pendingAction.action.key, fmri);
    setPendingAction(null);
  };

  const getSeverityIcon = severity => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <i className="fas fa-exclamation-circle text-danger" />;
      case 'major':
        return <i className="fas fa-exclamation-triangle text-warning" />;
      case 'minor':
        return <i className="fas fa-info-circle text-info" />;
      default:
        return <i className="fas fa-question-circle text-muted" />;
    }
  };

  const getSeverityTag = severity => (
    <span className={`badge ${getSeverityTagClass(severity)}`}>{severity}</span>
  );

  const getAvailableActions = () =>
    // Standard fault management actions
    [
      {
        key: 'acquit',
        label: t('host.faultTable.acquit'),
        icon: 'fa-check',
        class: 'btn-success',
        requiresConfirm: true,
      },
      {
        key: 'repaired',
        label: t('host.faultTable.markRepaired'),
        icon: 'fa-wrench',
        class: 'btn-info',
        requiresConfirm: true,
      },
      {
        key: 'replaced',
        label: t('host.faultTable.markReplaced'),
        icon: 'fa-exchange-alt',
        class: 'btn-warning',
        requiresConfirm: true,
      },
    ];
  const getFaultClass = msgId => {
    // Extract readable fault class from message ID
    if (msgId.startsWith('ZFS-')) {
      return t('host.faultTable.classZfs');
    }
    if (msgId.startsWith('FMD-')) {
      return t('host.faultTable.classFmd');
    }
    if (msgId.startsWith('CPU-')) {
      return t('host.faultTable.classCpu');
    }
    if (msgId.startsWith('MEM-')) {
      return t('host.faultTable.classMemory');
    }
    return msgId.split('-')[0] || t('host.faultTable.classUnknown');
  };

  if (loading && faults.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.faultTable.loading')}</p>
      </div>
    );
  }

  if (faults.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-check-circle fa-2x text-success" />
        <p className="mt-2 text-success">
          <strong>{t('host.faultTable.noData')}</strong>
        </p>
        <p className="small text-muted">{t('host.faultTable.systemOk')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>{t('host.faultTable.time')}</th>
              <th>{t('host.faultTable.severity')}</th>
              <th>{t('host.faultTable.class')}</th>
              <th>{t('host.faultTable.messageId')}</th>
              <th>{t('host.faultTable.uuid')}</th>
              <th width="280">{t('host.faultTable.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {faults.map((fault, index) => {
              const availableActions = getAvailableActions();

              return (
                <tr key={fault.uuid || index}>
                  <td>
                    <span className="small">{fault.time || t('host.faultTable.na')}</span>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      {getSeverityIcon(fault.severity)}
                      <span className="ms-2">{getSeverityTag(fault.severity)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge text-bg-secondary">{getFaultClass(fault.msgId)}</span>
                  </td>
                  <td>
                    <span className="font-monospace small fw-semibold">{fault.msgId}</span>
                  </td>
                  <td>
                    <span className="font-monospace small" title={fault.uuid}>
                      {fault.uuid ? `${fault.uuid.substring(0, 8)}...` : t('host.faultTable.na')}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      {/* Action Buttons */}
                      {availableActions.map(action => {
                        const key = `${fault.uuid}-${action.key}`;
                        const isLoading = actionLoading[key];

                        return (
                          <button
                            key={action.key}
                            type="button"
                            className={`btn btn-sm ${action.class}`}
                            onClick={() => {
                              if (action.requiresConfirm) {
                                setPendingAction({ fault, action });
                              } else {
                                const fmri = extractFmriFromAffects(fault.details?.affects);
                                handleAction(fault, action.key, fmri);
                              }
                            }}
                            disabled={loading || isLoading}
                            title={action.label}
                          >
                            {isLoading ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              />
                            ) : (
                              <i className={`fas ${action.icon}`} />
                            )}
                          </button>
                        );
                      })}

                      {/* View Details Button */}
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => onViewDetails(fault)}
                        disabled={loading}
                        title={t('host.faultTable.viewDetails')}
                      >
                        <i className="fas fa-info-circle" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingAction && (
        <ConfirmModal
          isOpen
          onClose={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
          title={t('host.faultTable.confirmTitle', { action: pendingAction.action.label })}
          message={t('host.faultTable.confirmMessage', {
            action: pendingAction.action.label.toLowerCase(),
          })}
          confirmText={pendingAction.action.label}
          confirmVariant="warning"
          icon="fas fa-exclamation-triangle"
        />
      )}
    </>
  );
};

FaultTable.propTypes = {
  faults: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default FaultTable;
