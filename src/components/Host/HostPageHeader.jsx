import PropTypes from 'prop-types';

/**
 * Shared header band for the host-context pages (Overview / Manage / Devices / Agent):
 * title on the left, page-specific controls on the right, constant padding + min-height
 * (hw-page-header) — so the band renders identically across the navbar tabs instead of
 * each page rolling its own markup and height.
 */
const HostPageHeader = ({ title, children }) => (
  <div className="card-header hw-page-header d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
    <div>
      <strong>{title}</strong>
    </div>
    {children ? <div className="d-flex align-items-center gap-2 flex-wrap">{children}</div> : null}
  </div>
);

HostPageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default HostPageHeader;
