import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { detectUnattendedIso, startUnattendedInstall } from '../../api/machineAPI';
import { getIsoArtifacts } from '../../api/provisioningAPI';
import { FormModal, PathInput, RevealInput } from '../common';

const emptyForm = () => ({
  source: 'iso',
  iso: '',
  path: '',
  user: '',
  password: '',
  hostname: '',
  locale: '',
  time_zone: '',
  image_index: '',
  product_key: '',
  install_additions: true,
  start: true,
});

const UnattendedInstallModal = ({
  isOpen,
  onClose,
  currentServer,
  machineName,
  isRunning,
  onDone,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [isoOptions, setIsoOptions] = useState([]);
  const [probe, setProbe] = useState(null);
  const [probing, setProbing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !currentServer) {
      return;
    }
    setForm(emptyForm());
    setProbe(null);
    setError('');
    getIsoArtifacts(currentServer.hostname, currentServer.port, currentServer.protocol).then(
      result => {
        const rows = Array.isArray(result.data) ? result.data : result.data?.artifacts || [];
        const usable = result.success ? rows.filter(row => row.file_exists !== false) : [];
        setIsoOptions(usable);
        if (usable.length === 0) {
          setForm(prev => ({ ...prev, source: 'path' }));
        }
      }
    );
  }, [isOpen, currentServer]);

  const patch = next => setForm(prev => ({ ...prev, ...next }));

  const handleProbe = async () => {
    setProbing(true);
    setProbe(null);
    setError('');
    const result = await detectUnattendedIso(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      form.path
    );
    setProbing(false);
    if (result.success) {
      setProbe(result.data || {});
    } else {
      setError(`ISO probe failed: ${result.message}`);
    }
  };

  const handleSubmit = async () => {
    if (form.source === 'iso' && !form.iso) {
      setError('Pick a cached ISO.');
      return;
    }
    if (form.source === 'path' && !form.path.trim()) {
      setError('Enter the ISO path on the agent host.');
      return;
    }
    if (!form.user.trim() || !form.password) {
      setError('User and password are required — the installer creates this account.');
      return;
    }
    setLoading(true);
    setError('');
    const body = {
      ...(form.source === 'iso' ? { iso: form.iso } : { path: form.path.trim() }),
      user: form.user.trim(),
      password: form.password,
      ...(form.hostname.trim() && { hostname: form.hostname.trim() }),
      ...(form.locale.trim() && { locale: form.locale.trim() }),
      ...(form.time_zone.trim() && { time_zone: form.time_zone.trim() }),
      ...(form.image_index !== '' && { image_index: Number(form.image_index) }),
      ...(form.product_key.trim() && { product_key: form.product_key.trim() }),
      install_additions: form.install_additions,
      ...(form.start === false && { start: false }),
    };
    const result = await startUnattendedInstall(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      body
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const taskId = result.data?.task_id || result.data?.parent_task_id;
    onDone({
      text: `${result.data?.message || `Unattended install queued for ${machineName}`}${taskId ? ` (task ${taskId})` : ''} — watch progress on the console screenshot.`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Install an OS — ${machineName}`}
      icon="fas fa-compact-disc"
      submitText="Install"
      submitIcon="fas fa-play"
      loading={loading}
      showCancelButton
    >
      {isRunning && (
        <div className="alert alert-warning py-2">
          {machineName} is running — the installer needs it powered off; the agent will refuse.
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        {isoOptions.length > 0 && (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="unattended-source">
              ISO source
            </label>
            <select
              id="unattended-source"
              className="form-select"
              value={form.source}
              onChange={e => patch({ source: e.target.value })}
              disabled={loading}
            >
              <option value="iso">Cached ISO</option>
              <option value="path">Agent path</option>
            </select>
          </div>
        )}
        {form.source === 'iso' && isoOptions.length > 0 ? (
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="unattended-iso">
              Cached ISO
            </label>
            <select
              id="unattended-iso"
              className="form-select"
              value={form.iso}
              onChange={e => patch({ iso: e.target.value })}
              disabled={loading}
            >
              <option value="">Select…</option>
              {isoOptions.map(row => (
                <option key={row.filename} value={row.filename}>
                  {row.filename}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="unattended-path">
              ISO path (on the agent host)
            </label>
            <div className="d-flex gap-2 align-items-start">
              <div className="flex-grow-1">
                <PathInput
                  id="unattended-path"
                  value={form.path}
                  onChange={next => patch({ path: next })}
                  server={currentServer}
                  mode="file"
                  pickTitle="Pick the installer ISO"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleProbe}
                disabled={loading || probing || !form.path.trim()}
                title="Ask VirtualBox what OS this ISO installs and whether unattended install supports it"
              >
                <i
                  className={`fas ${probing ? 'fa-spinner fa-pulse' : 'fa-magnifying-glass'} me-2`}
                />
                Probe
              </button>
            </div>
          </div>
        )}
        {probe && (
          <div className="col-12">
            <div
              className={`alert py-2 ${probe.supported === false ? 'alert-warning' : 'alert-info'}`}
            >
              Detected: <code>{probe.os_typeid || 'unknown'}</code>
              {probe.version ? ` · ${probe.version}` : ''} ·{' '}
              {probe.supported === false
                ? 'unattended install NOT supported for this ISO'
                : 'unattended install supported'}
            </div>
          </div>
        )}

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="unattended-user">
            User <span className="text-danger">*</span>
          </label>
          <input
            id="unattended-user"
            className="form-control"
            type="text"
            value={form.user}
            onChange={e => patch({ user: e.target.value })}
            disabled={loading}
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="unattended-password">
            Password <span className="text-danger">*</span>
          </label>
          <RevealInput
            id="unattended-password"
            value={form.password}
            onChange={e => patch({ password: e.target.value })}
            disabled={loading}
            required
          />
        </div>

        <div className="col-12">
          <details>
            <summary className="fw-semibold">Advanced</summary>
            <div className="row g-3 mt-1">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="unattended-hostname">
                  Hostname
                </label>
                <input
                  id="unattended-hostname"
                  className="form-control"
                  type="text"
                  placeholder="(installer default)"
                  value={form.hostname}
                  onChange={e => patch({ hostname: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="unattended-locale">
                  Locale
                </label>
                <input
                  id="unattended-locale"
                  className="form-control"
                  type="text"
                  placeholder="e.g. en_US"
                  value={form.locale}
                  onChange={e => patch({ locale: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="unattended-timezone">
                  Time zone
                </label>
                <input
                  id="unattended-timezone"
                  className="form-control"
                  type="text"
                  placeholder="e.g. America/Chicago"
                  value={form.time_zone}
                  onChange={e => patch({ time_zone: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="unattended-image-index">
                  Image index (Windows edition)
                </label>
                <input
                  id="unattended-image-index"
                  className="form-control"
                  type="number"
                  min="0"
                  placeholder="(default)"
                  value={form.image_index}
                  onChange={e => patch({ image_index: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="unattended-product-key">
                  Product key
                </label>
                <input
                  id="unattended-product-key"
                  className="form-control"
                  type="text"
                  placeholder="(none)"
                  value={form.product_key}
                  onChange={e => patch({ product_key: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
          </details>
        </div>

        <div className="col-12 col-md-6">
          <div className="form-check form-switch">
            <input
              id="unattended-additions"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={form.install_additions}
              onChange={e => patch({ install_additions: e.target.checked })}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="unattended-additions">
              Install Guest Additions
            </label>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="form-check form-switch">
            <input
              id="unattended-start"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={form.start}
              onChange={e => patch({ start: e.target.checked })}
              disabled={loading}
            />
            <label className="form-check-label" htmlFor="unattended-start">
              Boot into the installer now
            </label>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

UnattendedInstallModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  onDone: PropTypes.func.isRequired,
};

export default UnattendedInstallModal;
