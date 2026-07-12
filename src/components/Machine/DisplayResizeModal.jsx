import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import { setMachineDisplay } from '../../api/machineAPI';
import { FormModal } from '../common';

const PRESETS = ['1280x720', '1366x768', '1600x900', '1920x1080', '2560x1440', '3840x2160'];

const DisplayResizeModal = ({ isOpen, onClose, currentServer, machineName, isRunning, onDone }) => {
  const [width, setWidth] = useState('1920');
  const [height, setHeight] = useState('1080');
  const [depth, setDepth] = useState('');
  const [display, setDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  const applyPreset = preset => {
    const [w, h] = preset.split('x');
    setWidth(w);
    setHeight(h);
  };

  const handleSubmit = async () => {
    if (!width || !height) {
      setError('Width and height are required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await setMachineDisplay(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      {
        width: Number(width),
        height: Number(height),
        ...(depth !== '' && { depth: Number(depth) }),
        ...(display !== '' && { display: Number(display) }),
      }
    );
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onDone({
      text: result.data?.message || `Display hint ${width}×${height} sent to ${machineName}.`,
      warning: false,
    });
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Set Display Size — ${machineName}`}
      icon="fas fa-display"
      submitText="Resize"
      submitIcon="fas fa-check"
      loading={loading}
      showCancelButton
    >
      {!isRunning && (
        <div className="alert alert-warning py-2">
          {machineName} is not running — the resize hint needs a running guest with Guest Additions.
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="d-flex flex-wrap gap-1 mb-3">
        {PRESETS.map(preset => (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            key={preset}
            onClick={() => applyPreset(preset)}
            disabled={loading}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-width">
            Width <span className="text-danger">*</span>
          </label>
          <input
            id="display-width"
            className="form-control"
            type="number"
            min="1"
            value={width}
            onChange={e => setWidth(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-height">
            Height <span className="text-danger">*</span>
          </label>
          <input
            id="display-height"
            className="form-control"
            type="number"
            min="1"
            value={height}
            onChange={e => setHeight(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-depth">
            Color depth
          </label>
          <input
            id="display-depth"
            className="form-control"
            type="number"
            placeholder="(unchanged)"
            value={depth}
            onChange={e => setDepth(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label" htmlFor="display-index">
            Display #
          </label>
          <input
            id="display-index"
            className="form-control"
            type="number"
            min="0"
            placeholder="0"
            value={display}
            onChange={e => setDisplay(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <p className="form-text text-muted mb-0 mt-2">
        A hint via Guest Additions — the guest resizes when they honor it.
      </p>
    </FormModal>
  );
};

DisplayResizeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  onDone: PropTypes.func.isRequired,
};

export default DisplayResizeModal;
