import PropTypes from 'prop-types';
import { useId } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

/**
 * FormModal - Reusable modal for forms and interactive content (react-bootstrap Modal).
 * Perfect for create/edit forms, configuration wizards, etc. react-bootstrap handles
 * ESC/backdrop close, focus trapping, body scroll lock and portaling.
 *
 * The <form> lives inside Modal.Body so the body stays the direct child of .modal-content
 * that Bootstrap's `scrollable` needs — a tall form scrolls while the header/footer stay
 * pinned. The footer submit button is tied to the form via the HTML `form` attribute, so
 * Enter-to-submit and the button both submit even though the button sits outside the form.
 */
const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  icon = null,
  className = '',
  children,
  submitText = 'Submit',
  submitVariant = 'primary',
  submitIcon = null,
  loading = false,
  disabled = false,
  showCancelButton = false,
  cancelText = 'Cancel',
  additionalActions = null,
  'aria-label': ariaLabel,
}) => {
  const formId = useId();

  const handleSubmit = e => {
    e.preventDefault();
    if (!loading && !disabled && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      dialogClassName={`hw-modal-wide ${className}`.trim()}
      backdrop={loading ? 'static' : true}
      keyboard={!loading}
      centered
      scrollable
    >
      <Modal.Header closeButton={!loading}>
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
      <Modal.Body aria-label={ariaLabel || title}>
        <form id={formId} onSubmit={handleSubmit}>
          {children}
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="submit"
          form={formId}
          variant={submitVariant.replace(/^is-/, '')}
          disabled={loading || disabled}
        >
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
          {submitIcon && !loading && (
            <span className="me-2">
              <i className={submitIcon} />
            </span>
          )}
          <span>{submitText}</span>
        </Button>
        {showCancelButton && (
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
        )}
        {additionalActions}
      </Modal.Footer>
    </Modal>
  );
};

FormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  submitText: PropTypes.string,
  submitVariant: PropTypes.string,
  submitIcon: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  showCancelButton: PropTypes.bool,
  cancelText: PropTypes.string,
  additionalActions: PropTypes.node,
  'aria-label': PropTypes.string,
};

export default FormModal;
