import PropTypes from 'prop-types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { discoverBoxes, listOrgBoxes, getBoxDownloadLink } from '../../api/boxvaultAPI';
import { useAuth } from '../../contexts/AuthContext';
import FormModal from '../common/FormModal';

const orgSlugOf = box =>
  box?.organization?.name || box?.user?.primaryOrganization?.name || box?.organization || '';

const versionNumberOf = version => version?.versionNumber ?? version?.version ?? '';

/**
 * BoxVaultPickerModal - browse BoxVault through the Server's per-user proxy and pick a
 * box file. The pick mints a signed download URL (~1h) that rides the machine-create
 * document as settings.box_url, so the agent downloads with no credential. 503 =
 * integration unconfigured; 403 = federated login required (local sessions have no OIDC
 * token to forward).
 */
const BoxVaultPickerModal = ({ isOpen, onClose, onPicked }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const federated = String(user?.auth_provider || '').startsWith('oidc-');
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [orgSlug, setOrgSlug] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [versionPick, setVersionPick] = useState('');
  const [providerPick, setProviderPick] = useState('');
  const [archPick, setArchPick] = useState('');

  const applyFailure = useCallback(
    result => {
      if (result.status === 503) {
        setBlocked(t('machineEdit.boxVaultPicker.unconfigured'));
      } else if (result.status === 403) {
        setBlocked(t('machineEdit.boxVaultPicker.federatedRequired'));
      } else {
        setError(result.message || t('machineEdit.boxVaultPicker.loadFailed'));
      }
    },
    [t]
  );

  useEffect(() => {
    if (!isOpen) {
      setBoxes([]);
      setOrgSlug('');
      setSelectedKey('');
      setVersionPick('');
      setProviderPick('');
      setArchPick('');
      setError(null);
      setBlocked(null);
      return;
    }
    if (!federated) {
      setBlocked(t('machineEdit.boxVaultPicker.federatedRequired'));
      return;
    }
    setLoading(true);
    discoverBoxes().then(result => {
      setLoading(false);
      if (!result.success) {
        applyFailure(result);
        return;
      }
      const rows = Array.isArray(result.data) ? result.data : [];
      setBoxes(rows.map(box => ({ ...box, orgSlug: orgSlugOf(box) })));
    });
  }, [isOpen, federated, applyFailure, t]);

  const loadOrg = async () => {
    const slug = orgSlug.trim();
    if (!slug) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await listOrgBoxes(slug);
    setLoading(false);
    if (!result.success) {
      applyFailure(result);
      return;
    }
    const rows = (Array.isArray(result.data) ? result.data : []).map(box => ({
      ...box,
      orgSlug: slug,
    }));
    setBoxes(current => {
      const keep = current.filter(box => box.orgSlug !== slug);
      return [...keep, ...rows];
    });
  };

  const knownSlugs = useMemo(
    () => [...new Set(boxes.map(box => box.orgSlug).filter(Boolean))].sort(),
    [boxes]
  );

  const selected = useMemo(
    () => boxes.find(box => `${box.orgSlug}/${box.name}` === selectedKey) || null,
    [boxes, selectedKey]
  );
  const versions = selected?.versions || [];
  const selectedVersion =
    versions.find(version => versionNumberOf(version) === versionPick) || null;
  const providers = selectedVersion?.providers || [];
  const selectedProvider = providers.find(provider => provider.name === providerPick) || null;
  const architectures = selectedProvider?.architectures || [];

  const pickBox = key => {
    setSelectedKey(key);
    const box = boxes.find(entry => `${entry.orgSlug}/${entry.name}` === key) || null;
    const firstVersion = box?.versions?.[0] || null;
    setVersionPick(versionNumberOf(firstVersion));
    const firstProvider = firstVersion?.providers?.[0] || null;
    setProviderPick(firstProvider?.name || '');
    setArchPick(firstProvider?.architectures?.[0]?.name || '');
  };

  const handleSubmit = async () => {
    if (!selected || !versionPick || !providerPick || !archPick) {
      setError(t('machineEdit.boxVaultPicker.pickAllParts'));
      return;
    }
    setMinting(true);
    setError(null);
    const result = await getBoxDownloadLink({
      orgSlug: selected.orgSlug,
      boxName: selected.name,
      version: versionPick,
      provider: providerPick,
      architecture: archPick,
    });
    setMinting(false);
    if (!result.success || !result.downloadUrl) {
      applyFailure(result);
      return;
    }
    onPicked({
      orgSlug: selected.orgSlug,
      boxName: selected.name,
      version: versionPick,
      provider: providerPick,
      architecture: archPick,
      downloadUrl: result.downloadUrl,
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t('machineEdit.boxVaultPicker.title')}
      icon="fas fa-box-open"
      submitText={t('machineEdit.boxVaultPicker.useThisBox')}
      loading={minting}
      disabled={loading || !!blocked || !selected}
      showCancelButton
      cancelText={t('machineEdit.boxVaultPicker.cancel')}
    >
      {blocked && <div className="alert alert-warning">{blocked}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!blocked && (
        <>
          <p className="form-text text-muted mt-0">{t('machineEdit.boxVaultPicker.help')}</p>
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="boxvault-org-slug">
                {t('machineEdit.boxVaultPicker.orgSlug')}
              </label>
              <div className="input-group">
                <input
                  id="boxvault-org-slug"
                  className="form-control"
                  type="text"
                  list="boxvault-org-slugs"
                  placeholder={t('machineEdit.boxVaultPicker.orgSlugPlaceholder')}
                  value={orgSlug}
                  onChange={e => setOrgSlug(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={loadOrg}
                  disabled={loading || !orgSlug.trim()}
                >
                  {t('machineEdit.boxVaultPicker.loadOrgBoxes')}
                </button>
              </div>
              <datalist id="boxvault-org-slugs">
                {knownSlugs.map(slug => (
                  <option key={slug} value={slug} />
                ))}
              </datalist>
              <span className="form-text text-muted">
                {t('machineEdit.boxVaultPicker.orgSlugHint')}
              </span>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-3">
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              {t('machineEdit.boxVaultPicker.loading')}
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="boxvault-box">
                  {t('machineEdit.boxVaultPicker.box')}
                </label>
                <select
                  id="boxvault-box"
                  className="form-select"
                  value={selectedKey}
                  onChange={e => pickBox(e.target.value)}
                >
                  <option value="">
                    {boxes.length > 0
                      ? t('machineEdit.boxVaultPicker.selectABox')
                      : t('machineEdit.boxVaultPicker.noBoxes')}
                  </option>
                  {boxes.map(box => {
                    const key = `${box.orgSlug}/${box.name}`;
                    return (
                      <option key={key} value={key}>
                        {key}
                        {box.isPublic === false
                          ? t('machineEdit.boxVaultPicker.privateSuffix')
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="boxvault-version">
                  {t('machineEdit.boxVaultPicker.version')}
                </label>
                <select
                  id="boxvault-version"
                  className="form-select"
                  value={versionPick}
                  onChange={e => {
                    setVersionPick(e.target.value);
                    setProviderPick('');
                    setArchPick('');
                  }}
                  disabled={!selected}
                >
                  <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
                  {versions.map(version => {
                    const number = versionNumberOf(version);
                    return (
                      <option key={number} value={number}>
                        {number}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="boxvault-provider">
                  {t('machineEdit.boxVaultPicker.provider')}
                </label>
                <select
                  id="boxvault-provider"
                  className="form-select"
                  value={providerPick}
                  onChange={e => {
                    setProviderPick(e.target.value);
                    setArchPick('');
                  }}
                  disabled={!selectedVersion}
                >
                  <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
                  {providers.map(provider => (
                    <option key={provider.name} value={provider.name}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="boxvault-arch">
                  {t('machineEdit.boxVaultPicker.architecture')}
                </label>
                <select
                  id="boxvault-arch"
                  className="form-select"
                  value={archPick}
                  onChange={e => setArchPick(e.target.value)}
                  disabled={!selectedProvider}
                >
                  <option value="">{t('machineEdit.cdromSourceFields.select')}</option>
                  {architectures.map(architecture => (
                    <option key={architecture.name} value={architecture.name}>
                      {architecture.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </FormModal>
  );
};

BoxVaultPickerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPicked: PropTypes.func.isRequired,
};

export default BoxVaultPickerModal;
