import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useServers } from '../contexts/ServerContext';
import { copyText } from '../utils/clipboard';

import { ConfirmModal, ContentModal } from './common';

const ApiKeysTab = () => {
  const { t } = useTranslation();
  const { getApiKeys, generateApiKey, deleteApiKey, bootstrapApiKey } = useServers();
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleteKeyId, setDeleteKeyId] = useState(null);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    const result = await getApiKeys();
    if (result.success) {
      setApiKeys(result.data.entities);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [getApiKeys]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleGenerateKey = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setGeneratedKey(null);

    const result = await generateApiKey(newKeyName, newKeyDescription);
    if (result.success) {
      setGeneratedKey(result.data.api_key);
      setMessage(t('accounts.apiKeysTab.keyGeneratedMessage'));
      setNewKeyName('');
      setNewKeyDescription('');
      loadApiKeys();
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleBootstrapKey = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setGeneratedKey(null);

    const result = await bootstrapApiKey();
    if (result.success) {
      setGeneratedKey(result.data.api_key);
      setMessage(t('accounts.apiKeysTab.bootstrapKeyGeneratedMessage'));
      loadApiKeys();
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleDeleteKey = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    const result = await deleteApiKey(deleteKeyId);
    if (result.success) {
      setMessage(t('accounts.apiKeysTab.keyDeletedMessage'));
      loadApiKeys();
    } else {
      setError(result.message);
    }
    setDeleteKeyId(null);
    setLoading(false);
  };

  return (
    <div>
      <ConfirmModal
        isOpen={deleteKeyId !== null}
        onClose={() => setDeleteKeyId(null)}
        onConfirm={handleDeleteKey}
        title={t('accounts.apiKeysTab.deleteKeyTitle')}
        message={t('accounts.apiKeysTab.deleteKeyMessage')}
        confirmText={t('accounts.apiKeysTab.deleteKeyButton')}
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={loading}
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <ContentModal
        isOpen={!!generatedKey}
        onClose={() => setGeneratedKey(null)}
        title={t('accounts.apiKeysTab.keyGeneratedTitle')}
        icon="fas fa-key"
      >
        <div className="alert alert-warning">
          <p>
            <strong>{t('accounts.apiKeysTab.importantLabel')}:</strong>{' '}
            {t('accounts.apiKeysTab.copyKeyWarning')}
          </p>
        </div>
        <div className="mb-3">
          <label htmlFor="generated-api-key" className="form-label">
            {t('accounts.apiKeysTab.yourApiKeyLabel')}
          </label>
          <textarea
            id="generated-api-key"
            className="form-control font-monospace"
            value={generatedKey || ''}
            readOnly
            rows="3"
            onClick={e => e.target.select()}
          />
        </div>
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const copied = await copyText(generatedKey);
              setMessage(
                copied
                  ? t('accounts.apiKeysTab.copiedMessage')
                  : t('accounts.apiKeysTab.copyFailedMessage')
              );
            }}
          >
            <i className="fas fa-copy me-2" />
            {t('accounts.apiKeysTab.copyToClipboardButton')}
          </button>
        </div>
      </ContentModal>

      <div className="card">
        <div className="card-body">
          <h4 className="fs-4 fw-bold">{t('accounts.apiKeysTab.generateNewKeyTitle')}</h4>
          <form onSubmit={handleGenerateKey}>
            <div className="mb-3">
              <label htmlFor="api-key-name" className="form-label">
                {t('accounts.apiKeysTab.labelName')}
              </label>
              <input
                id="api-key-name"
                className="form-control"
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder={t('accounts.apiKeysTab.namePlaceholder')}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="api-key-description" className="form-label">
                {t('accounts.apiKeysTab.labelDescription')}
              </label>
              <input
                id="api-key-description"
                className="form-control"
                type="text"
                value={newKeyDescription}
                onChange={e => setNewKeyDescription(e.target.value)}
                placeholder={t('accounts.apiKeysTab.descriptionPlaceholder')}
              />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? t('accounts.apiKeysTab.generatingButton')
                  : t('accounts.apiKeysTab.generateKeyButton')}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleBootstrapKey}
                disabled={loading}
              >
                {t('accounts.apiKeysTab.generateBootstrapKeyButton')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h4 className="fs-4 fw-bold">{t('accounts.apiKeysTab.existingKeysTitle')}</h4>
          {loading && <p>{t('accounts.apiKeysTab.loadingKeys')}</p>}
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>{t('accounts.apiKeysTab.columnName')}</th>
                  <th>{t('accounts.apiKeysTab.columnDescription')}</th>
                  <th>{t('accounts.apiKeysTab.columnActive')}</th>
                  <th>{t('accounts.apiKeysTab.columnLastUsed')}</th>
                  <th>{t('accounts.apiKeysTab.columnCreatedAt')}</th>
                  <th>{t('accounts.apiKeysTab.columnActions')}</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id}>
                    <td>{key.name}</td>
                    <td>{key.description}</td>
                    <td>
                      <span
                        className={`badge ${key.is_active ? 'text-bg-success' : 'text-bg-danger'}`}
                      >
                        {key.is_active
                          ? t('accounts.apiKeysTab.statusYes')
                          : t('accounts.apiKeysTab.statusNo')}
                      </span>
                    </td>
                    <td>
                      {key.last_used
                        ? new Date(key.last_used).toLocaleString()
                        : t('accounts.apiKeysTab.never')}
                    </td>
                    <td>{new Date(key.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteKeyId(key.id)}
                        disabled={loading}
                      >
                        <i className="fas fa-trash me-2" />
                        {t('accounts.apiKeysTab.deleteKeyTableButton')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeysTab;
