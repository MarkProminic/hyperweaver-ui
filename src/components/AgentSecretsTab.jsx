import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSecrets, updateSecrets } from '../api/provisioningAPI';
import { useServers } from '../contexts/ServerContext';

/**
 * Global Secrets tab (sync item 11 — SHI's SecretsPage): the agent's six
 * repeatable secret categories, edited per-category and saved whole
 * (PUT /secrets replaces the submitted categories). Values render PLAIN —
 * Mark's ruling: nothing masked, it is the operator's machine and the
 * generated Hosts.yml carries them as SECRETS_* vars anyway. Same contract
 * on either agent; the tab renders wherever `provisioning` is advertised.
 */

// The six category shapes, verbatim from the wire contract. `multiline`
// renders a textarea (SSH private keys). Labels are resolved through `t` so
// the shapes stay reusable outside the component while remaining translated.
const buildCategories = t => [
  {
    key: 'hcl_download_portal_api_keys',
    label: t('agentSettings.agentSecretsTab.hclCategoryLabel'),
    icon: 'fas fa-key',
    fields: [
      { key: 'name', label: t('agentSettings.agentSecretsTab.nameFieldLabel') },
      { key: 'key', label: t('agentSettings.agentSecretsTab.keyFieldLabel') },
    ],
  },
  {
    key: 'git_api_keys',
    label: t('agentSettings.agentSecretsTab.gitCategoryLabel'),
    icon: 'fab fa-git-alt',
    fields: [
      { key: 'name', label: t('agentSettings.agentSecretsTab.nameFieldLabel') },
      { key: 'key', label: t('agentSettings.agentSecretsTab.keyFieldLabel') },
    ],
  },
  {
    key: 'vagrant_atlas_token',
    label: t('agentSettings.agentSecretsTab.vagrantCategoryLabel'),
    icon: 'fas fa-box',
    fields: [
      { key: 'name', label: t('agentSettings.agentSecretsTab.nameFieldLabel') },
      { key: 'key', label: t('agentSettings.agentSecretsTab.tokenFieldLabel') },
    ],
  },
  {
    key: 'custom_resource_url',
    label: t('agentSettings.agentSecretsTab.customResourceCategoryLabel'),
    icon: 'fas fa-link',
    fields: [
      { key: 'name', label: t('agentSettings.agentSecretsTab.nameFieldLabel') },
      { key: 'url', label: t('agentSettings.agentSecretsTab.urlFieldLabel') },
      {
        key: 'useAuth',
        label: t('agentSettings.agentSecretsTab.httpBasicAuthFieldLabel'),
        type: 'checkbox',
      },
      { key: 'user', label: t('agentSettings.agentSecretsTab.userFieldLabel') },
      { key: 'pass', label: t('agentSettings.agentSecretsTab.passwordFieldLabel') },
    ],
  },
  {
    key: 'docker_hub',
    label: t('agentSettings.agentSecretsTab.dockerHubCategoryLabel'),
    icon: 'fab fa-docker',
    fields: [
      { key: 'name', label: t('agentSettings.agentSecretsTab.nameFieldLabel') },
      { key: 'docker_hub_user', label: t('agentSettings.agentSecretsTab.userFieldLabel') },
      { key: 'docker_hub_token', label: t('agentSettings.agentSecretsTab.tokenFieldLabel') },
    ],
  },
  {
    key: 'ssh_keys',
    label: t('agentSettings.agentSecretsTab.sshKeysCategoryLabel'),
    icon: 'fas fa-terminal',
    fields: [
      { key: 'name', label: t('agentSettings.agentSecretsTab.nameFieldLabel') },
      {
        key: 'key',
        label: t('agentSettings.agentSecretsTab.privateKeyFieldLabel'),
        multiline: true,
      },
    ],
  },
];

const emptyEntry = category =>
  Object.fromEntries(
    category.fields.map(field => [field.key, field.type === 'checkbox' ? false : ''])
  );

const EntryField = ({ category, field, index, value, onChange }) => {
  const inputId = `secret-${category.key}-${index}-${field.key}`;
  if (field.type === 'checkbox') {
    return (
      <div className="col-6 col-md-2">
        <div className="form-check form-switch mt-4">
          <input
            id={inputId}
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={!!value}
            onChange={e => onChange(field.key, e.target.checked)}
          />
          <label className="form-check-label small" htmlFor={inputId}>
            {field.label}
          </label>
        </div>
      </div>
    );
  }
  return (
    <div className={field.multiline ? 'col-12 col-md-8' : 'col-12 col-md-3'}>
      <label className="form-label small mb-1" htmlFor={inputId}>
        {field.label}
      </label>
      {field.multiline ? (
        <textarea
          id={inputId}
          className="form-control form-control-sm font-monospace"
          rows={3}
          value={value ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
        />
      ) : (
        <input
          id={inputId}
          className="form-control form-control-sm"
          type="text"
          value={value ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
        />
      )}
    </div>
  );
};

EntryField.propTypes = {
  category: PropTypes.object.isRequired,
  field: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
};

const AgentSecretsTab = () => {
  const { t } = useTranslation();
  const { currentServer } = useServers();
  const CATEGORIES = useMemo(() => buildCategories(t), [t]);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const loadSecrets = useCallback(async () => {
    if (!currentServer) {
      return;
    }
    setLoading(true);
    const result = await getSecrets(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol
    );
    if (result.success) {
      setDocument(result.data);
      setMsg('');
    } else {
      report(
        t('agentSettings.agentSecretsTab.failedLoadSecrets', { message: result.message }),
        'danger'
      );
    }
    setLoading(false);
  }, [currentServer, t]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const entriesOf = categoryKey =>
    Array.isArray(document?.[categoryKey]) ? document[categoryKey] : [];

  const setEntries = (categoryKey, entries) => {
    setDocument(prev => ({ ...prev, [categoryKey]: entries }));
  };

  const saveCategory = async category => {
    setLoading(true);
    const entries = entriesOf(category.key).filter(entry => entry.name);
    const result = await updateSecrets(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      { [category.key]: entries }
    );
    setLoading(false);
    if (result.success) {
      setEntries(category.key, entries);
      report(
        t('agentSettings.agentSecretsTab.categorySaved', { category: category.label }),
        'success'
      );
    } else {
      report(
        t('agentSettings.agentSecretsTab.failedSaveCategory', {
          category: category.label,
          message: result.message,
        }),
        'danger'
      );
    }
  };

  if (!currentServer) {
    return (
      <div className="alert alert-warning">
        {t('agentSettings.agentSecretsTab.selectHostWarning')}
      </div>
    );
  }

  return (
    <div>
      <div className="alert alert-info py-2 d-flex justify-content-between align-items-start gap-3">
        <span>
          <i className="fas fa-info-circle me-2" />
          {t('agentSettings.agentSecretsTab.infoPart1')}
          <code>SECRETS_*</code>
          {t('agentSettings.agentSecretsTab.infoPart2')}
          <code>[a-zA-Z0-9_-]+</code>
          {t('agentSettings.agentSecretsTab.infoPart3')}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary flex-shrink-0"
          onClick={loadSecrets}
          disabled={loading}
        >
          <i className="fas fa-sync-alt me-2" />
          {t('agentSettings.agentSecretsTab.reloadButton')}
        </button>
      </div>
      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {loading && !document && (
        <p className="text-muted">{t('agentSettings.agentSecretsTab.loadingText')}</p>
      )}

      {document &&
        CATEGORIES.map(category => {
          const entries = entriesOf(category.key);
          return (
            <div className="card mb-3" key={category.key}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="fs-6 fw-bold mb-0">
                    <i className={`${category.icon} me-2`} />
                    {category.label}
                    <span className="badge text-bg-light ms-2">{entries.length}</span>
                  </h5>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setEntries(category.key, [...entries, emptyEntry(category)])}
                      disabled={loading}
                    >
                      <i className="fas fa-plus me-2" />
                      {t('agentSettings.agentSecretsTab.addButton')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => saveCategory(category)}
                      disabled={loading}
                    >
                      <i className="fas fa-save me-2" />
                      {t('agentSettings.agentSecretsTab.saveButton')}
                    </button>
                  </div>
                </div>

                {entries.length === 0 && (
                  <p className="text-muted small mb-0">
                    {t('agentSettings.agentSecretsTab.noEntries')}
                  </p>
                )}
                {entries.map((entry, index) => (
                  <div
                    className="row g-2 align-items-end border-bottom py-2"
                    // Rows are positional edits of a small list — the index IS
                    // the identity until save re-keys by name.
                    // eslint-disable-next-line react/no-array-index-key
                    key={`${category.key}-${index}`}
                  >
                    {category.fields.map(field => (
                      <EntryField
                        key={field.key}
                        category={category}
                        field={field}
                        index={index}
                        value={entry[field.key]}
                        onChange={(fieldKey, value) =>
                          setEntries(
                            category.key,
                            entries.map((row, i) =>
                              i === index ? { ...row, [fieldKey]: value } : row
                            )
                          )
                        }
                      />
                    ))}
                    <div className="col-auto ms-auto">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        aria-label={t('agentSettings.agentSecretsTab.removeEntryAriaLabel', {
                          category: category.label,
                        })}
                        onClick={() =>
                          setEntries(
                            category.key,
                            entries.slice(0, index).concat(entries.slice(index + 1))
                          )
                        }
                        disabled={loading}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default AgentSecretsTab;
