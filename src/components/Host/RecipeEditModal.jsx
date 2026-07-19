import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createRecipe, updateRecipe } from '../../api/provisioningAPI';
import { FormModal } from '../common';

// Recipe vocabulary (zoneweaver zone_setup contract): five step types; each
// type carries only its own wire fields. String fields take {{variable}}
// placeholders resolved from recipe variables merged with call-time ones.
const OS_FAMILIES = ['linux', 'solaris', 'windows'];
const BRANDS = ['bhyve', 'lx', 'kvm'];
export const STEP_TYPES = ['wait', 'send', 'command', 'template', 'delay'];
const STEP_FIELDS = {
  wait: ['pattern'],
  send: ['value'],
  command: ['value'],
  template: ['content', 'dest'],
  delay: ['seconds'],
};

const newRowKey = () => Date.now() + Math.random();

const seedStepRows = steps =>
  (Array.isArray(steps) ? steps : []).map(step => ({
    key: newRowKey(),
    type: STEP_TYPES.includes(step.type) ? step.type : 'command',
    pattern: step.pattern ?? '',
    value: step.value ?? '',
    content: step.content ?? '',
    dest: step.dest ?? '',
    seconds: step.seconds === undefined || step.seconds === null ? '' : String(step.seconds),
  }));

const seedVariableRows = variables =>
  Object.entries(variables || {}).map(([name, value]) => ({
    key: newRowKey(),
    name,
    value: String(value),
  }));

const buildSteps = stepRows =>
  stepRows.map(row => {
    const entry = { type: row.type };
    STEP_FIELDS[row.type].forEach(field => {
      const value = String(row[field] ?? '').trim();
      if (value !== '') {
        entry[field] = field === 'seconds' ? Number(value) : value;
      }
    });
    return entry;
  });

const buildVariables = variableRows =>
  Object.fromEntries(
    variableRows.filter(row => row.name.trim() !== '').map(row => [row.name.trim(), row.value])
  );

/** Key/value rows — the recipe `variables` map editor (shared by the test panel). */
export const VariableRowsEditor = ({ rows, onRowsChange, idPrefix, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex flex-column gap-1">
      {rows.map(row => (
        <div className="d-flex gap-1" key={row.key}>
          <input
            className="form-control form-control-sm"
            aria-label={t('host.recipeEditModal.variableName')}
            placeholder={t('host.recipeEditModal.namePlaceholder')}
            value={row.name}
            onChange={e =>
              onRowsChange(
                rows.map(entry =>
                  entry.key === row.key ? { ...entry, name: e.target.value } : entry
                )
              )
            }
            disabled={disabled}
          />
          <input
            className="form-control form-control-sm"
            aria-label={t('host.recipeEditModal.variableValue')}
            placeholder={t('host.recipeEditModal.valuePlaceholder')}
            value={row.value}
            onChange={e =>
              onRowsChange(
                rows.map(entry =>
                  entry.key === row.key ? { ...entry, value: e.target.value } : entry
                )
              )
            }
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            aria-label={t('host.recipeEditModal.dropVariable')}
            onClick={() => onRowsChange(rows.filter(entry => entry.key !== row.key))}
            disabled={disabled}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          id={`${idPrefix}-add-variable`}
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onRowsChange([...rows, { key: newRowKey(), name: '', value: '' }])}
          disabled={disabled}
        >
          <i className="fas fa-plus me-1" />
          {t('host.recipeEditModal.variable')}
        </button>
      </div>
    </div>
  );
};

VariableRowsEditor.propTypes = {
  rows: PropTypes.array.isRequired,
  onRowsChange: PropTypes.func.isRequired,
  idPrefix: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

const StepRow = ({ row, index, count, onPatch, onMove, onDrop, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="border rounded p-2">
      <div className="d-flex gap-1 align-items-center mb-1">
        <span className="badge text-bg-secondary">{index + 1}</span>
        <select
          className="form-select form-select-sm w-auto"
          aria-label={t('host.recipeEditModal.stepType')}
          value={row.type}
          onChange={e => onPatch({ type: e.target.value })}
          disabled={disabled}
        >
          {STEP_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <span className="ms-auto d-inline-flex gap-1">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            aria-label={t('host.recipeEditModal.moveStepUp')}
            onClick={() => onMove(-1)}
            disabled={disabled || index === 0}
          >
            <i className="fas fa-arrow-up" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0"
            aria-label={t('host.recipeEditModal.moveStepDown')}
            onClick={() => onMove(1)}
            disabled={disabled || index === count - 1}
          >
            <i className="fas fa-arrow-down" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger py-0"
            aria-label={t('host.recipeEditModal.dropStep')}
            onClick={onDrop}
            disabled={disabled}
          >
            <i className="fas fa-trash" />
          </button>
        </span>
      </div>
      {row.type === 'wait' && (
        <input
          className="form-control form-control-sm"
          aria-label={t('host.recipeEditModal.patternToWaitFor')}
          placeholder={t('host.recipeEditModal.patternPlaceholder')}
          value={row.pattern}
          onChange={e => onPatch({ pattern: e.target.value })}
          disabled={disabled}
        />
      )}
      {(row.type === 'send' || row.type === 'command') && (
        <input
          className="form-control form-control-sm font-monospace"
          aria-label={
            row.type === 'send'
              ? t('host.recipeEditModal.textToSend')
              : t('host.recipeEditModal.commandToRun')
          }
          placeholder={
            row.type === 'send'
              ? t('host.recipeEditModal.sendPlaceholder')
              : t('host.recipeEditModal.commandPlaceholder')
          }
          value={row.value}
          onChange={e => onPatch({ value: e.target.value })}
          disabled={disabled}
        />
      )}
      {row.type === 'template' && (
        <>
          <textarea
            className="form-control form-control-sm font-monospace"
            aria-label={t('host.recipeEditModal.templateContent')}
            rows={4}
            placeholder={t('host.recipeEditModal.templateContentPlaceholder', {
              token: '{{variables}}',
            })}
            value={row.content}
            onChange={e => onPatch({ content: e.target.value })}
            disabled={disabled}
          />
          <input
            className="form-control form-control-sm font-monospace mt-1"
            aria-label={t('host.recipeEditModal.destPath')}
            placeholder={t('host.recipeEditModal.destPlaceholder')}
            value={row.dest}
            onChange={e => onPatch({ dest: e.target.value })}
            disabled={disabled}
          />
        </>
      )}
      {row.type === 'delay' && (
        <input
          className="form-control form-control-sm w-auto"
          aria-label={t('host.recipeEditModal.secondsToWait')}
          type="number"
          min="1"
          placeholder={t('host.recipeEditModal.secondsPlaceholder')}
          value={row.seconds}
          onChange={e => onPatch({ seconds: e.target.value })}
          disabled={disabled}
        />
      )}
    </div>
  );
};

StepRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  onPatch: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const RecipeEditModal = ({ isOpen, onClose, server, recipe, onSaved }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [osFamily, setOsFamily] = useState('linux');
  const [brand, setBrand] = useState('bhyve');
  const [isDefault, setIsDefault] = useState(false);
  const [bootString, setBootString] = useState('');
  const [loginPrompt, setLoginPrompt] = useState('');
  const [shellPrompt, setShellPrompt] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState('');
  const [variableRows, setVariableRows] = useState([]);
  const [stepRows, setStepRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(recipe?.name ?? '');
    setDescription(recipe?.description ?? '');
    setOsFamily(recipe?.os_family ?? 'linux');
    setBrand(recipe?.brand ?? 'bhyve');
    setIsDefault(recipe?.is_default === true);
    setBootString(recipe?.boot_string ?? '');
    setLoginPrompt(recipe?.login_prompt ?? '');
    setShellPrompt(recipe?.shell_prompt ?? '');
    setTimeoutSeconds(
      recipe?.timeout_seconds === undefined || recipe?.timeout_seconds === null
        ? ''
        : String(recipe.timeout_seconds)
    );
    setVariableRows(seedVariableRows(recipe?.variables));
    setStepRows(seedStepRows(recipe?.steps));
    setError('');
  }, [isOpen, recipe]);

  const patchStep = (key, patch) =>
    setStepRows(prev => prev.map(row => (row.key === key ? { ...row, ...patch } : row)));
  const moveStep = (index, delta) =>
    setStepRows(prev => {
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row);
      return next;
    });

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('host.recipeEditModal.nameRequired'));
      return;
    }
    if (stepRows.length === 0) {
      setError(t('host.recipeEditModal.stepRequired'));
      return;
    }
    const body = {
      name: name.trim(),
      os_family: osFamily,
      brand,
      is_default: isDefault,
      steps: buildSteps(stepRows),
      variables: buildVariables(variableRows),
      ...(description.trim() && { description: description.trim() }),
      ...(bootString.trim() && { boot_string: bootString.trim() }),
      ...(loginPrompt.trim() && { login_prompt: loginPrompt.trim() }),
      ...(shellPrompt.trim() && { shell_prompt: shellPrompt.trim() }),
      ...(timeoutSeconds !== '' && { timeout_seconds: Number(timeoutSeconds) }),
    };
    setLoading(true);
    setError('');
    const result = recipe?.id
      ? await updateRecipe(server.hostname, server.port, server.protocol, recipe.id, body)
      : await createRecipe(server.hostname, server.port, server.protocol, body);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onSaved(
      recipe?.id
        ? t('host.recipeEditModal.recipeUpdated', { name: body.name })
        : t('host.recipeEditModal.recipeCreated', { name: body.name })
    );
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        recipe?.id
          ? t('host.recipeEditModal.editRecipeTitle', { name: recipe.name })
          : t('host.recipeEditModal.newRecipe')
      }
      icon="fas fa-scroll"
      submitText={recipe?.id ? t('host.recipeEditModal.save') : t('host.recipeEditModal.create')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="recipe-name">
            {t('host.recipeEditModal.name')}
          </label>
          <input
            id="recipe-name"
            className="form-control"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="recipe-os-family">
            {t('host.recipeEditModal.osFamily')}
          </label>
          <select
            id="recipe-os-family"
            className="form-select"
            value={osFamily}
            onChange={e => setOsFamily(e.target.value)}
          >
            {OS_FAMILIES.map(family => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-4">
          <label className="form-label" htmlFor="recipe-brand">
            {t('host.recipeEditModal.brand')}
          </label>
          <select
            id="recipe-brand"
            className="form-select"
            value={brand}
            onChange={e => setBrand(e.target.value)}
          >
            {BRANDS.map(entry => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="recipe-description">
            {t('host.recipeEditModal.description')}
          </label>
          <input
            id="recipe-description"
            className="form-control"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="recipe-default"
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="recipe-default">
              {t('host.recipeEditModal.defaultRecipeBefore')} <code>zone_setup</code>{' '}
              {t('host.recipeEditModal.defaultRecipeAfter')}
            </label>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="recipe-boot-string">
            {t('host.recipeEditModal.bootString')}
          </label>
          <input
            id="recipe-boot-string"
            className="form-control"
            placeholder={t('host.recipeEditModal.bootStringPlaceholder')}
            value={bootString}
            onChange={e => setBootString(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="recipe-login-prompt">
            {t('host.recipeEditModal.loginPrompt')}
          </label>
          <input
            id="recipe-login-prompt"
            className="form-control"
            placeholder="login:"
            value={loginPrompt}
            onChange={e => setLoginPrompt(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="recipe-shell-prompt">
            {t('host.recipeEditModal.shellPrompt')}
          </label>
          <input
            id="recipe-shell-prompt"
            className="form-control"
            placeholder=":~$"
            value={shellPrompt}
            onChange={e => setShellPrompt(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="recipe-timeout">
            {t('host.recipeEditModal.timeoutSeconds')}
          </label>
          <input
            id="recipe-timeout"
            className="form-control"
            type="number"
            min="1"
            placeholder="300"
            value={timeoutSeconds}
            onChange={e => setTimeoutSeconds(e.target.value)}
          />
        </div>
        <div className="col-12">
          <span className="form-label d-block">{t('host.recipeEditModal.variables')}</span>
          <p className="form-text text-muted mt-0 mb-1">
            {t('host.recipeEditModal.variablesHelpBefore')} <code>{'{{name}}'}</code>{' '}
            {t('host.recipeEditModal.variablesHelpAfter')}
          </p>
          <VariableRowsEditor
            rows={variableRows}
            onRowsChange={setVariableRows}
            idPrefix="recipe-edit"
          />
        </div>
        <div className="col-12">
          <span className="form-label d-block">{t('host.recipeEditModal.stepsRunInOrder')}</span>
          <div className="d-flex flex-column gap-2">
            {stepRows.map((row, index) => (
              <StepRow
                key={row.key}
                row={row}
                index={index}
                count={stepRows.length}
                onPatch={patch => patchStep(row.key, patch)}
                onMove={delta => moveStep(index, delta)}
                onDrop={() => setStepRows(prev => prev.filter(entry => entry.key !== row.key))}
              />
            ))}
            <div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() =>
                  setStepRows(prev => [
                    ...prev,
                    {
                      key: newRowKey(),
                      type: 'command',
                      pattern: '',
                      value: '',
                      content: '',
                      dest: '',
                      seconds: '',
                    },
                  ])
                }
              >
                <i className="fas fa-plus me-1" />
                {t('host.recipeEditModal.step')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

RecipeEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object.isRequired,
  recipe: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
};

export default RecipeEditModal;
