import PropTypes from 'prop-types';
import Modal from 'react-bootstrap/Modal';

/**
 * ContentModal - Reusable modal for displaying read-only content (react-bootstrap Modal).
 * Perfect for charts, device details, service information, etc. react-bootstrap handles
 * ESC/backdrop close, focus trapping, body scroll lock and portaling.
 */
const ContentModal = ({
  isOpen,
  onClose,
  title,
  icon = null,
  className = '',
  children,
  'aria-label': ariaLabel,
}) => (
  <Modal
    show={isOpen}
    onHide={onClose}
    dialogClassName={`hw-modal-wide ${className}`.trim()}
    centered
    scrollable
    aria-label={ariaLabel || title}
  >
    <Modal.Header closeButton>
      <Modal.Title>
        {icon ? (
          <span className="d-inline-flex align-items-center">
            <span className="me-2">
              <i className={icon} />
            </span>
            <span>{title}</span>
          </span>
        ) : (
          title
        )}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>{children}</Modal.Body>
  </Modal>
);

ContentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  'aria-label': PropTypes.string,
};

export default ContentModal;
