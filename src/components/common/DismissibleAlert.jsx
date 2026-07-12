import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';

const ALERT_AUTO_DISMISS_MS = 15000;

/**
 * One notification alert: X to close, self-dismisses after 15s. A NEW
 * message (different text) re-shows and restarts the timer; the same
 * persistent message stays dismissed — the user already saw it. NOT for
 * interactive prompts (choice dialogs keep their own buttons).
 */
const DismissibleAlert = ({ variant, text, onHide }) => {
  const [hidden, setHidden] = useState(false);
  // Ref keeps the timer armed on message change only — onHide identity churn
  // (inline arrows at the call sites) must not reset it every render.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  useEffect(() => {
    setHidden(false);
    const timer = setTimeout(() => {
      setHidden(true);
      if (onHideRef.current) {
        onHideRef.current();
      }
    }, ALERT_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [text]);
  if (hidden) {
    return null;
  }
  return (
    <div className={`alert ${variant} py-2 mb-3 d-flex justify-content-between align-items-center`}>
      <span>{text}</span>
      <button
        type="button"
        className="btn-close"
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true);
          if (onHide) {
            onHide();
          }
        }}
      />
    </div>
  );
};

DismissibleAlert.propTypes = {
  variant: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onHide: PropTypes.func,
};

export default DismissibleAlert;
