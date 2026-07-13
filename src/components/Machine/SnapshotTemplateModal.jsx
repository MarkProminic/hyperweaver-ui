import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { exportTemplate, getTemplateSources, publishTemplate } from '../../api/provisioningAPI';
import { pickDefaultSource } from '../../utils/boxCatalog';
import { FormModal } from '../common';

/**
 * Build a template FROM A SNAPSHOT — the agent's export/publish wires both
 * take `snapshot_name`, so a point-in-time snapshot can become a .box without
 * touching the machine's live state. `mode` picks which: export mints a local
 * template, publish exports and pushes it to a registry.
 */
const SnapshotTemplateModal = ({
  isOpen,
  mode,
  onClose,
  currentServer,
  machineName,
  snapshotName,
  onQueued,
}) => {
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState({
    filename: '',
    source: '',
    organization: '',
    boxName: '',
    version: '',
    description: '',
    architecture: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPublish = mode === 'publish';

  useEffect(() => {
    if (!isOpen || !currentServer) {
      return;
    }
    setForm({
      filename: '',
      source: '',
      organization: '',
      boxName: '',
      version: '',
      description: '',
      architecture: '',
    });
    setError('');
    if (isPublish) {
      getTemplateSources(currentServer.hostname, currentServer.port, currentServer.protocol).then(
        result => {
          const list =
            result.success && Array.isArray(result.data?.sources) ? result.data.sources : [];
          setSources(list);
          setForm(prev => ({ ...prev, source: pickDefaultSource(list)?.name || '' }));
        }
      );
    }
  }, [isOpen, currentServer, isPublish]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const base = { machine_name: machineName, snapshot_name: snapshotName };
    if (!isPublish) {
      setLoading(true);
      setError('');
      const result = await exportTemplate(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        { ...base, ...(form.filename.trim() && { filename: form.filename.trim() }) }
      );
      setLoading(false);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onQueued(result.data, `Template export queued from ${snapshotName}.`);
      onClose();
      return;
    }
    if (!form.source || !form.organization.trim() || !form.boxName.trim() || !form.version.trim()) {
      setError('Publish needs a registry, organization, box name, and version.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await publishTemplate(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      {
        ...base,
        source_name: form.source,
        organization: form.organization.trim(),
        box_name: form.boxName.trim(),
        version: form.version.trim(),
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.architecture.trim() && { architecture: form.architecture.trim() }),
      }
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onQueued(result.data, `Publish queued from ${snapshotName}.`);
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`${isPublish ? 'Publish' : 'Template'} from snapshot — ${snapshotName || ''}`}
      icon={isPublish ? 'fas fa-cloud-arrow-up' : 'fas fa-box-archive'}
      submitText={isPublish ? 'Queue Publish' : 'Queue Export'}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <p className="form-text text-muted mt-0">
        Built from the snapshot&apos;s point-in-time state — the machine keeps running and its
        current state is untouched.
      </p>

      {!isPublish && (
        <div className="mb-2">
          <label className="form-label" htmlFor="snap-template-filename">
            Filename (optional)
          </label>
          <input
            id="snap-template-filename"
            className="form-control"
            type="text"
            placeholder={`(default — derived from ${machineName || 'the machine'})`}
            value={form.filename}
            onChange={e => setField('filename', e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      {isPublish && (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="snap-publish-source">
              Registry
            </label>
            <select
              id="snap-publish-source"
              className="form-select"
              value={form.source}
              onChange={e => setField('source', e.target.value)}
              disabled={loading}
            >
              <option value="">Select…</option>
              {sources.map(source => (
                <option key={source.name} value={source.name}>
                  {source.name}
                  {source.default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="snap-publish-org">
              Organization
            </label>
            <input
              id="snap-publish-org"
              className="form-control"
              value={form.organization}
              onChange={e => setField('organization', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="snap-publish-box">
              Box name
            </label>
            <input
              id="snap-publish-box"
              className="form-control"
              value={form.boxName}
              onChange={e => setField('boxName', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="snap-publish-version">
              Version
            </label>
            <input
              id="snap-publish-version"
              className="form-control"
              value={form.version}
              onChange={e => setField('version', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="snap-publish-arch">
              Architecture (optional)
            </label>
            <input
              id="snap-publish-arch"
              className="form-control"
              placeholder="amd64"
              value={form.architecture}
              onChange={e => setField('architecture', e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="snap-publish-description">
              Description (optional)
            </label>
            <input
              id="snap-publish-description"
              className="form-control"
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      )}
    </FormModal>
  );
};

SnapshotTemplateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['export', 'publish']),
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  snapshotName: PropTypes.string,
  onQueued: PropTypes.func.isRequired,
};

export default SnapshotTemplateModal;
