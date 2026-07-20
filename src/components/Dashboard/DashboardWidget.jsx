import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * One dashboard widget shell — a slim title bar (drag grip, collapse,
 * hide) over the section content. The bar is the HTML5 drag handle;
 * dropping one widget onto another reorders the layout.
 */
const DashboardWidget = ({
  id,
  title,
  collapsed,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onToggleCollapsed,
  onHide,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`mb-3 ${dragging ? 'opacity-50' : ''}`}
      role="presentation"
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault();
        onDropOn(id);
      }}
    >
      <div className="d-flex align-items-center gap-2 bg-body-tertiary border rounded-top px-2 py-1">
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-muted"
          style={{ cursor: 'grab' }}
          draggable
          onDragStart={() => onDragStart(id)}
          onDragEnd={onDragEnd}
          aria-label={title}
        >
          <i className="fas fa-grip-vertical" />
        </button>
        <span className="small fw-bold flex-grow-1">{title}</span>
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-body"
          onClick={() => onToggleCollapsed(id)}
          title={collapsed ? t('dashboard.widgets.expand') : t('dashboard.widgets.collapse')}
        >
          <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-down'}`} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-link p-0 text-body"
          onClick={() => onHide(id)}
          title={t('dashboard.widgets.hide')}
        >
          <i className="fas fa-xmark" />
        </button>
      </div>
      {!collapsed && <div className="border border-top-0 rounded-bottom p-2">{children}</div>}
    </div>
  );
};

DashboardWidget.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  collapsed: PropTypes.bool,
  dragging: PropTypes.bool,
  onDragStart: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onDropOn: PropTypes.func.isRequired,
  onToggleCollapsed: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default DashboardWidget;
