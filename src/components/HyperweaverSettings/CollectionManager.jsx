import axios from 'axios';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { buildCollectionItemFields } from '../../utils/settingsUtils';
import { ConfirmModal, FormModal } from '../common';

import FieldRenderer from './FieldRenderer';

const KEY_PATTERN = /^[a-z0-9_]+$/i;
const EMPTY_OBJ = {};

/**
 * CollectionManager - generic UI for a keyed config collection (`type: collection`).
 *
 * Entirely schema-driven from the field's `collection` metadata (item_schema,
 * secret_fields, labels, requires_restart). Renders the list, and add/edit forms
 * built from item_schema through the shared FieldRenderer — so every collection
 * gets the same field types, validation, and conditionals as top-level settings,
 * with zero collection-specific code. Talks only to the generic
 * /api/settings/collections/<path> endpoints. Secret fields are write-only:
 * blank on edit keeps the stored value.
 */
const CollectionManager = ({ field, setMsg, setRequiresRestart, loading }) => {
  const { t } = useTranslation();
  const { path, label } = field;
  const { icon, itemSchema, itemLabelField, secretFields, keyLabel, itemNoun } = field.collection;

  const itemFields = useMemo(() => buildCollectionItemFields(itemSchema), [itemSchema]);

  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [itemKey, setItemKey] = useState('');
  const [itemValues, setItemValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const endpoint = `/api/settings/collections/${encodeURIComponent(path)}`;

  const defaultItemValues = useCallback(() => {
    const out = {};
    itemFields.forEach(f => {
      if (f.value !== undefined) {
        out[f.path] = f.value;
      } else {
        out[f.path] = f.type === 'boolean' ? false : '';
      }
    });
    return out;
  }, [itemFields]);

  const loadItems = useCallback(async () => {
    try {
      setListLoading(true);
      const response = await axios.get(endpoint);
      if (response.data.success) {
        setItems(response.data.items);
      } else {
        setMsg(
          t('settings.collectionManager.failedToLoad', { label, message: response.data.message })
        );
      }
    } catch (error) {
      setMsg(
        t('settings.collectionManager.errorLoading', {
          label,
          error: error.response?.data?.message || error.message,
        })
      );
    } finally {
      setListLoading(false);
    }
  }, [endpoint, label, setMsg, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleItemFieldChange = useCallback((key, value) => {
    setItemValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSslNoop = useCallback(() => {}, []);

  const openAdd = useCallback(() => {
    setEditingKey(null);
    setItemKey('');
    setItemValues(defaultItemValues());
    setShowModal(true);
  }, [defaultItemValues]);

  const openEdit = useCallback(
    item => {
      setEditingKey(item._key);
      setItemKey(item._key);
      const vals = defaultItemValues();
      itemFields.forEach(f => {
        if (secretFields.includes(f.path)) {
          vals[f.path] = ''; // write-only: blank keeps the stored secret
        } else if (item[f.path] !== undefined) {
          vals[f.path] = item[f.path];
        }
      });
      setItemValues(vals);
      setShowModal(true);
    },
    [defaultItemValues, itemFields, secretFields]
  );

  const validate = useCallback(() => {
    const isEdit = editingKey !== null;
    if (!isEdit) {
      if (!itemKey) {
        return t('settings.collectionManager.keyRequired', { keyLabel });
      }
      if (!KEY_PATTERN.test(itemKey)) {
        return t('settings.collectionManager.keyPattern', { keyLabel });
      }
    }
    const missing = itemFields.find(f => {
      if (!f.required || f.type === 'boolean') {
        return false;
      }
      if (secretFields.includes(f.path) && isEdit) {
        return false; // blank keeps the existing secret
      }
      const v = itemValues[f.path];
      return v === undefined || v === null || v === '';
    });
    return missing ? t('settings.collectionManager.fieldRequired', { label: missing.label }) : null;
  }, [editingKey, itemKey, keyLabel, itemFields, secretFields, itemValues, t]);

  const submitItem = useCallback(
    async e => {
      e.preventDefault();
      const err = validate();
      if (err) {
        setMsg(err);
        return;
      }
      const isEdit = editingKey !== null;
      try {
        setSubmitting(true);
        const response = isEdit
          ? await axios.put(`${endpoint}/${encodeURIComponent(editingKey)}`, {
              values: itemValues,
            })
          : await axios.post(endpoint, { key: itemKey, values: itemValues });

        if (response.data.success) {
          setMsg(response.data.message);
          if (response.data.requiresRestart) {
            setRequiresRestart(true);
          }
          setShowModal(false);
          await loadItems();
        } else {
          setMsg(
            t('settings.collectionManager.failedToSave', {
              itemNoun,
              message: response.data.message,
            })
          );
        }
      } catch (error) {
        setMsg(
          t('settings.collectionManager.errorSaving', {
            itemNoun,
            error: error.response?.data?.message || error.message,
          })
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      validate,
      editingKey,
      endpoint,
      itemKey,
      itemValues,
      itemNoun,
      setMsg,
      setRequiresRestart,
      loadItems,
      t,
    ]
  );

  const deleteItem = useCallback(async () => {
    const key = confirmDelete;
    setConfirmDelete(null);
    try {
      setSubmitting(true);
      const response = await axios.delete(`${endpoint}/${encodeURIComponent(key)}`);
      if (response.data.success) {
        setMsg(response.data.message);
        if (response.data.requiresRestart) {
          setRequiresRestart(true);
        }
        await loadItems();
      } else {
        setMsg(
          t('settings.collectionManager.failedToDelete', {
            itemNoun,
            message: response.data.message,
          })
        );
      }
    } catch (error) {
      setMsg(
        t('settings.collectionManager.errorDeleting', {
          itemNoun,
          error: error.response?.data?.message || error.message,
        })
      );
    } finally {
      setSubmitting(false);
    }
  }, [confirmDelete, endpoint, itemNoun, setMsg, setRequiresRestart, loadItems, t]);

  const busy = loading || submitting;
  const rowLabel = item => (itemLabelField && item[itemLabelField]) || item._key;

  const renderList = () => {
    if (listLoading) {
      return (
        <div className="text-center text-muted py-3">
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          {t('settings.collectionManager.loading')}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="alert alert-warning mb-0">
          <p className="small mb-0">
            {t('settings.collectionManager.emptyState', {
              label: label.toLowerCase(),
              itemNoun,
            })}
          </p>
        </div>
      );
    }

    return (
      <div className="d-flex flex-column gap-2">
        {items.map(item => (
          <div key={item._key} className="card">
            <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-2 py-2">
              <div>
                <span className="fw-semibold">{rowLabel(item)}</span>
                <span className="badge text-bg-secondary ms-2">{item._key}</span>
                {typeof item.enabled === 'boolean' &&
                  (item.enabled ? (
                    <span className="badge text-bg-success ms-2">
                      {t('settings.collectionManager.enabled')}
                    </span>
                  ) : (
                    <span className="badge text-bg-secondary ms-2">
                      {t('settings.collectionManager.disabled')}
                    </span>
                  ))}
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => openEdit(item)}
                  disabled={busy}
                >
                  <i className="fas fa-pen me-1" />
                  {t('settings.collectionManager.edit')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setConfirmDelete(item._key)}
                  disabled={busy}
                >
                  <i className="fas fa-trash me-1" />
                  {t('settings.collectionManager.delete')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
        {field.description ? (
          <p className="text-muted small mb-0">{field.description}</p>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-primary btn-sm" onClick={openAdd} disabled={busy}>
          <i className="fas fa-plus me-2" />
          <span>{t('settings.collectionManager.addItem', { itemNoun })}</span>
        </button>
      </div>

      {renderList()}

      {showModal && (
        <FormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={submitItem}
          title={
            editingKey
              ? t('settings.collectionManager.editItem', { itemNoun })
              : t('settings.collectionManager.addItem', { itemNoun })
          }
          icon={icon}
          submitText={
            submitting
              ? t('settings.collectionManager.saving')
              : t('settings.collectionManager.saveItem', { itemNoun })
          }
          submitVariant="is-primary"
          loading={submitting}
        >
          <div className="mb-3">
            <label className="form-label" htmlFor="collection-item-key">
              {keyLabel} <span className="text-danger">*</span>
            </label>
            <input
              id="collection-item-key"
              className="form-control"
              type="text"
              value={itemKey}
              onChange={e => setItemKey(e.target.value.toLowerCase())}
              disabled={submitting || editingKey !== null}
              required
            />
            <p className="form-text text-muted">
              {editingKey
                ? t('settings.collectionManager.identifierLocked')
                : t('settings.collectionManager.identifierHint')}
            </p>
          </div>

          <div className="row g-3">
            {itemFields.map(f => (
              <div
                key={f.path}
                className={
                  f.type === 'textarea' || f.type === 'array' ? 'col-12' : 'col-12 col-lg-6'
                }
              >
                <FieldRenderer
                  field={f}
                  values={itemValues}
                  sslFiles={EMPTY_OBJ}
                  uploadingFiles={EMPTY_OBJ}
                  loading={submitting}
                  onFieldChange={handleItemFieldChange}
                  onSslFileUpload={handleSslNoop}
                />
              </div>
            ))}
          </div>

          {editingKey && secretFields.length > 0 && (
            <p className="form-text text-muted">
              {t('settings.collectionManager.secretFieldsHint')}
            </p>
          )}
        </FormModal>
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteItem}
        title={t('settings.collectionManager.deleteItem', { itemNoun })}
        message={t('settings.collectionManager.deleteItemConfirm', {
          itemNoun,
          key: confirmDelete,
        })}
        confirmText={t('settings.collectionManager.deleteItem', { itemNoun })}
        confirmVariant="is-danger"
        icon="fas fa-trash"
        loading={submitting}
      />
    </div>
  );
};

CollectionManager.propTypes = {
  field: PropTypes.shape({
    path: PropTypes.string.isRequired,
    label: PropTypes.string,
    description: PropTypes.string,
    collection: PropTypes.shape({
      icon: PropTypes.string,
      itemSchema: PropTypes.object.isRequired,
      itemLabelField: PropTypes.string,
      secretFields: PropTypes.arrayOf(PropTypes.string).isRequired,
      keyLabel: PropTypes.string.isRequired,
      itemNoun: PropTypes.string.isRequired,
      requiresRestart: PropTypes.bool,
    }).isRequired,
  }).isRequired,
  setMsg: PropTypes.func.isRequired,
  setRequiresRestart: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default CollectionManager;
