import axios from 'axios';
import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ContentModal } from '../common';

const BackupManager = ({
  backups,
  setBackups,
  showBackupModal,
  setShowBackupModal,
  setMsg,
  onBackupRestore,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/backups');

      if (response.data.success) {
        setBackups(response.data.backups);
      } else {
        setMsg({
          text: t('settings.backupManager.failedToLoad', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      setMsg({
        text: t('settings.backupManager.errorLoading', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreFromBackup = backupFilename => {
    setConfirmDialog({
      type: 'restore',
      filename: backupFilename,
      message: t('settings.backupManager.restoreConfirm', { filename: backupFilename }),
    });
  };

  const handleConfirmRestore = async () => {
    const backupFilename = confirmDialog.filename;
    setConfirmDialog(null);

    try {
      setLoading(true);
      setMsg({
        text: t('settings.backupManager.restoring', { filename: backupFilename }),
        variant: 'info',
      });

      const response = await axios.post(`/api/settings/restore/${backupFilename}`);

      if (response.data.success) {
        setMsg({ text: t('settings.backupManager.restoreSuccess'), variant: 'success' });
        setTimeout(() => {
          if (onBackupRestore) {
            onBackupRestore();
          }
          window.location.reload();
        }, 1000);
      } else {
        setMsg({
          text: t('settings.backupManager.failedToRestore', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setMsg({
        text: t('settings.backupManager.errorRestoring', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = backupFilename => {
    setConfirmDialog({
      type: 'delete',
      filename: backupFilename,
      message: t('settings.backupManager.deleteConfirm', { filename: backupFilename }),
    });
  };

  const handleConfirmDelete = async () => {
    const backupFilename = confirmDialog.filename;
    setConfirmDialog(null);

    try {
      setLoading(true);
      setMsg({
        text: t('settings.backupManager.deleting', { filename: backupFilename }),
        variant: 'info',
      });

      const response = await axios.delete(`/api/settings/backups/${backupFilename}`);

      if (response.data.success) {
        setMsg({ text: t('settings.backupManager.deleteSuccess'), variant: 'success' });
        await loadBackups();
      } else {
        setMsg({
          text: t('settings.backupManager.failedToDelete', { message: response.data.message }),
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      setMsg({
        text: t('settings.backupManager.errorDeleting', {
          error: error.response?.data?.message || error.message,
        }),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmDialog(null);
  };

  const handleConfirm = () => {
    if (confirmDialog.type === 'restore') {
      handleConfirmRestore();
    } else if (confirmDialog.type === 'delete') {
      handleConfirmDelete();
    }
  };

  return (
    <>
      {/* Backup List Modal */}
      {showBackupModal && (
        <ContentModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          title={t('settings.backupManager.backupsTitle')}
          icon="fas fa-history"
        >
          {backups.length === 0 ? (
            <p className="text-muted">{t('settings.backupManager.noBackups')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>{t('settings.backupManager.filename')}</th>
                    <th>{t('settings.backupManager.created')}</th>
                    <th className="text-end">{t('settings.backupManager.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(backup => (
                    <tr key={backup.filename}>
                      <td>
                        <code className="small">{backup.filename}</code>
                      </td>
                      <td>{new Date(backup.created).toLocaleString()}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-warning btn-sm w-100"
                            onClick={() => {
                              restoreFromBackup(backup.filename);
                              setShowBackupModal(false);
                            }}
                            disabled={loading}
                          >
                            {t('settings.backupManager.restore')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm w-100"
                            onClick={() => deleteBackup(backup.filename)}
                            disabled={loading}
                          >
                            {t('settings.backupManager.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentModal>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <ContentModal
          isOpen={Boolean(confirmDialog)}
          onClose={handleCancelConfirm}
          title={t('settings.backupManager.confirmActionTitle')}
          icon="fas fa-exclamation-triangle"
        >
          <div>
            <p>{confirmDialog.message}</p>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelConfirm}
                disabled={loading}
              >
                {t('settings.backupManager.cancel')}
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.type === 'delete' ? 'btn-danger' : 'btn-warning'}`}
                onClick={handleConfirm}
                disabled={loading}
              >
                {confirmDialog.type === 'delete'
                  ? t('settings.backupManager.delete')
                  : t('settings.backupManager.restore')}
              </button>
            </div>
          </div>
        </ContentModal>
      )}
    </>
  );
};

BackupManager.propTypes = {
  backups: PropTypes.array.isRequired,
  setBackups: PropTypes.func.isRequired,
  showBackupModal: PropTypes.bool.isRequired,
  setShowBackupModal: PropTypes.func.isRequired,
  setMsg: PropTypes.func.isRequired,
  onBackupRestore: PropTypes.func,
};

export default BackupManager;
