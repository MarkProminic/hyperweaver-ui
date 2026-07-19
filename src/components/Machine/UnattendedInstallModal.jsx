import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      setError(t('machine.unattendedInstallModal.probeFailed', { message: result.message }));
    }
  };

  const handleSubmit = async () => {
    if (form.source === 'iso' && !form.iso) {
      setError(t('machine.unattendedInstallModal.isoRequired'));
      return;
    }
    if (form.source === 'path' && !form.path.trim()) {
      setError(t('machine.unattendedInstallModal.pathRequired'));
      return;
    }
    if (!form.user.trim() || !form.password) {
      setError(t('machine.unattendedInstallModal.credentialsRequired'));
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
      text: `${result.data?.message || t('machine.unattendedInstallModal.queuedFallback', { machineName })}${taskId ? ` ${t('machine.unattendedInstallModal.taskSuffix', { taskId })}` : ''} ${t('machine.unattendedInstallModal.watchProgressNote')}`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('machine.unattendedInstallModal.title', { machineName })}
      icon="fas fa-compact-disc"
      submitText={t('machine.unattendedInstallModal.submit')}
      submitIcon="fas fa-play"
      loading={loading}
      showCancelButton
    >
      {isRunning && (
        <div className="alert alert-warning py-2">
          {t('machine.unattendedInstallModal.runningWarning', { machineName })}
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        {isoOptions.length > 0 && (
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="unattended-source">
              {t('machine.unattendedInstallModal.sourceLabel')}
            </label>
            <select
              id="unattended-source"
              className="form-select"
              value={form.source}
              onChange={e => patch({ source: e.target.value })}
              disabled={loading}
            >
              <option value="iso">{t('machine.unattendedInstallModal.cachedIsoOption')}</option>
              <option value="path">{t('machine.unattendedInstallModal.agentPathOption')}</option>
            </select>
          </div>
        )}
        {form.source === 'iso' && isoOptions.length > 0 ? (
          <div className="col-12 col-md-8">
            <label className="form-label" htmlFor="unattended-iso">
              {t('machine.unattendedInstallModal.cachedIsoLabel')}
            </label>
            <select
              id="unattended-iso"
              className="form-select"
              value={form.iso}
              onChange={e => patch({ iso: e.target.value })}
              disabled={loading}
            >
              <option value="">{t('machine.unattendedInstallModal.selectOption')}</option>
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
              {t('machine.unattendedInstallModal.isoPathLabel')}
            </label>
            <div className="d-flex gap-2 align-items-start">
              <div className="flex-grow-1">
                <PathInput
                  id="unattended-path"
                  value={form.path}
                  onChange={next => patch({ path: next })}
                  server={currentServer}
                  mode="file"
                  pickTitle={t('machine.unattendedInstallModal.pickIsoTitle')}
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleProbe}
                disabled={loading || probing || !form.path.trim()}
                title={t('machine.unattendedInstallModal.probeTooltip')}
              >
                <i
                  className={`fas ${probing ? 'fa-spinner fa-pulse' : 'fa-magnifying-glass'} me-2`}
                />
                {t('machine.unattendedInstallModal.probeButton')}
              </button>
            </div>
          </div>
        )}
        {probe && (
          <div className="col-12">
            <div
              className={`alert py-2 ${probe.supported === false ? 'alert-warning' : 'alert-info'}`}
            >
              {t('machine.unattendedInstallModal.detectedPrefix')}{' '}
              <code>{probe.os_typeid || t('machine.unattendedInstallModal.unknownOs')}</code>
              {probe.version ? ` · ${probe.version}` : ''} ·{' '}
              {probe.supported === false
                ? t('machine.unattendedInstallModal.unsupportedIso')
                : t('machine.unattendedInstallModal.supportedIso')}
            </div>
          </div>
        )}

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="unattended-user">
            {t('machine.unattendedInstallModal.userLabel')} <span className="text-danger">*</span>
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
            {t('machine.unattendedInstallModal.passwordLabel')}{' '}
            <span className="text-danger">*</span>
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
            <summary className="fw-semibold">
              {t('machine.unattendedInstallModal.advancedSummary')}
            </summary>
            <div className="row g-3 mt-1">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="unattended-hostname">
                  {t('machine.unattendedInstallModal.hostnameLabel')}
                </label>
                <input
                  id="unattended-hostname"
                  className="form-control"
                  type="text"
                  placeholder={t('machine.unattendedInstallModal.hostnamePlaceholder')}
                  value={form.hostname}
                  onChange={e => patch({ hostname: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="unattended-locale">
                  {t('machine.unattendedInstallModal.localeLabel')}
                </label>
                <input
                  id="unattended-locale"
                  className="form-control"
                  type="text"
                  placeholder={t('machine.unattendedInstallModal.localePlaceholder')}
                  value={form.locale}
                  onChange={e => patch({ locale: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="unattended-timezone">
                  {t('machine.unattendedInstallModal.timeZoneLabel')}
                </label>
                <input
                  id="unattended-timezone"
                  className="form-control"
                  type="text"
                  placeholder={t('machine.unattendedInstallModal.timeZonePlaceholder')}
                  value={form.time_zone}
                  onChange={e => patch({ time_zone: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label" htmlFor="unattended-image-index">
                  {t('machine.unattendedInstallModal.imageIndexLabel')}
                </label>
                <input
                  id="unattended-image-index"
                  className="form-control"
                  type="number"
                  min="0"
                  placeholder={t('machine.unattendedInstallModal.imageIndexPlaceholder')}
                  value={form.image_index}
                  onChange={e => patch({ image_index: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="unattended-product-key">
                  {t('machine.unattendedInstallModal.productKeyLabel')}
                </label>
                <input
                  id="unattended-product-key"
                  className="form-control"
                  type="text"
                  placeholder={t('machine.unattendedInstallModal.productKeyPlaceholder')}
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
              {t('machine.unattendedInstallModal.installAdditionsLabel')}
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
              {t('machine.unattendedInstallModal.startNowLabel')}
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
