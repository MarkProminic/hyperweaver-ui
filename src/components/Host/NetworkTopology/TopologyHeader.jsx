import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * Topology controls: scope toggle, the two lenses, isolation clear, feed
 * pulse, and fullscreen. Everything else in the old header (6 view tabs,
 * 4 layouts, edge-type picker) is deliberately gone.
 */
const TopologyHeader = ({
  scope,
  onScopeChange,
  multiHostAvailable,
  lens,
  onLensChange,
  isolatedNet,
  onClearIsolation,
  feedLive,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { t } = useTranslation();

  const lensButton = (id, icon, label) => (
    <button
      type="button"
      className={`btn btn-sm ${lens === id ? 'btn-primary' : 'btn-light'}`}
      onClick={() => onLensChange(lens === id ? null : id)}
      title={label}
    >
      <i className={`fas ${icon} me-2`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="hw-topo-header d-flex flex-wrap align-items-center gap-2">
      {multiHostAvailable && (
        <div className="btn-group">
          <button
            type="button"
            className={`btn btn-sm ${scope === 'host' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => onScopeChange('host')}
          >
            {t('hostTools.topology.scopeHost')}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${scope === 'all' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => onScopeChange('all')}
          >
            {t('hostTools.topology.scopeAll')}
          </button>
        </div>
      )}

      <div className="btn-group">
        {lensButton('traffic', 'fa-chart-line', t('hostTools.topology.lensTraffic'))}
        {lensButton('debug', 'fa-bug', t('hostTools.topology.lensDebug'))}
      </div>

      {isolatedNet && (
        <button type="button" className="btn btn-sm btn-warning" onClick={onClearIsolation}>
          <i className="fas fa-filter-circle-xmark me-2" />
          <span>{t('hostTools.topology.clearIsolation')}</span>
        </button>
      )}

      <span
        className={`hw-topo-pulse ms-auto ${feedLive ? 'hw-topo-pulse-live' : ''}`}
        title={feedLive ? t('hostTools.topology.pulseLive') : t('hostTools.topology.pulseNoFeed')}
      >
        <span className="hw-topo-pulse-dot" />
        {feedLive ? t('hostTools.topology.pulseLive') : t('hostTools.topology.pulseNoFeed')}
      </span>

      <button
        type="button"
        className={`btn btn-sm ${isFullscreen ? 'btn-danger' : 'btn-light'}`}
        onClick={onToggleFullscreen}
        title={
          isFullscreen
            ? t('hostTools.topology.exitFullscreen')
            : t('hostTools.topology.enterFullscreen')
        }
      >
        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
      </button>
    </div>
  );
};

TopologyHeader.propTypes = {
  scope: PropTypes.string.isRequired,
  onScopeChange: PropTypes.func.isRequired,
  multiHostAvailable: PropTypes.bool.isRequired,
  lens: PropTypes.string,
  onLensChange: PropTypes.func.isRequired,
  isolatedNet: PropTypes.string,
  onClearIsolation: PropTypes.func.isRequired,
  feedLive: PropTypes.bool.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  onToggleFullscreen: PropTypes.func.isRequired,
};

export default TopologyHeader;
