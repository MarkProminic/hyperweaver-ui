import PropTypes from 'prop-types';

const BandwidthLegend = ({ horizontal = false }) => {
  const bandwidthRanges = [
    { label: '< 25%', color: '#48c78e', description: 'Light load' },
    { label: '25-50%', color: '#ffdd57', description: 'Moderate load' },
    { label: '50-75%', color: '#ff9f43', description: 'Heavy load' },
    { label: '75-90%', color: '#f14668', description: 'Critical load' },
    { label: '> 90%', color: '#e74c3c', description: 'Overloaded' },
  ];

  const nodeTypes = [
    { label: 'Physical NIC', color: '#48c78e', icon: 'fa-ethernet' },
    { label: 'Aggregate', color: '#3273dc', icon: 'fa-link' },
    { label: 'Etherstub', color: '#ffdd57', icon: 'fa-sitemap' },
    { label: 'VNIC', color: '#ff9f43', icon: 'fa-network-wired' },
    { label: 'Zone', color: '#f14668', icon: 'fa-server' },
  ];

  const trafficIndicators = [
    { label: 'RX Traffic', color: '#48c78e', symbol: '↓' },
    { label: 'TX Traffic', color: '#3273dc', symbol: '↑' },
    { label: 'VLAN Tagged', style: 'dashed', description: 'Dashed line' },
    { label: 'LACP Bond', style: 'thick', description: 'Thick line' },
  ];

  if (horizontal) {
    // Horizontal layout for bottom placement
    return (
      <div className="card">
        <div className="card-body p-3">
          <h6 className="fs-6 fw-bold mb-3 text-center">
            <i className="fas fa-info-circle me-2" />
            <span>Network Legend</span>
          </h6>

          <div className="row g-3">
            {/* Bandwidth Saturation */}
            <div className="col-12 col-md-4">
              <p className="fw-bold small mb-2">Bandwidth Saturation</p>
              <div className="d-flex flex-wrap gap-2">
                {bandwidthRanges.map(range => (
                  <span
                    key={range.label}
                    className="badge hw-bandwidth-tag"
                    style={{
                      backgroundColor: range.color,
                    }}
                    title={range.description}
                  >
                    {range.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Node Types */}
            <div className="col-12 col-md-4">
              <p className="fw-bold small mb-2">Node Types</p>
              <div className="d-flex flex-wrap gap-2">
                {nodeTypes.map(type => (
                  <span
                    key={type.label}
                    className="badge text-bg-light d-inline-flex align-items-center gap-1"
                  >
                    <i className={`fas ${type.icon}`} style={{ color: type.color }} />
                    <span className="small">{type.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Traffic Flow */}
            <div className="col-12 col-md-4">
              <p className="fw-bold small mb-2">Traffic Flow</p>
              <div className="d-flex flex-wrap gap-2">
                {trafficIndicators.map(indicator => (
                  <span
                    key={indicator.label}
                    className="badge text-bg-light d-inline-flex align-items-center gap-1"
                  >
                    {indicator.symbol ? (
                      <span className="fw-bold" style={{ color: indicator.color }}>
                        {indicator.symbol}
                      </span>
                    ) : (
                      <div
                        className={`hw-traffic-line-16 ${
                          indicator.style === 'dashed'
                            ? 'hw-traffic-line-dashed'
                            : 'hw-traffic-line-solid'
                        } ${
                          indicator.style === 'thick'
                            ? 'hw-traffic-line-thick-16'
                            : 'hw-traffic-line-normal'
                        }`}
                        style={{
                          backgroundColor: indicator.color || '#6b7280',
                          borderColor: indicator.color || '#6b7280',
                        }}
                      />
                    )}
                    <span className="small">{indicator.label}</span>
                  </span>
                ))}
                <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
                  <i className="fas fa-circle hw-status-success " />
                  <span className="small">Live Traffic</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vertical layout for sidebar placement
  return (
    <div className="card">
      <div className="card-body p-3">
        <h6 className="fs-6 fw-bold mb-3">
          <i className="fas fa-info-circle me-2" />
          <span>Network Legend</span>
        </h6>

        {/* Bandwidth Saturation */}
        <div className="mb-3">
          <p className="fw-bold small mb-2">Bandwidth Saturation</p>
          <div>
            {bandwidthRanges.map(range => (
              <div
                key={range.label}
                className="d-flex justify-content-between align-items-center mb-1"
              >
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="badge hw-bandwidth-tag-vertical"
                    style={{
                      backgroundColor: range.color,
                    }}
                  >
                    {range.label}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted">{range.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Node Types */}
        <div className="mb-3">
          <p className="fw-bold small mb-2">Node Types</p>
          <div>
            {nodeTypes.map(type => (
              <div key={type.label} className="d-flex align-items-center mb-1">
                <i className={`fas ${type.icon} me-2`} style={{ color: type.color }} />
                <span className="small">{type.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Flow */}
        <div className="mb-3">
          <p className="fw-bold small mb-2">Traffic Flow</p>
          <div>
            {trafficIndicators.map(indicator => (
              <div key={indicator.label} className="d-flex align-items-center mb-1">
                {indicator.symbol ? (
                  <span className="fw-bold me-2" style={{ color: indicator.color }}>
                    {indicator.symbol}
                  </span>
                ) : (
                  <div
                    className={`me-2 hw-traffic-line-20 ${
                      indicator.style === 'dashed'
                        ? 'hw-traffic-line-dashed'
                        : 'hw-traffic-line-solid'
                    } ${
                      indicator.style === 'thick'
                        ? 'hw-traffic-line-thick'
                        : 'hw-traffic-line-normal'
                    }`}
                    style={{
                      backgroundColor: indicator.color || '#6b7280',
                      borderColor: indicator.color || '#6b7280',
                    }}
                  />
                )}
                <span className="small">{indicator.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Animation Indicators */}
        <div className="mb-3">
          <div className="alert p-2">
            <div className="d-flex align-items-center mb-1">
              <i className="fas fa-circle hw-status-success " />
              <span className="ms-2 small">Animated particles show live traffic</span>
            </div>
            <div className="d-flex align-items-center">
              <i className="fas fa-bolt hw-status-warning " />
              <span className="ms-2 small">Faster animation = higher traffic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BandwidthLegend.propTypes = {
  horizontal: PropTypes.bool,
};

export default BandwidthLegend;
