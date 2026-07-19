import Highcharts from '../Highcharts';

const SUMMARY_TITLE_KEYS = {
  rx: 'host.expandedChartOptions.summaryRx',
  tx: 'host.expandedChartOptions.summaryTx',
  read: 'host.expandedChartOptions.summaryRead',
  write: 'host.expandedChartOptions.summaryWrite',
  total: 'host.expandedChartOptions.summaryTotal',
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

const createBandwidthSeries = (data, t) => [
  {
    name: t('host.expandedChartOptions.seriesRead'),
    data: data.readData || [],
    color: '#64b5f6',
    fillOpacity: 0.3,
  },
  {
    name: t('host.expandedChartOptions.seriesWrite'),
    data: data.writeData || [],
    color: '#ff9800',
    fillOpacity: 0.3,
  },
  {
    name: t('host.expandedChartOptions.seriesTotal'),
    data: data.totalData || [],
    color: '#4caf50',
    fillOpacity: 0.2,
    lineWidth: 4,
  },
];

const getBandwidthChartOptions = (titleText, data, t) =>
  createChartConfig({
    titleText,
    yAxisTitle: t('host.expandedChartOptions.axisBandwidthMBs'),
    tooltipSuffix: ' MB/s',
    animation: Highcharts.svg,
    marginRight: 10,
    tickPixelInterval: 150,
    series: createBandwidthSeries(data, t),
  });

const isStorageBandwidth = summaryType => summaryType === 'read' || summaryType === 'write';

const getSummaryChartOptions = (summaryType, chartData, t) => {
  const storageBw = isStorageBandwidth(summaryType);
  return createChartConfig({
    titleText: t(SUMMARY_TITLE_KEYS[summaryType]),
    yAxisTitle: storageBw
      ? t('host.expandedChartOptions.axisBandwidthMBs')
      : t('host.expandedChartOptions.axisBandwidthMbps'),
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

const getArcMemoryChartOptions = (arcData, t) =>
  createChartConfig({
    titleText: t('host.expandedChartOptions.arcMemoryTitle'),
    titleFontSize: '20px',
    yAxisTitle: t('host.expandedChartOptions.axisMemoryGb'),
    tooltipSuffix: ' GB',
    series: [
      {
        name: t('host.expandedChartOptions.seriesArcSize'),
        data: arcData.arcSize || [],
        color: '#64b5f6',
        lineWidth: 4,
      },
      {
        name: t('host.expandedChartOptions.seriesTargetSize'),
        data: arcData.arcTargetSize || [],
        color: '#9c27b0',
        lineWidth: 3,
        dashStyle: 'Dash',
      },
      {
        name: t('host.expandedChartOptions.seriesMruSize'),
        data: arcData.mruSize || [],
        color: '#4caf50',
        lineWidth: 3,
      },
      {
        name: t('host.expandedChartOptions.seriesMfuSize'),
        data: arcData.mfuSize || [],
        color: '#ff9800',
        lineWidth: 3,
      },
    ],
  });

const getArcEfficiencyChartOptions = (arcData, t) =>
  createChartConfig({
    titleText: t('host.expandedChartOptions.arcEfficiencyTitle'),
    titleFontSize: '20px',
    yAxisTitle: t('host.expandedChartOptions.axisEfficiencyPct'),
    yAxisMax: 100,
    tooltipSuffix: '%',
    series: [
      {
        name: t('host.expandedChartOptions.seriesHitRatio'),
        data: arcData.hitRatio || [],
        color: '#2ecc71',
        lineWidth: 4,
      },
      {
        name: t('host.expandedChartOptions.seriesDemandEfficiency'),
        data: arcData.dataDemandEfficiency || [],
        color: '#e74c3c',
        lineWidth: 3,
      },
      {
        name: t('host.expandedChartOptions.seriesPrefetchEfficiency'),
        data: arcData.dataPrefetchEfficiency || [],
        color: '#f39c12',
        lineWidth: 3,
      },
    ],
  });

const getArcCompressionChartOptions = (arcData, t) =>
  createChartConfig({
    titleText: t('host.expandedChartOptions.arcCompressionTitle'),
    titleFontSize: '20px',
    yAxisTitle: t('host.expandedChartOptions.axisCompressionRatio'),
    yAxisMin: 1,
    tooltipSuffix: 'x',
    series: [
      {
        name: t('host.expandedChartOptions.seriesCompressionRatio'),
        data: arcData.compressionRatio || [],
        color: '#8e44ad',
        lineWidth: 4,
      },
    ],
  });

const getChartTitle = (chartId, chartType, t) => {
  if (chartType === 'individual') {
    return t('host.expandedChartOptions.individualTitle', { id: chartId });
  }
  if (chartType === 'pool') {
    return t('host.expandedChartOptions.poolTitle', { id: chartId });
  }
  if (chartType.startsWith('summary-')) {
    return t(SUMMARY_TITLE_KEYS[chartType.replace('summary-', '')]);
  }
  if (chartType === 'arc-memory') {
    return t('host.expandedChartOptions.arcMemoryTitle');
  }
  if (chartType === 'arc-efficiency') {
    return t('host.expandedChartOptions.arcEfficiencyTitle');
  }
  if (chartType === 'arc-compression') {
    return t('host.expandedChartOptions.arcCompressionTitle');
  }
  return t('host.expandedChartOptions.defaultTitle');
};

const getExpandedChartOptions = (chartId, chartType, chartData, poolChartData, arcChartData, t) => {
  if (chartType === 'individual' && chartData[chartId]) {
    return getBandwidthChartOptions(
      t('host.expandedChartOptions.individualTitle', { id: chartId }),
      chartData[chartId],
      t
    );
  }
  if (chartType === 'pool' && poolChartData?.[chartId]) {
    return getBandwidthChartOptions(
      t('host.expandedChartOptions.poolTitle', { id: chartId }),
      poolChartData[chartId],
      t
    );
  }
  if (chartType.startsWith('summary-')) {
    return getSummaryChartOptions(chartType.replace('summary-', ''), chartData, t);
  }
  if (chartType === 'arc-memory' && arcChartData) {
    return getArcMemoryChartOptions(arcChartData, t);
  }
  if (chartType === 'arc-efficiency' && arcChartData) {
    return getArcEfficiencyChartOptions(arcChartData, t);
  }
  if (chartType === 'arc-compression' && arcChartData) {
    return getArcCompressionChartOptions(arcChartData, t);
  }
  return {};
};

export { getChartTitle, getExpandedChartOptions };
