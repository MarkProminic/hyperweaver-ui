import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PathInput } from './common';

/**
 * External-applications editor (the top-level `applications[]` config, gated
 * on the `host-launchers` token). Each entry names an executable on the agent
 * host and an argument template; the per-machine Controls menu launches it
 * with {host}/{port}/{user}/{password}/{machine} resolved at launch. Edits
 * ride the parent Agent Settings state — the page's Save button persists them
 * through PUT /settings, exactly like every other setting.
 */

const PLACEHOLDERS = ['{host}', '{port}', '{user}', '{password}', '{machine}'];

// Stable editor keys (never persisted) so rows don't remount on edit and the
// list never keys off its array index.
let keySeed = 0;
const freshKey = () => {
  keySeed += 1;
  return `k${keySeed}`;
};

const toRows = list =>
  (Array.isArray(list) ? list : []).map(app => ({
    key: freshKey(),
    name: app.name || '',
    path: app.path || '',
    args: (app.args || []).map(value => ({ key: freshKey(), value })),
  }));

const toConfig = rows =>
  rows.map(row => ({ name: row.name, path: row.path, args: row.args.map(arg => arg.value) }));

const ApplicationsTab = ({ applications, onChange, server }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState(() => toRows(applications));
  // Reset from the prop only on an EXTERNAL change (settings reload / restore),
  // never on our own emit — the parent stores the exact object we passed.
  const emitted = useRef(applications);
  useEffect(() => {
    if (applications !== emitted.current) {
      setRows(toRows(applications));
    }
  }, [applications]);

  const commit = next => {
    setRows(next);
    const config = toConfig(next);
    emitted.current = config;
    onChange(config);
  };

  const updateApp = (key, patch) =>
    commit(rows.map(row => (row.key === key ? { ...row, ...patch } : row)));
  const removeApp = key => commit(rows.filter(row => row.key !== key));
  const addApp = () => commit([...rows, { key: freshKey(), name: '', path: '', args: [] }]);

  const argsOf = appKey => rows.find(row => row.key === appKey)?.args || [];
  const setArg = (appKey, argKey, value) =>
    updateApp(appKey, {
      args: argsOf(appKey).map(arg => (arg.key === argKey ? { ...arg, value } : arg)),
    });
  const addArg = appKey =>
    updateApp(appKey, { args: [...argsOf(appKey), { key: freshKey(), value: '' }] });
  const removeArg = (appKey, argKey) =>
    updateApp(appKey, { args: argsOf(appKey).filter(arg => arg.key !== argKey) });

  return (
    <div>
      <div className="alert alert-info py-2">
        <div className="mb-1">
          {t('accounts.applicationsTab.configureToolsDescription')}{' '}
          <strong>{t('accounts.applicationsTab.agentHostLabel')}</strong>.
        </div>
        <div>
          {t('accounts.applicationsTab.placeholdersLabel')}{' '}
          {PLACEHOLDERS.map(token => (
            <code className="me-2" key={token}>
              {token}
            </code>
          ))}
        </div>
        <div className="small text-muted mt-1">{t('accounts.applicationsTab.argumentsNote')}</div>
      </div>

      {rows.length === 0 && (
        <p className="text-muted">{t('accounts.applicationsTab.emptyState')}</p>
      )}

      {rows.map(app => (
        <div className="card mb-3" key={app.key}>
          <div className="card-body">
            <div className="row g-2 mb-2">
              <div className="col-12 col-md-4">
                <label className="form-label small mb-1" htmlFor={`app-name-${app.key}`}>
                  {t('accounts.applicationsTab.labelName')}
                </label>
                <input
                  id={`app-name-${app.key}`}
                  className="form-control"
                  placeholder={t('accounts.applicationsTab.namePlaceholder')}
                  value={app.name}
                  onChange={e => updateApp(app.key, { name: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label small mb-1" htmlFor={`app-path-${app.key}`}>
                  {t('accounts.applicationsTab.labelExecutablePath')}
                </label>
                <PathInput
                  id={`app-path-${app.key}`}
                  value={app.path}
                  onChange={next => updateApp(app.key, { path: next })}
                  server={server}
                  mode="file"
                  pickTitle={t('accounts.applicationsTab.pickExecutableTitle')}
                />
              </div>
            </div>

            <span className="form-label small mb-1 d-block">
              {t('accounts.applicationsTab.labelArguments')}
            </span>
            <div className="d-flex flex-column gap-1 mb-2">
              {app.args.length === 0 && (
                <span className="text-muted small">
                  {t('accounts.applicationsTab.noArguments')}
                </span>
              )}
              {app.args.map(arg => (
                <div className="input-group input-group-sm" key={arg.key}>
                  <input
                    className="form-control font-monospace"
                    placeholder={t('accounts.applicationsTab.argumentPlaceholder')}
                    value={arg.value}
                    onChange={e => setArg(app.key, arg.key, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    aria-label={t('accounts.applicationsTab.removeArgumentLabel')}
                    onClick={() => removeArg(app.key, arg.key)}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => addArg(app.key)}
              >
                <i className="fas fa-plus me-2" />
                {t('accounts.applicationsTab.addArgumentButton')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger ms-auto"
                onClick={() => removeApp(app.key)}
              >
                <i className="fas fa-trash me-2" />
                {t('accounts.applicationsTab.removeApplicationButton')}
              </button>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-sm btn-primary" onClick={addApp}>
        <i className="fas fa-plus me-2" />
        {t('accounts.applicationsTab.addApplicationButton')}
      </button>
      <p className="form-text text-muted mt-2">
        {t('accounts.applicationsTab.stageChangesNote', {
          action: t('accounts.applicationsTab.saveButton'),
        })}
      </p>
    </div>
  );
};

ApplicationsTab.propTypes = {
  applications: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  server: PropTypes.object,
};

export default ApplicationsTab;
