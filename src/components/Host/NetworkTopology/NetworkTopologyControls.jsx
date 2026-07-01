import PropTypes from 'prop-types';

const getNodeTypeLabel = nodeType => {
  const labels = {
    physicalNic: 'Physical NICs',
    aggregate: 'Aggregates',
    etherstub: 'Etherstubs',
    vnic: 'VNICs',
    zone: 'Zones',
  };
  return labels[nodeType] || nodeType;
};

const NetworkTopologyControls = props => {
  const {
    filters,
    onFilterChange,
    showFilters,
    onToggleFilters,
    networkData,
    horizontal = false,
    edgeType = 'floating',
    onEdgeTypeChange,
  } = props;

  const handleNodeTypeChange = nodeType => {
    onFilterChange({
      nodeTypes: {
        ...filters.nodeTypes,
        [nodeType]: !filters.nodeTypes[nodeType],
      },
    });
  };

  const handleEdgeTypeChange = type => {
    onEdgeTypeChange?.(type);
  };

  // Get available VLANs and zones from network data
  const availableVlans = [
    ...new Set((networkData?.vnics || []).filter(vnic => vnic.vid).map(vnic => vnic.vid)),
  ].sort((a, b) => parseInt(a) - parseInt(b));

  const availableZones = [...new Set((networkData?.zones || []).map(zone => zone.name))].sort();

  return (
    <div className="network-topology-controls">
      {/* Header with main controls */}
      <div
        className={`d-flex justify-content-between align-items-center ${horizontal ? '' : 'mb-3'}`}
      >
        <div className="d-flex align-items-center gap-2">
          {/* Edge Type Toggle */}
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-1" htmlFor="edge-type-select">
              Edge Type:
            </label>
            <select
              id="edge-type-select"
              className="form-select form-select-sm w-auto"
              value={edgeType}
              onChange={e => handleEdgeTypeChange(e.target.value)}
              title="Select edge visualization type"
            >
              <optgroup label="Custom Edges">
                <option value="floating">Floating Edges</option>
                <option value="bandwidth">Enhanced Bandwidth</option>
                <option value="bidirectional">Bidirectional</option>
              </optgroup>
              <optgroup label="React Flow Built-in">
                <option value="default">Bezier (Default)</option>
                <option value="straight">Straight Lines</option>
                <option value="step">Step Lines</option>
                <option value="smoothstep">Smooth Step</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Filters Toggle */}
          <button
            type="button"
            className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-light'}`}
            onClick={onToggleFilters}
            title="Toggle filters"
          >
            <i className="fas fa-filter me-2" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Expandable filter controls */}
      {showFilters && (
        <div className="card">
          <div className={`card-body ${horizontal ? 'row g-3' : ''}`}>
            {/* Node Type Filters */}
            <div className={horizontal ? 'col' : 'mb-4'}>
              <h6 className="fs-6 fw-bold mb-2">Node Types</h6>
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(filters.nodeTypes).map(([nodeType, enabled]) => (
                  <div key={nodeType} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`nodetype-${nodeType}`}
                      checked={enabled}
                      onChange={() => handleNodeTypeChange(nodeType)}
                    />
                    <label className="form-check-label" htmlFor={`nodetype-${nodeType}`}>
                      {getNodeTypeLabel(nodeType)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* VLAN Filters */}
            {availableVlans.length > 0 && (
              <div className={horizontal ? 'col' : 'mb-4'}>
                <h6 className="fs-6 fw-bold mb-2">VLANs</h6>
                <div className="d-flex flex-wrap gap-2">
                  {availableVlans.map(vlan => (
                    <div key={vlan} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`vlan-${vlan}`}
                        checked={filters.vlans?.includes(vlan) || false}
                        onChange={e => {
                          const currentVlans = filters.vlans || [];
                          const newVlans = e.target.checked
                            ? [...currentVlans, vlan]
                            : currentVlans.filter(v => v !== vlan);
                          onFilterChange({ vlans: newVlans });
                        }}
                      />
                      <label className="form-check-label" htmlFor={`vlan-${vlan}`}>
                        VLAN {vlan}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zone Filters */}
            {availableZones.length > 0 && (
              <div className={horizontal ? 'col' : 'mb-4'}>
                <h6 className="fs-6 fw-bold mb-2">Zones</h6>
                <div className="d-flex flex-wrap gap-2">
                  {availableZones.map(zone => (
                    <div key={zone} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`zone-${zone}`}
                        checked={filters.zones?.includes(zone) || false}
                        onChange={e => {
                          const currentZones = filters.zones || [];
                          const newZones = e.target.checked
                            ? [...currentZones, zone]
                            : currentZones.filter(z => z !== zone);
                          onFilterChange({ zones: newZones });
                        }}
                      />
                      <label className="form-check-label" htmlFor={`zone-${zone}`}>
                        {zone}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Misc Options */}
            <div className={horizontal ? 'col' : ''}>
              <h6 className="fs-6 fw-bold mb-2">Options</h6>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="show-idle-links"
                  checked={filters.showIdleLinks || false}
                  onChange={e => onFilterChange({ showIdleLinks: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="show-idle-links">
                  Show idle links
                </label>
              </div>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="show-unattached-nodes"
                  checked={filters.showUnattachedNodes || false}
                  onChange={e => onFilterChange({ showUnattachedNodes: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="show-unattached-nodes">
                  Show unattached nodes
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

NetworkTopologyControls.propTypes = {
  filters: PropTypes.shape({
    nodeTypes: PropTypes.objectOf(PropTypes.bool).isRequired,
    vlans: PropTypes.arrayOf(PropTypes.number),
    zones: PropTypes.arrayOf(PropTypes.string),
    showIdleLinks: PropTypes.bool,
    showUnattachedNodes: PropTypes.bool,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  showFilters: PropTypes.bool.isRequired,
  onToggleFilters: PropTypes.func.isRequired,
  networkData: PropTypes.shape({
    vnics: PropTypes.arrayOf(
      PropTypes.shape({
        vid: PropTypes.number,
      })
    ),
    zones: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
      })
    ),
  }),
  horizontal: PropTypes.bool,
  edgeType: PropTypes.string,
  onEdgeTypeChange: PropTypes.func,
};

export default NetworkTopologyControls;
