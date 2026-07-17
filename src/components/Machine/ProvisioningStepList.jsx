import PropTypes from 'prop-types';
import { useState } from 'react';

import { applyPatch } from './ProvisioningVarRows';

/**
 * The generic ordered card list the Folders and Playbooks tabs share (the
 * Roles tab keeps its own — catalog, drop zones, and depends_on advisories
 * make it too custom): numbered cards, drag reorder, chevron expand for the
 * full field set, trash. Array order IS the sync/run order on the wire.
 */
const StepCardList = ({ rows, onChange, disabled, addLabel, makeRow, renderTitle, renderBody }) => {
  const [dragId, setDragId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = uiId =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(uiId)) {
        next.delete(uiId);
      } else {
        next.add(uiId);
      }
      return next;
    });

  const moveOver = overId => {
    if (dragId === null || dragId === overId) {
      return;
    }
    const from = rows.findIndex(row => row._ui_id === dragId);
    const to = rows.findIndex(row => row._ui_id === overId);
    if (from === -1 || to === -1) {
      return;
    }
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const patchRow = (uiId, patch) =>
    onChange(rows.map(row => (row._ui_id === uiId ? applyPatch(row, patch) : row)));

  const addRow = () => {
    const row = makeRow();
    // A fresh row opens straight into its fields.
    setExpanded(prev => new Set(prev).add(row._ui_id));
    onChange([...rows, row]);
  };

  return (
    <div className="d-flex flex-column gap-2" role="list">
      {rows.map((row, index) => (
        <div
          key={row._ui_id}
          className={`hw-role-card ${dragId === row._ui_id ? 'hw-dragging' : ''}`}
          role="listitem"
          onDragOver={e => {
            e.preventDefault();
            moveOver(row._ui_id);
          }}
        >
          <div className="hw-rc-head">
            <button
              type="button"
              className="btn btn-link p-0 text-muted"
              draggable={!disabled}
              style={{ cursor: 'grab' }}
              title="Drag to reorder"
              onDragStart={() => setDragId(row._ui_id)}
              onDragEnd={() => setDragId(null)}
            >
              <i className="fas fa-grip-vertical" />
            </button>
            <span className="hw-run-num">{index + 1}</span>
            <div className="hw-rc-name">{renderTitle(row)}</div>
            <div className="hw-rc-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary hw-expander"
                title="Details"
                aria-expanded={expanded.has(row._ui_id)}
                disabled={disabled}
                onClick={() => toggleExpanded(row._ui_id)}
              >
                <i className="fas fa-chevron-down" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                aria-label="Remove"
                title="Remove"
                disabled={disabled}
                onClick={() => onChange(rows.filter(entry => entry._ui_id !== row._ui_id))}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
          {expanded.has(row._ui_id) && (
            <div className="hw-rc-body">
              {renderBody(row, patch => patchRow(row._ui_id, patch))}
            </div>
          )}
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={addRow}
          disabled={disabled}
        >
          <i className="fas fa-plus me-2" />
          {addLabel}
        </button>
      </div>
    </div>
  );
};

StepCardList.propTypes = {
  rows: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  addLabel: PropTypes.string.isRequired,
  // makeRow() — the editor owns row identity (_ui_id tagging).
  makeRow: PropTypes.func.isRequired,
  renderTitle: PropTypes.func.isRequired,
  renderBody: PropTypes.func.isRequired,
};

export default StepCardList;
