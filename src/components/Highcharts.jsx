import Highcharts from 'highcharts';
// Side-effect import. Highcharts v12+ ships as ESM, where modules self-register
// against the core instance simply by being imported — the pre-v12 factory form
// `accessibility(Highcharts)` no longer exists, so the previous guarded call was
// dead (its default export isn't a function in v13) and a11y never initialized.
// Uses the same "highcharts/" path as the core import above so it registers
// against this exact instance rather than a duplicate one.
import 'highcharts/modules/accessibility';

export default Highcharts;
