import { HighchartsReact } from 'highcharts-react-official';
import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import Highcharts from './Highcharts';

/**
 * App-wide Highcharts wrapper. Every chart MUST render through this — never
 * <HighchartsReact> directly.
 *
 * highcharts-react-official defaults updateArgs to [true, true], i.e.
 * chart.update(options, redraw=true, oneToOne=true) with update animation left
 * ON. The real-time Host charts rebuild their options/series on every poll and
 * series come and go; if the component unmounts (route change, section collapse,
 * sort re-key) while an update/removal animation is still pending, the deferred
 * animation callback runs against an already-destroyed chart and throws
 * "t.chart is undefined", crashing the page.
 *
 * Forcing the third arg (animation) to false makes updates and series removal
 * synchronous, so nothing is left to fire after teardown. redraw + oneToOne stay
 * true so series still sync correctly. A caller may still override updateArgs.
 */
const Chart = forwardRef((props, ref) => (
  <HighchartsReact highcharts={Highcharts} updateArgs={[true, true, false]} {...props} ref={ref} />
));

Chart.displayName = 'Chart';

Chart.propTypes = {
  options: PropTypes.object.isRequired,
};

export default Chart;
