import axios from 'axios';
import PropTypes from 'prop-types';
import { useState } from 'react';

import { ContentModal } from '../common';

const BackupManager = ({
  backups,
  setBackups,
  showBackupModal,
  setShowBackupModal,
  setMsg,
  onBackupRestore,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/backups');

      if (response.data.success) {
        setBackups(response.data.backups);
      } else {
        setMsg(`Failed to load backups: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      setMsg(`Error loading backups: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreFromBackup = backupFilename => {
    setConfirmDialog({
      type: 'restore',
      filename: backupFilename,
      message: `Are you sure you want to restore settings from backup "${backupFilename}"? Current settings will be lost.`,
    });
  };

  const handleConfirmRestore = async () => {
    const backupFilename = confirmDialog.filename;
    setConfirmDialog(null);

    try {
      setLoading(true);
      setMsg(`Restoring settings from backup ${backupFilename}...`);

      const response = await axios.post(`/api/settings/restore/${backupFilename}`);

      if (response.data.success) {
        setMsg('Settings restored successfully. Page will reload...');
        setTimeout(() => {
          if (onBackupRestore) {
            onBackupRestore();
          }
          window.location.reload();
        }, 1000);
      } else {
        setMsg(`Failed to restore backup: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setMsg(`Error restoring backup: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = backupFilename => {
    setConfirmDialog({
      type: 'delete',
      filename: backupFilename,
      message: `Are you sure you want to delete backup "${backupFilename}"? This cannot be undone.`,
    });
  };

  const handleConfirmDelete = async () => {
    const backupFilename = confirmDialog.filename;
    setConfirmDialog(null);

    try {
      setLoading(true);
      setMsg(`Deleting backup ${backupFilename}...`);

      const response = await axios.delete(`/api/settings/backups/${backupFilename}`);

      if (response.data.success) {
        setMsg('Backup deleted successfully.');
        await loadBackups();
      } else {
        setMsg(`Failed to delete backup: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      setMsg(`Error deleting backup: ${error.response?.data?.message || error.message}`);
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
          title="Configuration Backups"
          icon="fas fa-history"
        >
          {backups.length === 0 ? (
            <p className="text-muted">No backups available</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
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
                            Restore
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm w-100"
                            onClick={() => deleteBackup(backup.filename)}
                            disabled={loading}
                          >
                            Delete
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
          title="Confirm Action"
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
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.type === 'delete' ? 'btn-danger' : 'btn-warning'}`}
                onClick={handleConfirm}
                disabled={loading}
              >
                {confirmDialog.type === 'delete' ? 'Delete' : 'Restore'}
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
