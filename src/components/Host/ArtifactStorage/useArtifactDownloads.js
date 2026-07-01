import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for tracking active download/upload tasks with polling.
 */
const useArtifactDownloads = ({ server, makeAgentRequest, onRefresh }) => {
  const [activeDownloads, setActiveDownloads] = useState(new Map());
  const [downloadPollingIntervals, setDownloadPollingIntervals] = useState(new Map());

  const activeDownloadsList = activeDownloads ? Array.from(activeDownloads.values()) : [];

  const pollTaskStatus = useCallback(
    async taskId => {
      if (!server || !makeAgentRequest) {
        return null;
      }

      try {
        const result = await makeAgentRequest(
          server.hostname,
          server.port,
          server.protocol,
          `tasks/${taskId}`,
          'GET'
        );

        return result.success ? result.data : null;
      } catch (err) {
        void err;
        return null;
      }
    },
    [server, makeAgentRequest]
  );

  const stopDownloadTracking = useCallback(taskId => {
    setDownloadPollingIntervals(prev => {
      const newMap = new Map(prev);
      const intervalId = newMap.get(taskId);
      if (intervalId) {
        clearInterval(intervalId);
        newMap.delete(taskId);
      }
      return newMap;
    });

    setActiveDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
  }, []);

  const startDownloadTracking = useCallback(
    (taskId, downloadInfo) => {
      setActiveDownloads(prev => {
        const newMap = new Map(prev);
        newMap.set(taskId, {
          ...downloadInfo,
          status: 'queued',
          startTime: Date.now(),
          isPending: true,
        });
        return newMap;
      });

      const intervalId = setInterval(async () => {
        const taskStatus = await pollTaskStatus(taskId);

        if (taskStatus) {
          setActiveDownloads(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(taskId);

            if (current) {
              newMap.set(taskId, {
                ...current,
                status: taskStatus.status,
                error_message: taskStatus.error_message,
                progress_percent: taskStatus.progress_percent || 0,
                progress_info: taskStatus.progress_info || {},
              });
            }

            return newMap;
          });

          if (taskStatus.status === 'completed') {
            stopDownloadTracking(taskId);
            onRefresh();
          } else if (taskStatus.status === 'failed') {
            setTimeout(() => {
              stopDownloadTracking(taskId);
            }, 10000);
          }
        }
      }, 2000);

      setDownloadPollingIntervals(prev => {
        const newMap = new Map(prev);
        newMap.set(taskId, intervalId);
        return newMap;
      });
    },
    [pollTaskStatus, stopDownloadTracking, onRefresh]
  );

  // Cleanup intervals on unmount
  useEffect(
    () => () => {
      downloadPollingIntervals.forEach(intervalId => {
        clearInterval(intervalId);
      });
    },
    [downloadPollingIntervals]
  );

  return {
    activeDownloads,
    activeDownloadsList,
    startDownloadTracking,
    stopDownloadTracking,
  };
};

export default useArtifactDownloads;
