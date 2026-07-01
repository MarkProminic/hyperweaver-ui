import PropTypes from 'prop-types';

import { ContentModal } from '../../../common';
import ExpandedNetworkChart from '../Network';

import ExpandedArcChart from './Arc';
import ExpandedChartControls from './Controls';
import ExpandedCpuChart from './Cpu';
import ExpandedMemoryChart from './Memory';
import ExpandedStorageIOChart from './StorageIO';

const ExpandedChartModal = ({
  expandedChart,
  closeExpandedChart,
  expandedChartType,
  currentServer,
  storageSeriesVisibility,
  setStorageSeriesVisibility,
  networkSeriesVisibility,
  setNetworkSeriesVisibility,
  cpuSeriesVisibility,
  setCpuSeriesVisibility,
  memorySeriesVisibility,
  setMemorySeriesVisibility,
  chartData,
  arcChartData,
  networkChartData,
  cpuChartData,
  memoryChartData,
}) => {
  if (!expandedChart) {
    return null;
  }

  // Get modal title based on chart type
  const getModalTitle = () => {
    let baseTitle = 'Performance';
    if (expandedChartType === 'storage-io') {
      baseTitle = 'Storage I/O Performance';
    } else if (expandedChartType === 'arc') {
      baseTitle = 'ZFS ARC Performance';
    } else if (expandedChartType === 'network') {
      baseTitle = 'Network Performance';
    } else if (expandedChartType === 'cpu') {
      baseTitle = 'CPU Performance';
    } else if (expandedChartType === 'memory') {
      baseTitle = 'Memory Performance';
    }
    return `${baseTitle} - ${currentServer?.hostname}`;
  };

  // Get modal icon based on chart type
  const getModalIcon = () => {
    if (expandedChartType === 'storage-io') {
      return 'fa-hdd';
    }
    if (expandedChartType === 'arc') {
      return 'fa-memory';
    }
    if (expandedChartType === 'network') {
      return 'fa-network-wired';
    }
    if (expandedChartType === 'cpu') {
      return 'fa-microchip';
    }
    if (expandedChartType === 'memory') {
      return 'fa-memory';
    }
    return 'fa-chart-area';
  };

  const renderChart = () => {
    switch (expandedChartType) {
      case 'storage-io':
        return (
          <ExpandedStorageIOChart
            chartData={chartData}
            storageSeriesVisibility={storageSeriesVisibility}
          />
        );
      case 'arc':
        return <ExpandedArcChart arcChartData={arcChartData} />;
      case 'network':
        return (
          <ExpandedNetworkChart
            networkChartData={networkChartData}
            networkSeriesVisibility={networkSeriesVisibility}
          />
        );
      case 'cpu':
        return (
          <ExpandedCpuChart cpuChartData={cpuChartData} cpuSeriesVisibility={cpuSeriesVisibility} />
        );
      case 'memory':
        return (
          <ExpandedMemoryChart
            memoryChartData={memoryChartData}
            memorySeriesVisibility={memorySeriesVisibility}
          />
        );
      default:
        return null;
    }
  };

  const renderControls = () => {
    const storageLabels = {
      read: { label: 'Read', className: 'btn-info' },
      write: { label: 'Write', className: 'btn-warning' },
      total: { label: 'Total', className: 'btn-success' },
    };
    const networkLabels = {
      read: { label: 'RX', className: 'btn-info' },
      write: { label: 'TX', className: 'btn-warning' },
      total: { label: 'Total', className: 'btn-success' },
    };
    const cpuLabels = {
      overall: { label: 'Avg', className: 'btn-info' },
      cores: { label: 'Cores', className: 'btn-info' },
      load: { label: 'Load', className: 'btn-info' },
    };
    const memoryLabels = {
      used: { label: 'Used', className: 'btn-info' },
      free: { label: 'Free', className: 'btn-success' },
      cached: { label: 'Cached', className: 'btn-warning' },
    };

    switch (expandedChartType) {
      case 'storage-io':
        return (
          <ExpandedChartControls
            visibility={storageSeriesVisibility}
            setVisibility={setStorageSeriesVisibility}
            labels={storageLabels}
          />
        );
      case 'network':
        return (
          <ExpandedChartControls
            visibility={networkSeriesVisibility}
            setVisibility={setNetworkSeriesVisibility}
            labels={networkLabels}
          />
        );
      case 'cpu':
        return (
          <ExpandedChartControls
            visibility={cpuSeriesVisibility}
            setVisibility={setCpuSeriesVisibility}
            labels={cpuLabels}
          />
        );
      case 'memory':
        return (
          <ExpandedChartControls
            visibility={memorySeriesVisibility}
            setVisibility={setMemorySeriesVisibility}
            labels={memoryLabels}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ContentModal
      isOpen={!!expandedChart}
      onClose={closeExpandedChart}
      title={getModalTitle()}
      icon={`fas ${getModalIcon()}`}
    >
      {renderControls()}
      {renderChart()}
    </ContentModal>
  );
};

ExpandedChartModal.propTypes = {
  expandedChart: PropTypes.string,
  closeExpandedChart: PropTypes.func.isRequired,
  expandedChartType: PropTypes.string,
  currentServer: PropTypes.shape({
    hostname: PropTypes.string,
  }),
  storageSeriesVisibility: PropTypes.object.isRequired,
  setStorageSeriesVisibility: PropTypes.func.isRequired,
  networkSeriesVisibility: PropTypes.object.isRequired,
  setNetworkSeriesVisibility: PropTypes.func.isRequired,
  cpuSeriesVisibility: PropTypes.object.isRequired,
  setCpuSeriesVisibility: PropTypes.func.isRequired,
  memorySeriesVisibility: PropTypes.object.isRequired,
  setMemorySeriesVisibility: PropTypes.func.isRequired,
  chartData: PropTypes.object.isRequired,
  arcChartData: PropTypes.object.isRequired,
  networkChartData: PropTypes.object.isRequired,
  cpuChartData: PropTypes.object.isRequired,
  memoryChartData: PropTypes.object.isRequired,
};

export default ExpandedChartModal;
