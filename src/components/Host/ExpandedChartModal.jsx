import PropTypes from 'prop-types';

import Chart from '../Chart';
import { ContentModal } from '../common';

import { getChartTitle, getExpandedChartOptions } from './ExpandedChartOptions';

const ExpandedChartModal = ({ chartId, type, close, chartData, poolChartData, arcChartData }) => {
  if (!chartId) {
    return null;
  }

  return (
    <ContentModal
      isOpen={!!chartId}
      onClose={close}
      title={getChartTitle(chartId, type)}
      icon="fas fa-chart-line"
    >
      <Chart
        options={getExpandedChartOptions(chartId, type, chartData, poolChartData, arcChartData)}
      />
    </ContentModal>
  );
};

ExpandedChartModal.propTypes = {
  chartId: PropTypes.string,
  type: PropTypes.string.isRequired,
  close: PropTypes.func.isRequired,
  chartData: PropTypes.object,
  poolChartData: PropTypes.object,
  arcChartData: PropTypes.object,
};

export default ExpandedChartModal;
