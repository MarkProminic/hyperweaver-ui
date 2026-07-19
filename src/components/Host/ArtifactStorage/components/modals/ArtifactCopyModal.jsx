import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../../../../../contexts/ServerContext';
import FormModal from '../../../../common/FormModal';

const ArtifactCopyModal = ({ server, artifact, storagePaths, onClose, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [destinationStoragePathId, setDestinationStoragePathId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { makeAgentRequest } = useServers();

  const availableStoragePaths = storagePaths.filter(
    path => path.enabled && path.id !== artifact.storage_location.id
  );

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!destinationStoragePathId) {
      setError(t('artifacts.artifactCopyModal.selectDestinationError'));
      return;
    }

    try {
      setLoading(true);

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        `artifacts/${artifact.id}/copy`,
        'POST',
        {
          destination_storage_location_id: destinationStoragePathId,
        }
      );

      if (result.success) {
        onSuccess(result);
      } else {
        onError(result.message || 'Failed to copy artifact');
      }
    } catch (err) {
      onError(`Error copying artifact: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('artifacts.artifactCopyModal.title')}
      icon="fas fa-copy"
      submitText={t('artifacts.artifactCopyModal.submitButton')}
      submitVariant="is-primary"
      loading={loading}
      showCancelButton
    >
      {error && (
        <div className="alert alert-danger">
          <button type="button" className="btn-close" onClick={() => setError('')} />
          {error}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="copy-artifact-name" className="form-label">
          {t('artifacts.artifactCopyModal.artifactLabel')}
        </label>
        <input
          id="copy-artifact-name"
          className="form-control"
          type="text"
          value={artifact.filename}
          readOnly
        />
      </div>

      <div className="mb-3">
        <label htmlFor="copy-current-location" className="form-label">
          {t('artifacts.artifactCopyModal.currentLocationLabel')}
        </label>
        <input
          id="copy-current-location"
          className="form-control"
          type="text"
          value={`${artifact.storage_location.name} (${artifact.storage_location.path})`}
          readOnly
        />
      </div>

      <div className="mb-3">
        <label htmlFor="copy-destination-location" className="form-label">
          {t('artifacts.artifactCopyModal.destinationLocationLabel')}
        </label>
        <select
          id="copy-destination-location"
          className="form-select"
          value={destinationStoragePathId}
          onChange={e => setDestinationStoragePathId(e.target.value)}
          disabled={loading}
        >
          <option value="">{t('artifacts.artifactCopyModal.selectDestination')}</option>
          {availableStoragePaths.map(path => (
            <option key={path.id} value={path.id}>
              {path.name} ({path.path})
            </option>
          ))}
        </select>
      </div>
    </FormModal>
  );
};

ArtifactCopyModal.propTypes = {
  server: PropTypes.object.isRequired,
  artifact: PropTypes.object.isRequired,
  storagePaths: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default ArtifactCopyModal;
