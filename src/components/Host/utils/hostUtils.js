/**
 * Helper function to calculate historical timestamp based on time window
 * @param {string} timeWindow - Time window string (e.g., "15min", "1hour", "24hour")
 * @returns {string} ISO timestamp for the start of the time window
 */
export const getHistoricalTimestamp = timeWindow => {
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

/**
 * Helper function to get resolution limit for API requests
 * @param {string} resolution - Resolution string (realtime, high, medium, low)
 * @returns {number} Limit value for API requests
 */
export const getResolutionLimit = resolution => {
  const resolutionLimits = {
    realtime: 125,
    high: 38,
    medium: 13,
    low: 5,
  };
  return resolutionLimits[resolution] || 38;
};
