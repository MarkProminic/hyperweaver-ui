import PropTypes from 'prop-types';
import { useRef, useState } from 'react';

import { useServers } from '../../contexts/ServerContext';
import { FormModal } from '../common';

const AddRepositoryModal = ({ server, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const mirrorIdCounter = useRef(1);
  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    mirrors: [{ id: 0, url: '' }],
    enabled: true,
    sticky: false,
    searchFirst: false,
    searchBefore: '',
    searchAfter: '',
    sslCert: '',
    sslKey: '',
    proxy: '',
  });

  const { makeAgentRequest } = useServers();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMirrorChange = (id, value) => {
    setFormData(prev => ({
      ...prev,
      mirrors: prev.mirrors.map(m => (m.id === id ? { ...m, url: value } : m)),
    }));
  };

  const addMirror = () => {
    const nextId = mirrorIdCounter.current;
    mirrorIdCounter.current += 1;
    setFormData(prev => ({
      ...prev,
      mirrors: [...prev.mirrors, { id: nextId, url: '' }],
    }));
  };

  const removeMirror = id => {
    if (formData.mirrors.length > 1) {
      setFormData(prev => ({
        ...prev,
        mirrors: prev.mirrors.filter(m => m.id !== id),
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.origin.trim()) {
      onError('Publisher name and origin URL are required');
      return;
    }

    try {
      setLoading(true);
      onError('');

      // Filter out empty mirrors
      const validMirrors = formData.mirrors.map(m => m.url.trim()).filter(Boolean);

      const requestData = {
        name: formData.name.trim(),
        origin: formData.origin.trim(),
        mirrors: validMirrors,
        enabled: formData.enabled,
        sticky: formData.sticky,
        search_first: formData.searchFirst,
      };

      // Add optional fields only if they have values
      if (formData.searchBefore.trim()) {
        requestData.search_before = formData.searchBefore.trim();
      }
      if (formData.searchAfter.trim()) {
        requestData.search_after = formData.searchAfter.trim();
      }
      if (formData.sslCert.trim()) {
        requestData.ssl_cert = formData.sslCert.trim();
      }
      if (formData.sslKey.trim()) {
        requestData.ssl_key = formData.sslKey.trim();
      }
      if (formData.proxy.trim()) {
        requestData.proxy = formData.proxy.trim();
      }

      const result = await makeAgentRequest(
        server.hostname,
        server.port,
        server.protocol,
        'system/repositories',
        'POST',
        requestData
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Failed to add repository');
      }
    } catch (err) {
      onError(`Error adding repository: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Add Repository"
      icon="fas fa-plus-circle"
      submitText="Add Repository"
      submitIcon="fas fa-plus"
      submitVariant="is-success"
      loading={loading}
    >
      {/* Basic Information */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Basic Information</h3>

          <div className="mb-3">
            <label htmlFor="repo-publisher-name" className="form-label">
              Publisher Name *
            </label>
            <input
              id="repo-publisher-name"
              className="form-control"
              type="text"
              placeholder="e.g., omnios, extra.omnios"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              required
            />
            <p className="form-text text-muted">The name of the package publisher</p>
          </div>

          <div className="mb-3">
            <label htmlFor="repo-origin-url" className="form-label">
              Origin URL *
            </label>
            <input
              id="repo-origin-url"
              className="form-control"
              type="url"
              placeholder="https://pkg.omnios.org/r151050/core/"
              value={formData.origin}
              onChange={e => handleInputChange('origin', e.target.value)}
              required
            />
            <p className="form-text text-muted">The primary repository URL</p>
          </div>
        </div>
      </div>

      {/* Mirror URLs */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Mirror URLs (Optional)</h3>

          {formData.mirrors.map(mirror => (
            <div key={mirror.id} className="input-group mb-3">
              <input
                className="form-control"
                type="url"
                placeholder="https://mirror.example.com/repository/"
                value={mirror.url}
                onChange={e => handleMirrorChange(mirror.id, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeMirror(mirror.id)}
                disabled={formData.mirrors.length === 1}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-info" onClick={addMirror}>
            <i className="fas fa-plus me-2" />
            <span>Add Mirror</span>
          </button>
        </div>
      </div>

      {/* Repository Options */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">Repository Options</h3>

          <div className="row g-3">
            <div className="col">
              <div className="mb-3">
                <div className="form-check">
                  <input
                    id="repo-enabled"
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={e => handleInputChange('enabled', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="repo-enabled">
                    <strong>Enabled</strong> - Repository is active for package operations
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    id="repo-sticky"
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.sticky}
                    onChange={e => handleInputChange('sticky', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="repo-sticky">
                    <strong>Sticky</strong> - Prefer packages from this publisher
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    id="repo-search-first"
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.searchFirst}
                    onChange={e => handleInputChange('searchFirst', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="repo-search-first">
                    <strong>Search First</strong> - Search this repository first
                  </label>
                </div>
              </div>
            </div>

            <div className="col">
              <div className="mb-3">
                <label htmlFor="repo-search-before" className="form-label">
                  Search Before
                </label>
                <input
                  id="repo-search-before"
                  className="form-control"
                  type="text"
                  placeholder="Publisher name"
                  value={formData.searchBefore}
                  onChange={e => handleInputChange('searchBefore', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="repo-search-after" className="form-label">
                  Search After
                </label>
                <input
                  id="repo-search-after"
                  className="form-control"
                  type="text"
                  placeholder="Publisher name"
                  value={formData.searchAfter}
                  onChange={e => handleInputChange('searchAfter', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="repo-proxy" className="form-label">
                  Proxy
                </label>
                <input
                  id="repo-proxy"
                  className="form-control"
                  type="text"
                  placeholder="http://proxy.example.com:8080"
                  value={formData.proxy}
                  onChange={e => handleInputChange('proxy', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SSL Configuration */}
      <div className="card">
        <div className="card-body">
          <h3 className="fs-6 fw-bold">SSL Configuration (Optional)</h3>

          <div className="mb-3">
            <label htmlFor="repo-ssl-cert" className="form-label">
              SSL Certificate
            </label>
            <textarea
              id="repo-ssl-cert"
              className="form-control"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              value={formData.sslCert}
              onChange={e => handleInputChange('sslCert', e.target.value)}
              rows="3"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="repo-ssl-key" className="form-label">
              SSL Private Key
            </label>
            <textarea
              id="repo-ssl-key"
              className="form-control"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              value={formData.sslKey}
              onChange={e => handleInputChange('sslKey', e.target.value)}
              rows="3"
            />
          </div>
        </div>
      </div>
    </FormModal>
  );
};

AddRepositoryModal.propTypes = {
  server: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};

export default AddRepositoryModal;
