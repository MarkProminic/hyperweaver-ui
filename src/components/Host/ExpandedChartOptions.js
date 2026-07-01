import Highcharts from '../Highcharts';

const SUMMARY_TITLE_MAP = {
  rx: 'RX Bandwidth (Download) - All Interfaces',
  tx: 'TX Bandwidth (Upload) - All Interfaces',
  read: 'Read Bandwidth - All Storage Devices',
  write: 'Write Bandwidth - All Storage Devices',
  total: 'Total Bandwidth (Combined) - All Devices',
};

const createChartConfig = ({
  titleText,
  yAxisTitle,
  tooltipSuffix,
  series,
  animation = { duration: 1000, easing: 'easeOutQuart' },
  titleFontSize = '18px',
  marginRight,
  tickPixelInterval,
  yAxisMin = 0,
  yAxisMax,
  legendFontSize = '12px',
  legendMaxHeight,
}) => ({
  chart: {
    type: 'spline',
    animation,
    height: 'calc(90vh - 200px)',
    backgroundColor: '#1e2a3a',
    ...(marginRight !== undefined && { marginRight }),
    style: {
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    },
  },
  time: { useUTC: false },
  title: {
    text: titleText,
    style: {
      fontSize: titleFontSize,
      fontWeight: 'bold',
      color: '#ffffff',
    },
  },
  xAxis: {
    type: 'datetime',
    ...(tickPixelInterval !== undefined && { tickPixelInterval }),
    labels: {
      style: { fontSize: '12px', color: '#b0bec5' },
    },
    lineColor: '#37474f',
    tickColor: '#37474f',
    gridLineColor: '#37474f',
  },
  yAxis: {
    title: {
      text: yAxisTitle,
      style: { fontSize: '14px', color: '#b0bec5' },
    },
    min: yAxisMin,
    ...(yAxisMax !== undefined && { max: yAxisMax }),
    labels: {
      style: { fontSize: '12px', color: '#b0bec5' },
    },
    lineColor: '#37474f',
    tickColor: '#37474f',
    gridLineColor: '#37474f',
  },
  legend: {
    enabled: true,
    itemStyle: {
      fontSize: legendFontSize,
      color: '#ffffff',
    },
    itemHoverStyle: {
      color: '#64b5f6',
    },
    ...(legendMaxHeight !== undefined && { maxHeight: legendMaxHeight }),
  },
  plotOptions: {
    spline: {
      marker: { enabled: false },
      lineWidth: 3,
    },
  },
  series,
  credits: { enabled: false },
  tooltip: {
    shared: true,
    valueSuffix: tooltipSuffix,
    backgroundColor: '#263238',
    borderColor: '#37474f',
    style: {
      color: '#ffffff',
      fontSize: '12px',
    },
  },
});

const createBandwidthSeries = data => [
  {
    name: 'Read',
    data: data.readData || [],
    color: '#64b5f6',
    fillOpacity: 0.3,
  },
  {
    name: 'Write',
    data: data.writeData || [],
    color: '#ff9800',
    fillOpacity: 0.3,
  },
  {
    name: 'Total',
    data: data.totalData || [],
    color: '#4caf50',
    fillOpacity: 0.2,
    lineWidth: 4,
  },
];

const getBandwidthChartOptions = (id, titleSuffix, data) =>
  createChartConfig({
    titleText: `${id} - ${titleSuffix}`,
    yAxisTitle: 'Bandwidth (MB/s)',
    tooltipSuffix: ' MB/s',
    animation: Highcharts.svg,
    marginRight: 10,
    tickPixelInterval: 150,
    series: createBandwidthSeries(data),
  });

const isStorageBandwidth = summaryType =>
  summaryType === 'read' ||
  summaryType === 'write' ||
  (summaryType === 'total' && SUMMARY_TITLE_MAP[summaryType].includes('Storage'));

const getSummaryChartOptions = (summaryType, chartData) => {
  const storageBw = isStorageBandwidth(summaryType);
  return createChartConfig({
    titleText: SUMMARY_TITLE_MAP[summaryType],
    yAxisTitle: storageBw ? 'Bandwidth (MB/s)' : 'Bandwidth (Mbps)',
    tooltipSuffix: storageBw ? ' MB/s' : ' Mbps',
    marginRight: 10,
    tickPixelInterval: 150,
    legendFontSize: '10px',
    legendMaxHeight: 120,
    series: Object.entries(chartData)
      .filter(([, data]) => data[`${summaryType}Data`].length > 0)
      .map(([interfaceName, data], index) => ({
        name: interfaceName,
        data: data[`${summaryType}Data`],
        color: `hsl(${(index * 360) / Object.keys(chartData).length}, 70%, 60%)`,
        visible: true,
      })),
  });
};

const getArcMemoryChartOptions = arcData =>
  createChartConfig({
    titleText: 'ZFS ARC Memory Allocation',
    titleFontSize: '20px',
    yAxisTitle: 'Memory (GB)',
    tooltipSuffix: ' GB',
    series: [
      {
        name: 'ARC Size',
        data: arcData.arcSize || [],
        color: '#64b5f6',
        lineWidth: 4,
      },
      {
        name: 'Target Size',
        data: arcData.arcTargetSize || [],
        color: '#9c27b0',
        lineWidth: 3,
        dashStyle: 'Dash',
      },
      {
        name: 'MRU Size',
        data: arcData.mruSize || [],
        color: '#4caf50',
        lineWidth: 3,
      },
      {
        name: 'MFU Size',
        data: arcData.mfuSize || [],
        color: '#ff9800',
        lineWidth: 3,
      },
    ],
  });

const getArcEfficiencyChartOptions = arcData =>
  createChartConfig({
    titleText: 'ZFS ARC Cache Efficiency',
    titleFontSize: '20px',
    yAxisTitle: 'Efficiency (%)',
    yAxisMax: 100,
    tooltipSuffix: '%',
    series: [
      {
        name: 'Hit Ratio',
        data: arcData.hitRatio || [],
        color: '#2ecc71',
        lineWidth: 4,
      },
      {
        name: 'Demand Efficiency',
        data: arcData.dataDemandEfficiency || [],
        color: '#e74c3c',
        lineWidth: 3,
      },
      {
        name: 'Prefetch Efficiency',
        data: arcData.dataPrefetchEfficiency || [],
        color: '#f39c12',
        lineWidth: 3,
      },
    ],
  });

const getArcCompressionChartOptions = arcData =>
  createChartConfig({
    titleText: 'ZFS ARC Compression Effectiveness',
    titleFontSize: '20px',
    yAxisTitle: 'Compression Ratio (x)',
    yAxisMin: 1,
    tooltipSuffix: 'x',
    series: [
      {
        name: 'Compression Ratio',
        data: arcData.compressionRatio || [],
        color: '#8e44ad',
        lineWidth: 4,
      },
    ],
  });

const getChartTitle = (chartId, chartType) => {
  if (chartType === 'individual') {
    return `${chartId} - Bandwidth Detail`;
  }
  if (chartType === 'pool') {
    return `${chartId} - ZFS Pool I/O Performance`;
  }
  if (chartType.startsWith('summary-')) {
    return SUMMARY_TITLE_MAP[chartType.replace('summary-', '')];
  }
  if (chartType === 'arc-memory') {
    return 'ZFS ARC Memory Allocation';
  }
  if (chartType === 'arc-efficiency') {
    return 'ZFS ARC Cache Efficiency';
  }
  if (chartType === 'arc-compression') {
    return 'ZFS ARC Compression Effectiveness';
  }
  return 'Performance Chart';
};

const getExpandedChartOptions = (chartId, chartType, chartData, poolChartData, arcChartData) => {
  if (chartType === 'individual' && chartData[chartId]) {
    return getBandwidthChartOptions(chartId, 'Bandwidth Detail', chartData[chartId]);
  }
  if (chartType === 'pool' && poolChartData?.[chartId]) {
    return getBandwidthChartOptions(chartId, 'ZFS Pool I/O Performance', poolChartData[chartId]);
  }
  if (chartType.startsWith('summary-')) {
    return getSummaryChartOptions(chartType.replace('summary-', ''), chartData);
  }
  if (chartType === 'arc-memory' && arcChartData) {
    return getArcMemoryChartOptions(arcChartData);
  }
  if (chartType === 'arc-efficiency' && arcChartData) {
    return getArcEfficiencyChartOptions(arcChartData);
  }
  if (chartType === 'arc-compression' && arcChartData) {
    return getArcCompressionChartOptions(arcChartData);
  }
  return {};
};

export { getChartTitle, getExpandedChartOptions };
