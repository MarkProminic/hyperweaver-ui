import PropTypes from 'prop-types';

import Chart from '../Chart';
import Highcharts from '../Highcharts';

const BandwidthCharts = ({
  chartData,
  sectionsCollapsed,
  toggleSection,
  loading,
  chartSortBy,
  setChartSortBy,
  getSortedChartEntries,
  expandChart,
  summaryChartRefs,
  chartRefs,
}) => {
  if (Object.keys(chartData).length === 0) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fs-5 fw-bold mb-0">
              <span className="d-inline-flex align-items-center">
                <span className="me-2">
                  <i className="fas fa-chart-area" />
                </span>
                <span>Real-Time Bandwidth Charts</span>
              </span>
            </h4>
          </div>
          <div>
            <div className="d-flex gap-2">
              <div>
                <select
                  className="form-select form-select-sm"
                  value={chartSortBy}
                  onChange={e => setChartSortBy(e.target.value)}
                  disabled={loading}
                  title="Sort individual charts by"
                >
                  <option value="bandwidth">Most Bandwidth</option>
                  <option value="name">Interface Name</option>
                  <option value="rx">RX Bandwidth</option>
                  <option value="tx">TX Bandwidth</option>
                </select>
              </div>
              <div>
                <button
                  className="btn btn-sm btn-link"
                  onClick={() => toggleSection('charts')}
                  title={sectionsCollapsed.charts ? 'Expand section' : 'Collapse section'}
                >
                  <span>
                    <i
                      className={`fas ${sectionsCollapsed.charts ? 'fa-chevron-down' : 'fa-chevron-up'}`}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {!sectionsCollapsed.charts && (
          <div>
            {/* Summary Charts - All Interfaces Combined */}
            <div className="mb-5">
              <h5 className="fs-6 fw-bold mb-3">
                <span className="d-inline-flex align-items-center">
                  <span className="me-2">
                    <i className="fas fa-layer-group" />
                  </span>
                  <span>All Interfaces Summary</span>
                </span>
              </h5>
              <div className="row">
                {/* RX Summary Chart */}
                <div className="col-4">
                  <div className="is-chart-container position-relative">
                    <button
                      className="btn btn-sm btn-light is-chart-expand-button"
                      onClick={() => expandChart('summary-rx', 'summary-rx')}
                      title="Expand chart to full size"
                    >
                      <span>
                        <i className="fas fa-expand" />
                      </span>
                    </button>
                    <Chart
                      ref={ref => {
                        if (ref) {
                          summaryChartRefs.current['summary-rx'] = ref;
                        }
                      }}
                      options={{
                        chart: {
                          type: 'spline',
                          animation: {
                            duration: 1000,
                            easing: 'easeOutQuart',
                          },
                          marginRight: 10,
                          height: 300,
                          backgroundColor: '#1e2a3a',
                          style: {
                            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                          },
                        },
                        time: {
                          useUTC: false,
                        },
                        title: {
                          text: 'RX Bandwidth (Download)',
                          style: {
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                          },
                        },
                        xAxis: {
                          type: 'datetime',
                          tickPixelInterval: 150,
                          labels: {
                            style: {
                              fontSize: '10px',
                              color: '#b0bec5',
                            },
                          },
                          lineColor: '#37474f',
                          tickColor: '#37474f',
                          gridLineColor: '#37474f',
                        },
                        yAxis: {
                          title: {
                            text: 'Bandwidth (Mbps)',
                            style: {
                              fontSize: '12px',
                              color: '#b0bec5',
                            },
                          },
                          min: 0,
                          labels: {
                            style: {
                              fontSize: '10px',
                              color: '#b0bec5',
                            },
                          },
                          lineColor: '#37474f',
                          tickColor: '#37474f',
                          gridLineColor: '#37474f',
                        },
                        legend: {
                          enabled: true,
                          itemStyle: {
                            fontSize: '9px',
                            color: '#ffffff',
                          },
                          itemHoverStyle: {
                            color: '#64b5f6',
                          },
                          maxHeight: 80,
                        },
                        plotOptions: {
                          spline: {
                            marker: {
                              enabled: false,
                            },
                            lineWidth: 2,
                          },
                        },
                        series: Object.entries(chartData)
                          .filter(([, data]) => data.rxData.length > 0)
                          .map(([interfaceName, data], index) => ({
                            name: interfaceName,
                            data: data.rxData,
                            color: `hsl(${(index * 360) / Object.keys(chartData).length}, 70%, 60%)`,
                            visible: true,
                          })),
                        credits: {
                          enabled: false,
                        },
                        tooltip: {
                          shared: true,
                          valueSuffix: ' Mbps',
                          backgroundColor: '#263238',
                          borderColor: '#37474f',
                          style: {
                            color: '#ffffff',
                            fontSize: '11px',
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* TX Summary Chart */}
                <div className="col-4">
                  <div className="is-chart-container position-relative">
                    <button
                      className="btn btn-sm btn-light is-chart-expand-button"
                      onClick={() => expandChart('summary-tx', 'summary-tx')}
                      title="Expand chart to full size"
                    >
                      <span>
                        <i className="fas fa-expand" />
                      </span>
                    </button>
                    <Chart
                      ref={ref => {
                        if (ref) {
                          summaryChartRefs.current['summary-tx'] = ref;
                        }
                      }}
                      options={{
                        chart: {
                          type: 'spline',
                          animation: {
                            duration: 1000,
                            easing: 'easeOutQuart',
                          },
                          marginRight: 10,
                          height: 300,
                          backgroundColor: '#1e2a3a',
                          style: {
                            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                          },
                        },
                        time: {
                          useUTC: false,
                        },
                        title: {
                          text: 'TX Bandwidth (Upload)',
                          style: {
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                          },
                        },
                        xAxis: {
                          type: 'datetime',
                          tickPixelInterval: 150,
                          labels: {
                            style: {
                              fontSize: '10px',
                              color: '#b0bec5',
                            },
                          },
                          lineColor: '#37474f',
                          tickColor: '#37474f',
                          gridLineColor: '#37474f',
                        },
                        yAxis: {
                          title: {
                            text: 'Bandwidth (Mbps)',
                            style: {
                              fontSize: '12px',
                              color: '#b0bec5',
                            },
                          },
                          min: 0,
                          labels: {
                            style: {
                              fontSize: '10px',
                              color: '#b0bec5',
                            },
                          },
                          lineColor: '#37474f',
                          tickColor: '#37474f',
                          gridLineColor: '#37474f',
                        },
                        legend: {
                          enabled: true,
                          itemStyle: {
                            fontSize: '9px',
                            color: '#ffffff',
                          },
                          itemHoverStyle: {
                            color: '#ff9800',
                          },
                          maxHeight: 80,
                        },
                        plotOptions: {
                          spline: {
                            marker: {
                              enabled: false,
                            },
                            lineWidth: 2,
                          },
                        },
                        series: Object.entries(chartData)
                          .filter(([, data]) => data.txData.length > 0)
                          .map(([interfaceName, data], index) => ({
                            name: interfaceName,
                            data: data.txData,
                            color: `hsl(${(index * 360) / Object.keys(chartData).length}, 70%, 60%)`,
                            visible: true,
                          })),
                        credits: {
                          enabled: false,
                        },
                        tooltip: {
                          shared: true,
                          valueSuffix: ' Mbps',
                          backgroundColor: '#263238',
                          borderColor: '#37474f',
                          style: {
                            color: '#ffffff',
                            fontSize: '11px',
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Total Summary Chart */}
                <div className="col-4">
                  <div className="is-chart-container position-relative">
                    <button
                      className="btn btn-sm btn-light is-chart-expand-button"
                      onClick={() => expandChart('summary-total', 'summary-total')}
                      title="Expand chart to full size"
                    >
                      <span>
                        <i className="fas fa-expand" />
                      </span>
                    </button>
                    <Chart
                      ref={ref => {
                        if (ref) {
                          summaryChartRefs.current['summary-total'] = ref;
                        }
                      }}
                      options={{
                        chart: {
                          type: 'spline',
                          animation: {
                            duration: 1000,
                            easing: 'easeOutQuart',
                          },
                          marginRight: 10,
                          height: 300,
                          backgroundColor: '#1e2a3a',
                          style: {
                            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                          },
                        },
                        time: {
                          useUTC: false,
                        },
                        title: {
                          text: 'Total Bandwidth (Combined)',
                          style: {
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                          },
                        },
                        xAxis: {
                          type: 'datetime',
                          tickPixelInterval: 150,
                          labels: {
                            style: {
                              fontSize: '10px',
                              color: '#b0bec5',
                            },
                          },
                          lineColor: '#37474f',
                          tickColor: '#37474f',
                          gridLineColor: '#37474f',
                        },
                        yAxis: {
                          title: {
                            text: 'Bandwidth (Mbps)',
                            style: {
                              fontSize: '12px',
                              color: '#b0bec5',
                            },
                          },
                          min: 0,
                          labels: {
                            style: {
                              fontSize: '10px',
                              color: '#b0bec5',
                            },
                          },
                          lineColor: '#37474f',
                          tickColor: '#37474f',
                          gridLineColor: '#37474f',
                        },
                        legend: {
                          enabled: true,
                          itemStyle: {
                            fontSize: '9px',
                            color: '#ffffff',
                          },
                          itemHoverStyle: {
                            color: '#4caf50',
                          },
                          maxHeight: 80,
                        },
                        plotOptions: {
                          spline: {
                            marker: {
                              enabled: false,
                            },
                            lineWidth: 2,
                          },
                        },
                        series: Object.entries(chartData)
                          .filter(([, data]) => data.totalData.length > 0)
                          .map(([interfaceName, data], index) => ({
                            name: interfaceName,
                            data: data.totalData,
                            color: `hsl(${(index * 360) / Object.keys(chartData).length}, 70%, 60%)`,
                            visible: true,
                          })),
                        credits: {
                          enabled: false,
                        },
                        tooltip: {
                          shared: true,
                          valueSuffix: ' Mbps',
                          backgroundColor: '#263238',
                          borderColor: '#37474f',
                          style: {
                            color: '#ffffff',
                            fontSize: '11px',
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Interface Charts */}
            <div>
              <h5 className="fs-6 fw-bold mb-3">
                <span className="d-inline-flex align-items-center">
                  <span className="me-2">
                    <i className="fas fa-chart-line" />
                  </span>
                  <span>Individual Interface Charts</span>
                </span>
              </h5>
              <div className="row">
                {getSortedChartEntries().map(([interfaceName, data]) => {
                  const chartOptions = {
                    chart: {
                      type: 'spline',
                      animation: Highcharts.svg,
                      marginRight: 10,
                      height: 300,
                      backgroundColor: '#1e2a3a',
                      style: {
                        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                      },
                    },
                    time: {
                      useUTC: false,
                    },
                    title: {
                      text: interfaceName,
                      style: {
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                      },
                    },
                    xAxis: {
                      type: 'datetime',
                      tickPixelInterval: 150,
                      labels: {
                        style: {
                          fontSize: '10px',
                          color: '#b0bec5',
                        },
                      },
                      lineColor: '#37474f',
                      tickColor: '#37474f',
                      gridLineColor: '#37474f',
                    },
                    yAxis: {
                      title: {
                        text: 'Bandwidth (Mbps)',
                        style: {
                          fontSize: '12px',
                          color: '#b0bec5',
                        },
                      },
                      min: 0,
                      labels: {
                        style: {
                          fontSize: '10px',
                          color: '#b0bec5',
                        },
                      },
                      lineColor: '#37474f',
                      tickColor: '#37474f',
                      gridLineColor: '#37474f',
                    },
                    legend: {
                      enabled: true,
                      itemStyle: {
                        fontSize: '10px',
                        color: '#ffffff',
                      },
                      itemHoverStyle: {
                        color: '#64b5f6',
                      },
                    },
                    plotOptions: {
                      spline: {
                        marker: {
                          enabled: false,
                        },
                        lineWidth: 2,
                      },
                    },
                    series: [
                      {
                        name: 'RX',
                        data: data.rxData,
                        color: '#64b5f6',
                        fillOpacity: 0.3,
                      },
                      {
                        name: 'TX',
                        data: data.txData,
                        color: '#ff9800',
                        fillOpacity: 0.3,
                      },
                      {
                        name: 'Total',
                        data: data.totalData,
                        color: '#4caf50',
                        fillOpacity: 0.2,
                        lineWidth: 3,
                      },
                    ],
                    credits: {
                      enabled: false,
                    },
                    tooltip: {
                      shared: true,
                      valueSuffix: ' Mbps',
                      backgroundColor: '#263238',
                      borderColor: '#37474f',
                      style: {
                        color: '#ffffff',
                        fontSize: '11px',
                      },
                    },
                  };

                  return (
                    <div key={`chart-${interfaceName}`} className="col-6">
                      <div className="is-chart-container position-relative">
                        <button
                          className="btn btn-sm btn-light is-chart-expand-button"
                          onClick={() => expandChart(interfaceName, 'individual')}
                          title="Expand chart to full size"
                        >
                          <span>
                            <i className="fas fa-expand" />
                          </span>
                        </button>
                        <Chart
                          key={`chart-${interfaceName}`}
                          options={chartOptions}
                          ref={ref => {
                            if (ref) {
                              chartRefs.current[interfaceName] = ref;
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {!sectionsCollapsed.charts && Object.keys(chartData).length === 0 && (
          <div className="alert alert-info">
            <p>
              No chart data available yet. Data will appear as the system collects bandwidth
              measurements.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

BandwidthCharts.propTypes = {
  chartData: PropTypes.object.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  chartSortBy: PropTypes.string.isRequired,
  setChartSortBy: PropTypes.func.isRequired,
  getSortedChartEntries: PropTypes.func.isRequired,
  expandChart: PropTypes.func.isRequired,
  summaryChartRefs: PropTypes.object.isRequired,
  chartRefs: PropTypes.object.isRequired,
};

export default BandwidthCharts;
