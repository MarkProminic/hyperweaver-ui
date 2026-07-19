import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { humanSize } from './zfsUtils';

/**
 * Enumerated property rows for pools and datasets — writable properties
 * (any real source) edit inline; read-only ones (source '-') render static.
 * Edits collect in the parent's diff map; only CHANGED keys ride the PUT.
 */

const ZfsPropertiesEditor = ({ properties, edits, onEdit, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="border rounded" style={{ maxHeight: '24rem', overflowY: 'auto' }}>
      <table className="table table-sm table-striped small mb-0 align-middle">
        <thead>
          <tr>
            <th scope="col">{t('host.zfsPropertiesEditor.propertyHeader')}</th>
            <th scope="col" style={{ width: '45%' }}>
              {t('host.zfsPropertiesEditor.valueHeader')}
            </th>
            <th scope="col">{t('host.zfsPropertiesEditor.sourceHeader')}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(properties).map(([key, entry]) => {
            const current = entry?.value ?? String(entry);
            const readOnly = (entry?.source ?? '-') === '-';
            const edited = edits[key] !== undefined && edits[key] !== current;
            return (
              <tr key={key} className={edited ? 'table-warning' : ''}>
                <td>
                  <code className="small">{key}</code>
                </td>
                <td>
                  {readOnly ? (
                    <span title={current}>{humanSize(current)}</span>
                  ) : (
                    <input
                      className="form-control form-control-sm font-monospace"
                      type="text"
                      aria-label={t('host.zfsPropertiesEditor.valueLabel', { key })}
                      value={edits[key] ?? current}
                      onChange={e => onEdit(key, e.target.value)}
                      disabled={disabled}
                    />
                  )}
                </td>
                <td className="text-muted">{entry?.source || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

ZfsPropertiesEditor.propTypes = {
  properties: PropTypes.object.isRequired,
  edits: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/** The CHANGED-only diff a submit sends — {} when nothing differs. */
export const propertyEdits = (properties, edits) => {
  const diff = {};
  Object.entries(edits).forEach(([key, value]) => {
    const current = properties[key]?.value ?? String(properties[key]);
    if (value !== current) {
      diff[key] = value;
    }
  });
  return diff;
};

export default ZfsPropertiesEditor;
