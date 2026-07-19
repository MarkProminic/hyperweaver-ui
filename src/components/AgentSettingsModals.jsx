import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { ContentModal, FormModal } from './common';

/**
 * Configuration backups list modal — restore/delete per backup file.
 */
export const AgentSettingsBackupModal = ({
  isOpen,
  onClose,
  backups,
  loading,
  onRestore,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <ContentModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('agentSettings.agentSettingsModals.configurationBackupsTitle')}
      icon="fas fa-history"
    >
      {backups.length === 0 ? (
        <p className="text-muted">{t('agentSettings.agentSettingsModals.noBackupsAvailable')}</p>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>{t('agentSettings.agentSettingsModals.filenameHeader')}</th>
              <th>{t('agentSettings.agentSettingsModals.createdHeader')}</th>
              <th className="text-end">{t('agentSettings.agentSettingsModals.actionsHeader')}</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(backup => (
              <tr key={backup.filename}>
                <td>{backup.filename}</td>
                <td>{new Date(backup.createdAt).toLocaleString()}</td>
                <td className="text-end">
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-warning w-100"
                      onClick={() => onRestore(backup.filename)}
                      disabled={loading}
                    >
                      {t('agentSettings.agentSettingsModals.restoreButton')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger w-100"
                      onClick={() => onDelete(backup.filename)}
                      disabled={loading}
                    >
                      {t('agentSettings.agentSettingsModals.deleteButton')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ContentModal>
  );
};

AgentSettingsBackupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  backups: PropTypes.arrayOf(
    PropTypes.shape({
      filename: PropTypes.string,
      createdAt: PropTypes.string,
    })
  ).isRequired,
  loading: PropTypes.bool,
  onRestore: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * Shared confirmation dialog (restore/delete backup, agent restart) — driven by the
 * shell's confirmDialog state object.
 */
export const AgentSettingsConfirmModal = ({ confirmDialog, loading, onClose }) => (
  <FormModal
    isOpen={confirmDialog.isOpen}
    onClose={onClose}
    onSubmit={e => {
      e.preventDefault();
      if (confirmDialog.onConfirm) {
        confirmDialog.onConfirm();
      }
    }}
    title={confirmDialog.title}
    submitText={confirmDialog.confirmText}
    submitVariant={confirmDialog.variant}
    loading={loading}
    showCancelButton
  >
    <p>{confirmDialog.message}</p>
  </FormModal>
);

AgentSettingsConfirmModal.propTypes = {
  confirmDialog: PropTypes.shape({
    isOpen: PropTypes.bool,
    title: PropTypes.string,
    message: PropTypes.string,
    onConfirm: PropTypes.func,
    confirmText: PropTypes.string,
    variant: PropTypes.string,
  }).isRequired,
  loading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};
