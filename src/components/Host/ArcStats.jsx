import PropTypes from 'prop-types';
import React from 'react';

import { formatBytes } from './StorageUtils';

const getHitRatioClass = ratio => {
  if (ratio > 95) {
    return 'text-bg-success';
  }
  if (ratio > 90) {
    return 'text-bg-info';
  }
  if (ratio > 80) {
    return 'text-bg-warning';
  }
  return 'text-bg-danger';
};

const getDataEfficiencyClass = efficiency => {
  if (efficiency > 95) {
    return 'text-bg-success';
  }
  if (efficiency > 90) {
    return 'text-bg-info';
  }
  if (efficiency > 80) {
    return 'text-bg-warning';
  }
  return 'text-bg-dark';
};

const getPrefetchEfficiencyClass = efficiency => {
  if (efficiency > 50) {
    return 'text-bg-success';
  }
  if (efficiency > 20) {
    return 'text-bg-info';
  }
  if (efficiency > 5) {
    return 'text-bg-warning';
  }
  return 'text-bg-dark';
};

const getCompressionRatioClass = ratio => {
  if (ratio > 2) {
    return 'text-bg-success';
  }
  if (ratio > 1.5) {
    return 'text-bg-info';
  }
  if (ratio > 1.1) {
    return 'text-bg-warning';
  }
  return 'text-bg-dark';
};

const getL2HitRatioClass = ratio => {
  if (ratio > 80) {
    return 'text-bg-success';
  }
  if (ratio > 60) {
    return 'text-bg-info';
  }
  if (ratio > 40) {
    return 'text-bg-warning';
  }
  return 'text-bg-danger';
};

const ArcStats = ({ arcStats, sectionsCollapsed, toggleSection }) => {
  if (arcStats.length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fs-5 fw-bold mb-0">
              <i className="fas fa-memory me-2" />
              <span>ZFS ARC Statistics</span>
            </h4>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('arcStats')}
              title={sectionsCollapsed.arcStats ? 'Expand section' : 'Collapse section'}
            >
              <i
                className={`fas ${sectionsCollapsed.arcStats ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
        {!sectionsCollapsed.arcStats && (
          <>
            {arcStats.length > 0 ? (
              <div>
                {/* Main ARC Overview Table */}
                <div className="table-responsive mb-4">
                  <h6 className="fs-6 fw-bold mb-2 text-info">
                    <i className="fas fa-chart-pie me-2" />
                    <span>ARC Overview</span>
                  </h6>
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Current Size</th>
                        <th>Target Size</th>
                        <th>Min/Max Size</th>
                        <th>Hit Ratio</th>
                        <th>Data Efficiency</th>
                        <th>Prefetch Efficiency</th>
                        <th>Compression Ratio</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arcStats.slice(0, 1).map(arc => {
                        const arcHits = parseFloat(arc.hits || arc.arc_hits) || 0;
                        const arcMisses = parseFloat(arc.misses || arc.arc_misses) || 0;
                        const hitRatio =
                          arc.hit_ratio ||
                          (arcHits + arcMisses > 0
                            ? ((arcHits / (arcHits + arcMisses)) * 100).toFixed(1)
                            : 0);
                        const compressionRatio =
                          arc.uncompressed_size && arc.compressed_size
                            ? (
                                parseFloat(arc.uncompressed_size) / parseFloat(arc.compressed_size)
                              ).toFixed(2)
                            : 'N/A';

                        return (
                          <tr key={`arc-overview-${arc.scan_timestamp}`}>
                            <td>
                              <span className="badge text-bg-info">
                                {formatBytes(parseFloat(arc.arc_size) || 0)}
                              </span>
                            </td>
                            <td>
                              <span className="badge text-bg-primary">
                                {formatBytes(parseFloat(arc.arc_target_size) || 0)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-2">
                                <span className="badge text-bg-secondary" title="Minimum ARC Size">
                                  {formatBytes(parseFloat(arc.arc_min_size) || 0)}
                                </span>
                                <span className="badge text-bg-dark" title="Maximum ARC Size">
                                  {formatBytes(parseFloat(arc.arc_max_size) || 0)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${getHitRatioClass(hitRatio)}`}>
                                {typeof hitRatio === 'number' ? `${hitRatio}%` : hitRatio}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getDataEfficiencyClass(parseFloat(arc.data_demand_efficiency))}`}
                              >
                                {arc.data_demand_efficiency
                                  ? `${arc.data_demand_efficiency}%`
                                  : 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getPrefetchEfficiencyClass(parseFloat(arc.data_prefetch_efficiency))}`}
                              >
                                {arc.data_prefetch_efficiency
                                  ? `${arc.data_prefetch_efficiency}%`
                                  : 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getCompressionRatioClass(parseFloat(compressionRatio))}`}
                                title="Uncompressed / Compressed Size Ratio"
                              >
                                {compressionRatio}x
                              </span>
                            </td>
                            <td>
                              <span className="text-muted small">
                                {new Date(arc.scan_timestamp).toLocaleTimeString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Detailed ARC Breakdown */}
                <div className="row g-3">
                  {/* Memory Breakdown */}
                  <div className="col-lg-4">
                    <h6 className="fs-6 fw-bold mb-2 text-success">
                      <i className="fas fa-memory me-2" />
                      <span>Memory Breakdown</span>
                    </h6>
                    <table className="table table-striped table-sm">
                      <tbody>
                        {arcStats.slice(0, 1).map(arc => (
                          <React.Fragment key={`arc-memory-${arc.scan_timestamp}`}>
                            <tr>
                              <td>
                                <strong>MRU Size</strong>
                              </td>
                              <td>{formatBytes(parseFloat(arc.mru_size) || 0)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>MFU Size</strong>
                              </td>
                              <td>{formatBytes(parseFloat(arc.mfu_size) || 0)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Data Size</strong>
                              </td>
                              <td>{formatBytes(parseFloat(arc.data_size) || 0)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Metadata Size</strong>
                              </td>
                              <td>{formatBytes(parseFloat(arc.metadata_size) || 0)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Meta Used</strong>
                              </td>
                              <td>{formatBytes(parseFloat(arc.arc_meta_used) || 0)}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Meta Limit</strong>
                              </td>
                              <td>{formatBytes(parseFloat(arc.arc_meta_limit) || 0)}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Hit/Miss Statistics */}
                  <div className="col-lg-4">
                    <h6 className="fs-6 fw-bold mb-2 text-warning">
                      <i className="fas fa-bullseye me-2" />
                      <span>Hit/Miss Statistics</span>
                    </h6>
                    <table className="table table-striped table-sm">
                      <tbody>
                        {arcStats.slice(0, 1).map(arc => (
                          <React.Fragment key={`arc-hits-${arc.scan_timestamp}`}>
                            <tr>
                              <td>
                                <strong>Total Hits</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-success">
                                  {(parseFloat(arc.hits || arc.arc_hits) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Total Misses</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-warning">
                                  {(parseFloat(arc.misses || arc.arc_misses) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>MRU Hits</strong>
                              </td>
                              <td>{(parseFloat(arc.mru_hits) || 0).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>MFU Hits</strong>
                              </td>
                              <td>{(parseFloat(arc.mfu_hits) || 0).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>MRU Ghost Hits</strong>
                              </td>
                              <td>{(parseFloat(arc.mru_ghost_hits) || 0).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td>
                                <strong>MFU Ghost Hits</strong>
                              </td>
                              <td>{(parseFloat(arc.mfu_ghost_hits) || 0).toLocaleString()}</td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Demand vs Prefetch */}
                  <div className="col-lg-4">
                    <h6 className="fs-6 fw-bold mb-2 text-info">
                      <i className="fas fa-exchange-alt me-2" />
                      <span>Demand vs Prefetch</span>
                    </h6>
                    <table className="table table-striped table-sm">
                      <tbody>
                        {arcStats.slice(0, 1).map(arc => (
                          <React.Fragment key={`arc-demand-${arc.scan_timestamp}`}>
                            <tr>
                              <td>
                                <strong>Demand Data Hits</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-success">
                                  {(parseFloat(arc.demand_data_hits) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Demand Data Misses</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-warning">
                                  {(parseFloat(arc.demand_data_misses) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Demand Meta Hits</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-success">
                                  {(parseFloat(arc.demand_metadata_hits) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Demand Meta Misses</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-warning">
                                  {(parseFloat(arc.demand_metadata_misses) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Prefetch Data Hits</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-info">
                                  {(parseFloat(arc.prefetch_data_hits) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>Prefetch Data Misses</strong>
                              </td>
                              <td>
                                <span className="badge text-bg-dark">
                                  {(parseFloat(arc.prefetch_data_misses) || 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* L2ARC Statistics (if available) */}
                {arcStats.slice(0, 1).some(arc => parseFloat(arc.l2_size) > 0) && (
                  <div className="mt-4">
                    <h6 className="fs-6 fw-bold mb-2 text-danger">
                      <i className="fas fa-layer-group me-2" />
                      <span>L2ARC Statistics</span>
                    </h6>
                    <table className="table table-striped table-sm">
                      <thead>
                        <tr>
                          <th>L2 Size</th>
                          <th>L2 Hits</th>
                          <th>L2 Misses</th>
                          <th>L2 Hit Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arcStats.slice(0, 1).map(arc => {
                          const l2Hits = parseFloat(arc.l2_hits) || 0;
                          const l2Misses = parseFloat(arc.l2_misses) || 0;
                          const l2HitRatio =
                            l2Hits + l2Misses > 0
                              ? ((l2Hits / (l2Hits + l2Misses)) * 100).toFixed(1)
                              : 0;

                          return (
                            <tr key={`arc-l2-${arc.scan_timestamp}`}>
                              <td>
                                <span className="badge text-bg-info">
                                  {formatBytes(parseFloat(arc.l2_size) || 0)}
                                </span>
                              </td>
                              <td>
                                <span className="badge text-bg-success">
                                  {l2Hits.toLocaleString()}
                                </span>
                              </td>
                              <td>
                                <span className="badge text-bg-warning">
                                  {l2Misses.toLocaleString()}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getL2HitRatioClass(l2HitRatio)}`}>
                                  {l2HitRatio}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-info">
                <p>No ZFS ARC statistics available. The backend may still be collecting data.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

ArcStats.propTypes = {
  arcStats: PropTypes.array.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};

export default ArcStats;
