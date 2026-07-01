export const DARK_THEME = {
  bg: '#1e2a3a',
  axisLine: '#37474f',
  tooltipBg: '#263238',
  textLight: '#b0bec5',
  textWhite: '#ffffff',
};

export const FONT_FAMILY = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

const baseAxisStyle = () => ({
  labels: {
    style: { fontSize: '10px', color: DARK_THEME.textLight },
  },
  lineColor: DARK_THEME.axisLine,
  tickColor: DARK_THEME.axisLine,
  gridLineColor: DARK_THEME.axisLine,
});

export const createChartOptions = ({
  title,
  height = 300,
  series,
  yAxisTitle = 'Bandwidth (MB/s)',
  yAxisMin = 0,
  yAxisMax,
  tooltipSuffix = ' MB/s',
  legendConfig,
  animation,
}) => ({
  chart: {
    type: 'spline',
    animation: animation ?? { duration: 1000, easing: 'easeOutQuart' },
    marginRight: 10,
    height,
    backgroundColor: DARK_THEME.bg,
    style: { fontFamily: FONT_FAMILY },
  },
  time: { useUTC: false },
  title: {
    text: title,
    style: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: DARK_THEME.textWhite,
    },
  },
  xAxis: {
    type: 'datetime',
    tickPixelInterval: 150,
    ...baseAxisStyle(),
  },
  yAxis: {
    title: {
      text: yAxisTitle,
      style: { fontSize: '12px', color: DARK_THEME.textLight },
    },
    min: yAxisMin,
    ...(yAxisMax !== undefined && { max: yAxisMax }),
    ...baseAxisStyle(),
  },
  legend: legendConfig ?? {
    enabled: true,
    itemStyle: { fontSize: '10px', color: DARK_THEME.textWhite },
    itemHoverStyle: { color: '#64b5f6' },
  },
  plotOptions: {
    spline: { marker: { enabled: false }, lineWidth: 2 },
  },
  series,
  credits: { enabled: false },
  tooltip: {
    shared: true,
    valueSuffix: tooltipSuffix,
    backgroundColor: DARK_THEME.tooltipBg,
    borderColor: DARK_THEME.axisLine,
    style: { color: DARK_THEME.textWhite, fontSize: '11px' },
  },
});
