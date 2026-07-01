import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

/**
 * ConfirmModal - Reusable confirmation dialog (react-bootstrap Modal).
 * Replaces window.confirm() with a styled, accessible dialog. react-bootstrap handles
 * ESC/backdrop close, focus trapping, body scroll lock and portaling.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  cancelText = 'Cancel',
  icon = 'fas fa-exclamation-triangle',
  loading = false,
}) => (
  <Modal
    show={isOpen}
    onHide={onClose}
    backdrop={loading ? 'static' : true}
    keyboard={!loading}
    centered
  >
    <Modal.Header closeButton={!loading}>
      <Modal.Title>
        {icon ? (
          <span className="d-inline-flex align-items-center">
            <span className="text-warning me-2">
              <i className={icon} />
            </span>
            <span>{title}</span>
          </span>
        ) : (
          title
        )}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>{message}</Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      <Button variant={confirmVariant.replace(/^is-/, '')} onClick={onConfirm} disabled={loading}>
        {loading && (
          <Spinner
            as="span"
            size="sm"
            animation="border"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
        )}
        {confirmText}
      </Button>
    </Modal.Footer>
  </Modal>
);

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  confirmVariant: PropTypes.string,
  cancelText: PropTypes.string,
  icon: PropTypes.string,
  loading: PropTypes.bool,
};

export default ConfirmModal;
