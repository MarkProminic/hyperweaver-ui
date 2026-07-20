import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Right-click context menu for the sidebar tree. Pure presenter: the tree
 * hands it {x, y, title, items} where items are {key, icon, label, danger?,
 * onClick} or {divider: true}. Theme rides the --bs-* tokens, so light/dark
 * follow ThemeContext with no menu-side logic. Esc, click-away, and a second
 * right-click elsewhere all close it (a right-click that OPENED a new menu
 * marks its event defaultPrevented, which the away-listener respects).
 */
const SidebarContextMenu = ({ menu, onClose }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setPos({
      x: Math.max(4, Math.min(menu.x, window.innerWidth - rect.width - 8)),
      y: Math.max(4, Math.min(menu.y, window.innerHeight - rect.height - 8)),
    });
  }, [menu]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const away = event => {
      if (event.type === 'contextmenu' && event.defaultPrevented) {
        return;
      }
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', away);
    window.addEventListener('contextmenu', away);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', away);
      window.removeEventListener('contextmenu', away);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="hw-ctx-menu" style={{ left: pos.x, top: pos.y }} role="menu">
      <div className="hw-ctx-title text-truncate">{menu.title}</div>
      {menu.items.map((item, index) =>
        item.divider ? (
          <hr key={`divider-${String(index)}`} className="hw-ctx-divider" />
        ) : (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            className={`hw-ctx-item ${item.danger ? 'hw-ctx-danger' : ''}`}
            onClick={() => {
              onClose();
              item.onClick();
            }}
          >
            <i className={`${item.icon} me-2`} />
            {item.label}
          </button>
        )
      )}
    </div>
  );
};

SidebarContextMenu.propTypes = {
  menu: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    items: PropTypes.array.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SidebarContextMenu;
