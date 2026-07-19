import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

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
      setError('Pick a machine — the test resolves (and a live run executes) against it.');
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
      title={`Test Recipe: ${recipe?.name || ''}`}
      icon="fas fa-vial"
      submitText="Dry Run"
      loading={loading}
      showCancelButton
    >
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="recipe-test-machine">
            Machine
          </label>
          <select
            id="recipe-test-machine"
            className="form-select"
            value={machineName}
            onChange={e => setMachineName(e.target.value)}
          >
            <option value="">Select…</option>
            {machines.map(row => (
              <option key={row.name} value={row.name}>
                {row.name}
                {(row.status || '').toLowerCase() === 'running' ? '' : ` (${row.status})`}
              </option>
            ))}
          </select>
          <span className="form-text text-muted">
            Dry Run only resolves variables. Run Live drives the zlogin console of a RUNNING
            machine.
          </span>
        </div>
        <div className="col-12 col-md-6">
          <span className="form-label d-block">Call-time variables (merge over the recipe's)</span>
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
            title="EXECUTES the recipe over the machine's console — not a preview"
          >
            <i className="fas fa-bolt me-2" />
            Run Live
          </button>
        </div>
        {result && result.dryRun && (
          <div className="col-12">
            <h6 className="fw-bold">Resolved steps</h6>
            {unresolved.length > 0 && (
              <p className="mb-1">
                Unresolved variables:{' '}
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
            <h6 className="fw-bold">Live run result</h6>
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
      report(`Failed to load recipes: ${result.message}`, 'danger');
    }
  }, [server, familyFilter, brandFilter]);

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
      report(`"${recipe.name}" is now the default for ${recipe.os_family}/${recipe.brand}.`);
      loadRecipes();
    } else {
      report(`Set-default failed: ${result.message}`, 'danger');
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    setLoading(true);
    const result = await deleteRecipe(server.hostname, server.port, server.protocol, target.id);
    setLoading(false);
    if (result.success) {
      report(`Recipe "${target.name}" deleted.`);
      loadRecipes();
    } else {
      report(`Delete failed: ${result.message}`, 'danger');
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
            New Recipe
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={loadRecipes}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2" />
            Refresh
          </button>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Filter by OS family"
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
          >
            <option value="">All OS families</option>
            {OS_FAMILY_FILTERS.map(family => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
          <select
            className="form-select form-select-sm w-auto"
            aria-label="Filter by brand"
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
          >
            <option value="">All brands</option>
            {BRAND_FILTERS.map(brand => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <span className="badge text-bg-secondary align-self-center">
            {recipes.length} recipes
          </span>
        </div>
      </div>

      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}
      {loading && recipes.length === 0 && <p className="text-muted">Loading…</p>}
      {!loading && recipes.length === 0 && (
        <div className="alert alert-info">
          No recipes yet — the seeded defaults appear here once the agent ships them, or create
          one.
        </div>
      )}

      {recipes.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>OS Family</th>
                <th>Brand</th>
                <th>Steps</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(recipe => (
                <tr key={recipe.id ?? recipe.name}>
                  <td>
                    <code className="small">{recipe.name}</code>{' '}
                    {recipe.is_default && <span className="badge text-bg-success">default</span>}
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
                        title="Edit"
                        onClick={() => setEditTarget(recipe)}
                        disabled={loading}
                      >
                        <i className="fas fa-pen-to-square" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info py-0"
                        title="Test — dry-run preview or live console run"
                        onClick={() => setTestTarget(recipe)}
                        disabled={loading}
                      >
                        <i className="fas fa-vial" />
                      </button>
                      {!recipe.is_default && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success py-0"
                          title="Make this the default for its OS family + brand"
                          onClick={() => handleSetDefault(recipe)}
                          disabled={loading}
                        >
                          <i className="fas fa-star" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0"
                        title="Delete"
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
          title="Delete Recipe"
          message={`Delete recipe "${deleteTarget.name}" (${deleteTarget.os_family}/${deleteTarget.brand})? Machines are unaffected; zone_setup falls back to the remaining default.`}
          confirmText="Delete"
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
