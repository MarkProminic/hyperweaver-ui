import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const TopologyViewSwitcher = ({ currentView, onViewChange, layoutType, onLayoutChange }) => {
  const { t } = useTranslation();
  const views = [
    {
      id: 'physical',
      name: t('hostTools.TopologyViewSwitcher.physicalViewName'),
      icon: 'fa-ethernet',
      description: t('hostTools.TopologyViewSwitcher.physicalViewDescription'),
      color: 'is-success',
    },
    {
      id: 'logical',
      name: t('hostTools.TopologyViewSwitcher.virtualViewName'),
      icon: 'fa-network-wired',
      description: t('hostTools.TopologyViewSwitcher.virtualViewDescription'),
      color: 'is-primary',
    },
    {
      id: 'zone-centric',
      name: t('hostTools.TopologyViewSwitcher.zonesViewName'),
      icon: 'fa-server',
      description: t('hostTools.TopologyViewSwitcher.zonesViewDescription'),
      color: 'is-warning',
    },
    {
      id: 'bandwidth',
      name: t('hostTools.TopologyViewSwitcher.trafficViewName'),
      icon: 'fa-chart-line',
      description: t('hostTools.TopologyViewSwitcher.trafficViewDescription'),
      color: 'is-info',
    },
    {
      id: 'vlan',
      name: t('hostTools.TopologyViewSwitcher.vlansViewName'),
      icon: 'fa-tags',
      description: t('hostTools.TopologyViewSwitcher.vlansViewDescription'),
      color: 'is-link',
    },
    {
      id: 'troubleshoot',
      name: t('hostTools.TopologyViewSwitcher.debugViewName'),
      icon: 'fa-bug',
      description: t('hostTools.TopologyViewSwitcher.debugViewDescription'),
      color: 'is-danger',
    },
  ];

  const layouts = [
    {
      id: 'hierarchical',
      name: t('hostTools.TopologyViewSwitcher.hierarchicalLayoutName'),
      icon: 'fa-sitemap',
    },
    { id: 'force', name: t('hostTools.TopologyViewSwitcher.forceLayoutName'), icon: 'fa-asterisk' },
    {
      id: 'circular',
      name: t('hostTools.TopologyViewSwitcher.circularLayoutName'),
      icon: 'fa-circle-notch',
    },
    { id: 'grid', name: t('hostTools.TopologyViewSwitcher.gridLayoutName'), icon: 'fa-th' },
  ];

  return (
    <div className="mb-3">
      {/* View Tabs */}
      <div className="d-flex align-items-center mb-3">
        <ul className="nav nav-tabs">
          {views.map(view => (
            <li key={view.id} className="nav-item">
              <button
                type="button"
                className={`nav-link ${currentView === view.id ? 'active' : ''}`}
                onClick={() => onViewChange(view.id)}
                title={view.description}
              >
                <i className={`fas ${view.icon} me-2`} />
                <span>{view.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Layout Selector */}
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="small fw-semibold me-3">
            {t('hostTools.TopologyViewSwitcher.layoutLabel')}
          </span>
          <div className="btn-group">
            {layouts.map(layout => (
              <button
                key={layout.id}
                type="button"
                className={`btn btn-sm ${layoutType === layout.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onLayoutChange(layout.id)}
                title={layout.name}
              >
                <i className={`fas ${layout.icon} me-2`} />
                <span>{layout.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <p className="small text-muted mb-0">
            {views.find(v => v.id === currentView)?.description}
          </p>
        </div>
      </div>
    </div>
  );
};

TopologyViewSwitcher.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
  layoutType: PropTypes.string.isRequired,
  onLayoutChange: PropTypes.func.isRequired,
};

export default TopologyViewSwitcher;
