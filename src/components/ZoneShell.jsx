import PropTypes from 'prop-types';
import { memo } from 'react';
import { XTerm } from 'react-xtermjs';

import { useZoneTerminal } from '../contexts/ZoneTerminalContext';

const ZoneShell = memo(({ zoneName, readOnly = false, style = {}, className = '' }) => {
  const { getZoneAddons, getZoneOptions } = useZoneTerminal();

  // Get addons and options for this specific zone
  const addons = getZoneAddons(zoneName, readOnly);
  const options = getZoneOptions(readOnly);

  if (!addons || addons.length === 0) {
    return (
      <div className={`hw-zone-shell-container ${className || ''}`} style={style}>
        <div className="h-100 w-100 d-flex align-items-center justify-content-center text-white-50">
          <div className="text-center">
            <i className="fas fa-terminal fa-2x fa-pulse mb-2" />
            <p>Connecting to {zoneName}...</p>
            <p className="small text-muted">{readOnly ? 'Read-only mode' : 'Interactive mode'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`hw-zone-shell-container ${className || ''}`} style={style}>
      <XTerm
        className="hw-zone-shell-terminal h-100 w-100"
        style={{ height: '100%', width: '100%' }}
        addons={addons}
        options={options}
      />
    </div>
  );
});

ZoneShell.displayName = 'ZoneShell';

ZoneShell.propTypes = {
  zoneName: PropTypes.string.isRequired,
  readOnly: PropTypes.bool,
  style: PropTypes.object,
  className: PropTypes.string,
};

export default ZoneShell;
