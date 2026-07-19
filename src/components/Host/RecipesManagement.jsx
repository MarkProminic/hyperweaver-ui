import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getAllMachines } from '../../api/machineAPI';
import { getRecipes, updateRecipe, deleteRecipe, testRecipe } from '../../api/provisioningAPI';
import { ConfirmModal, FormModal } from '../common';

import RecipeEditModal, { VariableRowsEditor } from './RecipeEditModal';

/**
 * zlogin recipe registry (zoneweaver/bhyve only): list/filter, create/edit,
 * delete, set-default per os_family+brand, and a test panel — dry-run
 * preview ({{var}} substitution, no execution) or a LIVE run over the
 * console of a chosen running machine.
 */

const OS_FAMILY_FILTERS = ['linux', 'solaris', 'windows'];
const BRAND_FILTERS = ['bhyve', 'lx', 'kvm'];

const TestRecipeModal = ({ isOpen, onClose, server, recipe }) => {
  const { t } = useTranslation();
  const [machines, setMachines] = useState([]);
  const [machineName, setMachineName] = useState('');
  const [variableRows, setVariableRows] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setMachineName('');
    setVariableRows([]);
    setResult(null);
    setError('');
    getAllMachines(server.hostname, server.port, server.protocol).then(response => {
      setMachines(response.success ? response.data?.machines || [] : []);
    });
  }, [isOpen, server]);

  const runTest = async dryRun => {
    if (!machineName) {
      setError(t('host.recipesManagement.pickMachine'));
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    const variables = Object.fromEntries(
      variableRows.filter(row => row.name.trim() !== '').map(row => [row.name.trim(), row.value])
    );
    const response = await testRecipe(server.hostname, server.port, server.protocol, recipe.id, {
      machine_name: machineName,
      ...(Object.keys(variables).length > 0 && { variables }),
      ...(dryRun && { dry_run: true }),
    });
    setLoading(false);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setResult({ dryRun, data: response.data || {} });
  };

  const resolvedSteps = Array.isArray(result?.data?.resolved_steps)
    ? result.data.resolved_steps
    : [];
  const unresolved = Array.isArray(result?.data?.unresolved_variables)
    ? result.data.unresolved_variables
    : [];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={() => runTest(true)}
      title={t('host.recipesManagement.testRecipeTitle', { name: recipe?.name || '' })}
      icon="fas fa-vial"
      submitText={t('host.recipesManagement.dryRun')}
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="recipe-test-machine">
            {t('host.recipesManagement.machine')}
          </label>
          <select
            id="recipe-test-machine"
            className="form-select"
            value={machineName}
            onChange={e => setMachineName(e.target.value)}
          >
            <option value="">{t('host.recipesManagement.select')}</option>
            {machines.map(row => (
              <option key={row.name} value={row.name}>
                {row.name}
                {(row.status || '').toLowerCase() === 'running' ? '' : ` (${row.status})`}
              </option>
            ))}
          </select>
          <span className="form-text text-muted">{t('host.recipesManagement.testHelp')}</span>
        </div>
        <div className="col-12 col-md-6">
          <span className="form-label d-block">
            {t('host.recipesManagement.callTimeVariables')}
          </span>
          <VariableRowsEditor
            rows={variableRows}
            onRowsChange={setVariableRows}
            idPrefix="recipe-test"
          />
        </div>
        <div className="col-12">
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => runTest(false)}
            disabled={loading}
            title={t('host.recipesManagement.runLiveTitle')}
          >
            <i className="fas fa-bolt me-2" />
            {t('host.recipesManagement.runLive')}
          </button>
        </div>
        {result && result.dryRun && (
          <div className="col-12">
            <h6 className="fw-bold">{t('host.recipesManagement.resolvedSteps')}</h6>
            {unresolved.length > 0 && (
              <p className="mb-1">
                {t('host.recipesManagement.unresolvedVariables')}{' '}
                {unresolved.map(name => (
                  <span className="badge text-bg-warning me-1" key={name}>
                    {name}
                  </span>
                ))}
              </p>
            )}
            <pre className="small mb-0">{JSON.stringify(resolvedSteps, null, 2)}</pre>
          </div>
        )}
        {result && !result.dryRun && (
          <div className="col-12">
            <h6 className="fw-bold">{t('host.recipesManagement.liveRunResult')}</h6>
            <pre className="small mb-0">
              {JSON.stringify(
                {
                  output: result.data.output,
                  errors: result.data.errors,
                  log: result.data.log,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </FormModal>
  );
};

TestRecipeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  server: PropTypes.object.isRequired,
  recipe: PropTypes.object,
};

const RecipesManagement = ({ server }) => {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');
  const [familyFilter, setFamilyFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  // null = closed; {} = new; a row = edit that recipe.
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [testTarget, setTestTarget] = useState(null);

  const report = (text, variant = 'info') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const loadRecipes = useCallback(async () => {
    if (!server) {
      return;
    }
    setLoading(true);
    const filters = {
      ...(familyFilter && { os_family: familyFilter }),
      ...(brandFilter && { brand: brandFilter }),
    };
    const result = await getRecipes(
      server.hostname,
      server.port,
      server.protocol,
      Object.keys(filters).length > 0 ? filters : null
    );
    setLoading(false);
    if (result.success) {
      const rows = Array.isArray(result.data) ? result.data : result.data?.recipes || [];
      setRecipes(rows);
    } else {
      report(t('host.recipesManagement.loadFailed', { message: result.message }), 'danger');
    }
  }, [server, familyFilter, brandFilter, t]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleSetDefault = async recipe => {
    setLoading(true);
    const result = await updateRecipe(server.hostname, server.port, server.protocol, recipe.id, {
      is_default: true,
    });
    setLoading(false);
    if (result.success) {
      report(
        t('host.recipesManagement.setDefaultDone', {
          name: recipe.name,
          osFamily: recipe.os_family,
          brand: recipe.brand,
        })
      );
      loadRecipes();
    } else {
      report(t('host.recipesManagement.setDefaultFailed', { message: result.message }), 'danger');
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    setLoading(true);
    const result = await deleteRecipe(server.hostname, server.port, server.protocol, target.id);
    setLoading(false);
    if (result.success) {
      report(t('host.recipesManagement.recipeDeleted', { name: target.name }));
      loadRecipes();
    } else {
      report(t('host.recipesManagement.deleteFailed', { message: result.message }), 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setEditTarget({})}
            disabled={loading}
          >
            <i className="fas fa-plus me-2" />
            {t('host.recipesManagement.newRecipe')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadRecipes}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            {t('host.recipesManagement.refresh')}
          </button>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm w-auto"
            aria-label={t('host.recipesManagement.filterByOsFamily')}
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
          >
            <option value="">{t('host.recipesManagement.allOsFamilies')}</option>
            {OS_FAMILY_FILTERS.map(family => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label={t('host.recipesManagement.filterByBrand')}
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
          >
            <option value="">{t('host.recipesManagement.allBrands')}</option>
            {BRAND_FILTERS.map(brand => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <span className="badge text-bg-secondary align-self-center">
            {t('host.recipesManagement.recipesCount', { count: recipes.length })}
          </span>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {loading && recipes.length === 0 && (
        <p className="text-muted">{t('host.recipesManagement.loading')}</p>
      )}
      {!loading && recipes.length === 0 && (
        <div className="alert alert-info">{t('host.recipesManagement.emptyState')}</div>
      )}

      {recipes.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th>{t('host.recipesManagement.colName')}</th>
                <th>{t('host.recipesManagement.colOsFamily')}</th>
                <th>{t('host.recipesManagement.colBrand')}</th>
                <th>{t('host.recipesManagement.colSteps')}</th>
                <th>{t('host.recipesManagement.colDescription')}</th>
                <th>{t('host.recipesManagement.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(recipe => (
                <tr key={recipe.id ?? recipe.name}>
                  <td>
                    <code className="small">{recipe.name}</code>{' '}
                    {recipe.is_default && (
                      <span className="badge text-bg-success">
                        {t('host.recipesManagement.default')}
                      </span>
                    )}
                  </td>
                  <td>{recipe.os_family}</td>
                  <td>{recipe.brand}</td>
                  <td>{Array.isArray(recipe.steps) ? recipe.steps.length : '-'}</td>
                  <td className="small">{recipe.description || '-'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0"
                        title={t('host.recipesManagement.edit')}
                        onClick={() => setEditTarget(recipe)}
                        disabled={loading}
                      >
                        <i className="fas fa-pen-to-square" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info py-0"
                        title={t('host.recipesManagement.testTitle')}
                        onClick={() => setTestTarget(recipe)}
                        disabled={loading}
                      >
                        <i className="fas fa-vial" />
                      </button>
                      {!recipe.is_default && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success py-0"
                          title={t('host.recipesManagement.makeDefaultTitle')}
                          onClick={() => handleSetDefault(recipe)}
                          disabled={loading}
                        >
                          <i className="fas fa-star" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0"
                        title={t('host.recipesManagement.delete')}
                        onClick={() => setDeleteTarget(recipe)}
                        disabled={loading}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecipeEditModal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        server={server}
        recipe={editTarget && editTarget.id ? editTarget : null}
        onSaved={text => {
          report(text, 'success');
          loadRecipes();
        }}
      />

      {testTarget && (
        <TestRecipeModal
          isOpen
          onClose={() => setTestTarget(null)}
          server={server}
          recipe={testTarget}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={t('host.recipesManagement.deleteRecipeTitle')}
          message={t('host.recipesManagement.deleteRecipeMessage', {
            name: deleteTarget.name,
            osFamily: deleteTarget.os_family,
            brand: deleteTarget.brand,
          })}
          confirmText={t('host.recipesManagement.delete')}
          loading={loading}
        />
      )}
    </div>
  );
};

RecipesManagement.propTypes = {
  server: PropTypes.shape({
    hostname: PropTypes.string,
    port: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    protocol: PropTypes.string,
  }),
};

export default RecipesManagement;
