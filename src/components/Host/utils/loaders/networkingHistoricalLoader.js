// Helper function to calculate historical timestamp based on time window
const getHistoricalTimestamp = timeWindow => {
  const now = new Date();
  const minutesAgo = {
    '1min': 1,
    '5min': 5,
    '10min': 10,
    '15min': 15,
    '30min': 30,
    '1hour': 60,
    '3hour': 180,
    '6hour': 360,
    '12hour': 720,
    '24hour': 1440,
  };
  const minutes = minutesAgo[timeWindow] || 15;
  return new Date(now.getTime() - minutes * 60 * 1000).toISOString();
};

// Helper function to get resolution limit for API requests (per interface)
const getResolutionLimit = resolution => {
  const resolutionLimits = {
    realtime: 125, // per interface
    high: 38, // per interface
    medium: 13, // per interface
    low: 5, // per interface
  };
  return resolutionLimits[resolution] || 13;
};

export const fetchHistoricalNetworkData = async (
  currentServer,
  makeAgentRequest,
  timeWindow,
  resolution
) => {
  console.log(
    '📊 HISTORICAL CHARTS: Loading historical data for time window:',
    timeWindow,
    'resolution:',
    resolution
  );

  const historicalTimestamp = getHistoricalTimestamp(timeWindow);
  const limit = getResolutionLimit(resolution);

  console.log(
    '📊 HISTORICAL CHARTS: Requesting data since:',
    historicalTimestamp,
    'with limit:',
    limit
  );

  const historicalResult = await makeAgentRequest(
    currentServer.hostname,
    currentServer.port,
    currentServer.protocol,
    `monitoring/network/usage?since=${encodeURIComponent(historicalTimestamp)}&limit=${limit}&per_interface=true`
  );

  const historicalUsage = historicalResult?.data?.usage || historicalResult?.usage || [];

  if (historicalUsage && Array.isArray(historicalUsage) && historicalUsage.length > 0) {
    console.log('📊 HISTORICAL CHARTS: Received', historicalUsage.length, 'historical records');

    // Group historical data by interface
    const interfaceGroups = {};

    historicalUsage.forEach(record => {
      const interfaceName = record.link;
      if (!interfaceName) {
        return;
      }

      if (!interfaceGroups[interfaceName]) {
        interfaceGroups[interfaceName] = [];
      }
      interfaceGroups[interfaceName].push(record);
    });

    // Build chart data from historical records
    const newChartData = {};

    Object.entries(interfaceGroups).forEach(([interfaceName, records]) => {
      // Sort records by timestamp (oldest first)
      const sortedRecords = records.sort(
        (a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp)
      );

      newChartData[interfaceName] = {
        rxData: [],
        txData: [],
        totalData: [],
      };

      sortedRecords.forEach(record => {
        const timestamp = new Date(record.scan_timestamp).getTime();
        const rxMbps = parseFloat(record.rx_mbps) || 0;
        const txMbps = parseFloat(record.tx_mbps) || 0;

        newChartData[interfaceName].rxData.push([timestamp, rxMbps]);
        newChartData[interfaceName].txData.push([timestamp, txMbps]);
        newChartData[interfaceName].totalData.push([timestamp, rxMbps + txMbps]);
      });

      console.log(
        `📊 HISTORICAL CHARTS: Built ${sortedRecords.length} historical points for ${interfaceName}`
      );
    });

    console.log(
      '📊 HISTORICAL CHARTS: Loaded historical data for',
      Object.keys(newChartData).length,
      'interfaces'
    );

    return newChartData;
  }

  console.warn('📊 HISTORICAL CHARTS: No historical usage data received');
  return {};
};
