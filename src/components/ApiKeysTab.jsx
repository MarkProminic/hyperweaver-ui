import { useState, useEffect, useCallback } from 'react';

import { useServers } from '../contexts/ServerContext';

import { ConfirmModal, ContentModal } from './common';

const ApiKeysTab = () => {
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
      setMessage(
        'API Key generated successfully. Please copy it now, you will not be able to see it again.'
      );
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
      setMessage('Bootstrap API Key generated successfully. Please copy it now.');
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
      setMessage('API Key deleted successfully.');
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
        title="Delete API Key"
        message="Are you sure you want to delete this API key? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={loading}
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <ContentModal
        isOpen={!!generatedKey}
        onClose={() => setGeneratedKey(null)}
        title="API Key Generated"
        icon="fas fa-key"
      >
        <div className="alert alert-warning">
          <p>
            <strong>Important:</strong> Please copy this API key now. You will not be able to see it
            again after closing this dialog.
          </p>
        </div>
        <div className="mb-3">
          <label htmlFor="generated-api-key" className="form-label">
            Your API Key:
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
            onClick={() => {
              navigator.clipboard.writeText(generatedKey);
              setMessage('API key copied to clipboard!');
            }}
          >
            <i className="fas fa-copy me-2" />
            Copy to Clipboard
          </button>
        </div>
      </ContentModal>

      <div className="card">
        <div className="card-body">
          <h4 className="fs-4 fw-bold">Generate New API Key</h4>
          <form onSubmit={handleGenerateKey}>
            <div className="mb-3">
              <label htmlFor="api-key-name" className="form-label">
                Name
              </label>
              <input
                id="api-key-name"
                className="form-control"
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g., My-App"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="api-key-description" className="form-label">
                Description
              </label>
              <input
                id="api-key-description"
                className="form-control"
                type="text"
                value={newKeyDescription}
                onChange={e => setNewKeyDescription(e.target.value)}
                placeholder="e.g., API access for my application"
              />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Key'}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleBootstrapKey}
                disabled={loading}
              >
                Generate Bootstrap Key
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h4 className="fs-4 fw-bold">Existing API Keys</h4>
          {loading && <p>Loading keys...</p>}
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Active</th>
                  <th>Last Used</th>
                  <th>Created At</th>
                  <th>Actions</th>
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
                        {key.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{key.last_used ? new Date(key.last_used).toLocaleString() : 'Never'}</td>
                    <td>{new Date(key.created_at).toLocaleString()}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setGeneratedKey(key.api_key);
                          }}
                        >
                          <i className="fas fa-eye me-2" />
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteKeyId(key.id)}
                          disabled={loading}
                        >
                          <i className="fas fa-trash me-2" />
                          Delete
                        </button>
                      </div>
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
