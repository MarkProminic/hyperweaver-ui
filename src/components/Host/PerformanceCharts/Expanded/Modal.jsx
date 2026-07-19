import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  if (!expandedChart) {
    return null;
  }

  // Get modal title based on chart type
  const getModalTitle = () => {
    let baseTitle = t('hostCharts.expandedModal.performanceTitle');
    if (expandedChartType === 'storage-io') {
      baseTitle = t('hostCharts.expandedModal.storageIOTitle');
    } else if (expandedChartType === 'arc') {
      baseTitle = t('hostCharts.expandedModal.arcTitle');
    } else if (expandedChartType === 'network') {
      baseTitle = t('hostCharts.expandedModal.networkTitle');
    } else if (expandedChartType === 'cpu') {
      baseTitle = t('hostCharts.expandedModal.cpuTitle');
    } else if (expandedChartType === 'memory') {
      baseTitle = t('hostCharts.expandedModal.memoryTitle');
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
      read: { label: t('hostCharts.expandedModal.readLabel'), className: 'btn-info' },
      write: { label: t('hostCharts.expandedModal.writeLabel'), className: 'btn-warning' },
      total: { label: t('hostCharts.expandedModal.totalLabel'), className: 'btn-success' },
    };
    const networkLabels = {
      read: { label: t('hostCharts.expandedModal.rxLabel'), className: 'btn-info' },
      write: { label: t('hostCharts.expandedModal.txLabel'), className: 'btn-warning' },
      total: { label: t('hostCharts.expandedModal.totalLabel'), className: 'btn-success' },
    };
    const cpuLabels = {
      overall: { label: t('hostCharts.expandedModal.avgLabel'), className: 'btn-info' },
      cores: { label: t('hostCharts.expandedModal.coresLabel'), className: 'btn-info' },
      load: { label: t('hostCharts.expandedModal.loadLabel'), className: 'btn-info' },
    };
    const memoryLabels = {
      used: { label: t('hostCharts.expandedModal.usedLabel'), className: 'btn-info' },
      free: { label: t('hostCharts.expandedModal.freeLabel'), className: 'btn-success' },
      cached: { label: t('hostCharts.expandedModal.cachedLabel'), className: 'btn-warning' },
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
