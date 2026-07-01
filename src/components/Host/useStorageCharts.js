import { useState, useRef } from 'react';

export const useStorageCharts = () => {
  const [chartData, setChartData] = useState({});
  const [poolChartData, setPoolChartData] = useState({});
  const [arcChartData, setArcChartData] = useState({});

  const chartRefs = useRef({});
  const poolChartRefs = useRef({});
  const summaryChartRefs = useRef({});
  const arcChartRef = useRef(null);

  const [expandedChart, setExpandedChart] = useState(null);
  const [expandedChartType, setExpandedChartType] = useState(null);
  const [chartSortBy, setChartSortBy] = useState('bandwidth');
  const [seriesVisibility, setSeriesVisibility] = useState({
    read: true,
    write: true,
    total: true,
  });

  const expandChart = (chartId, type) => {
    setExpandedChart(chartId);
    setExpandedChartType(type);
  };

  const closeExpandedChart = () => {
    setExpandedChart(null);
    setExpandedChartType(null);
  };

  const getSortedChartEntries = () =>
    Object.entries(chartData)
      .filter(([, data]) => data.totalData.length > 0)
      .sort(([deviceNameA, dataA], [deviceNameB, dataB]) => {
        const calcAvg = series =>
          series.slice(-5).reduce((sum, point) => sum + (point[1] || 0), 0) /
          Math.min(5, series.length);

        switch (chartSortBy) {
          case 'name':
            return deviceNameA.localeCompare(deviceNameB);

          case 'bandwidth':
            return calcAvg(dataB.totalData) - calcAvg(dataA.totalData);

          case 'read':
            return calcAvg(dataB.readData) - calcAvg(dataA.readData);

          case 'write':
            return calcAvg(dataB.writeData) - calcAvg(dataA.writeData);

          default:
            return deviceNameA.localeCompare(deviceNameB);
        }
      });

  const updateArcChartData = (arcData, maxDataPoints) => {
    if (arcData.length === 0) {
      return;
    }

    const sortedArcData = [...arcData].sort(
      (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
    );

    const historicalChartData = {
      arcSize: [],
      arcTargetSize: [],
      mruSize: [],
      mfuSize: [],
      dataSize: [],
      metadataSize: [],
      hitRatio: [],
      dataDemandEfficiency: [],
      dataPrefetchEfficiency: [],
      compressionRatio: [],
    };

    const GB = 1024 * 1024 * 1024;

    sortedArcData.forEach(arcRecord => {
      const timestamp = new Date(arcRecord.scan_timestamp).getTime();
      const arcSize = parseFloat(arcRecord.arc_size) || 0;
      const arcTargetSize = parseFloat(arcRecord.arc_target_size) || 0;
      const mruSize = parseFloat(arcRecord.mru_size) || 0;
      const mfuSize = parseFloat(arcRecord.mfu_size) || 0;
      const dataSize = parseFloat(arcRecord.data_size) || 0;
      const metadataSize = parseFloat(arcRecord.metadata_size) || 0;
      const arcHits = parseFloat(arcRecord.hits || arcRecord.arc_hits) || 0;
      const arcMisses = parseFloat(arcRecord.misses || arcRecord.arc_misses) || 0;
      const hitRatio =
        arcRecord.hit_ratio ||
        (arcHits + arcMisses > 0 ? (arcHits / (arcHits + arcMisses)) * 100 : 0);
      const dataDemandEfficiency = parseFloat(arcRecord.data_demand_efficiency) || 0;
      const dataPrefetchEfficiency = parseFloat(arcRecord.data_prefetch_efficiency) || 0;
      const compressionRatio =
        arcRecord.uncompressed_size && arcRecord.compressed_size
          ? parseFloat(arcRecord.uncompressed_size) / parseFloat(arcRecord.compressed_size)
          : 1;

      historicalChartData.arcSize.push([timestamp, parseFloat((arcSize / GB).toFixed(2))]);
      historicalChartData.arcTargetSize.push([
        timestamp,
        parseFloat((arcTargetSize / GB).toFixed(2)),
      ]);
      historicalChartData.mruSize.push([timestamp, parseFloat((mruSize / GB).toFixed(2))]);
      historicalChartData.mfuSize.push([timestamp, parseFloat((mfuSize / GB).toFixed(2))]);
      historicalChartData.dataSize.push([timestamp, parseFloat((dataSize / GB).toFixed(2))]);
      historicalChartData.metadataSize.push([
        timestamp,
        parseFloat((metadataSize / GB).toFixed(2)),
      ]);
      historicalChartData.hitRatio.push([timestamp, parseFloat(hitRatio.toFixed(2))]);
      historicalChartData.dataDemandEfficiency.push([
        timestamp,
        parseFloat(dataDemandEfficiency.toFixed(2)),
      ]);
      historicalChartData.dataPrefetchEfficiency.push([
        timestamp,
        parseFloat(dataPrefetchEfficiency.toFixed(2)),
      ]);
      historicalChartData.compressionRatio.push([
        timestamp,
        parseFloat(compressionRatio.toFixed(2)),
      ]);
    });

    const allSeries = [
      'arcSize',
      'arcTargetSize',
      'mruSize',
      'mfuSize',
      'dataSize',
      'metadataSize',
      'hitRatio',
      'dataDemandEfficiency',
      'dataPrefetchEfficiency',
      'compressionRatio',
    ];

    allSeries.forEach(series => {
      if (historicalChartData[series].length > maxDataPoints) {
        historicalChartData[series] = historicalChartData[series].slice(-maxDataPoints);
      }
    });

    setArcChartData(historicalChartData);
  };

  return {
    chartData,
    setChartData,
    poolChartData,
    setPoolChartData,
    arcChartData,
    chartRefs,
    poolChartRefs,
    summaryChartRefs,
    arcChartRef,
    expandedChart,
    expandedChartType,
    expandChart,
    closeExpandedChart,
    chartSortBy,
    setChartSortBy,
    seriesVisibility,
    setSeriesVisibility,
    getSortedChartEntries,
    updateArcChartData,
  };
};
