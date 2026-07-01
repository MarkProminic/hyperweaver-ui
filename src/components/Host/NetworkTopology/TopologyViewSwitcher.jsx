import PropTypes from 'prop-types';

const TopologyViewSwitcher = ({ currentView, onViewChange, layoutType, onLayoutChange }) => {
  const views = [
    {
      id: 'physical',
      name: 'Physical',
      icon: 'fa-ethernet',
      description: 'Hardware NICs, aggregates, and physical connections',
      color: 'is-success',
    },
    {
      id: 'logical',
      name: 'Virtual',
      icon: 'fa-network-wired',
      description: 'VNICs, etherstubs, and logical connections',
      color: 'is-primary',
    },
    {
      id: 'zone-centric',
      name: 'Zones',
      icon: 'fa-server',
      description: 'Zone-centered network topology',
      color: 'is-warning',
    },
    {
      id: 'bandwidth',
      name: 'Traffic',
      icon: 'fa-chart-line',
      description: 'Live bandwidth and traffic flow analysis',
      color: 'is-info',
    },
    {
      id: 'vlan',
      name: 'VLANs',
      icon: 'fa-tags',
      description: 'Network segmentation and VLAN topology',
      color: 'is-link',
    },
    {
      id: 'troubleshoot',
      name: 'Debug',
      icon: 'fa-bug',
      description: 'Troubleshooting and diagnostics view',
      color: 'is-danger',
    },
  ];

  const layouts = [
    { id: 'hierarchical', name: 'Hierarchical', icon: 'fa-sitemap' },
    { id: 'force', name: 'Force', icon: 'fa-asterisk' },
    { id: 'circular', name: 'Circular', icon: 'fa-circle-notch' },
    { id: 'grid', name: 'Grid', icon: 'fa-th' },
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
          <span className="small fw-semibold me-3">Layout:</span>
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
