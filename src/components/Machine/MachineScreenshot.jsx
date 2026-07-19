import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { makeAgentRequest } from '../../api/serverUtils';

// GET /machines/{name}/vnc/screenshot answers raw PNG (502 when not
// running). Fetched as a blob — an <img src> can't carry the auth header.
// Screenshots are expensive; refresh rarely, manual refresh for "now".
const SCREENSHOT_INTERVAL_MS = 300000;

const MachineScreenshot = ({ currentServer, machineName, isRunning, frameless = false }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState(null);
  const urlRef = useRef(null);

  const capture = useCallback(async () => {
    if (!currentServer || !machineName || !isRunning) {
      return;
    }
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      `machines/${machineName}/vnc/screenshot`,
      'GET',
      null,
      null,
      true,
      null,
      'blob'
    );
    if (result.success && result.data instanceof Blob) {
      const next = URL.createObjectURL(result.data);
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = next;
      setUrl(next);
    }
  }, [currentServer, machineName, isRunning]);

  useEffect(() => {
    capture();
    const interval = isRunning ? setInterval(capture, SCREENSHOT_INTERVAL_MS) : null;
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [capture, isRunning]);

  if (!isRunning || !url) {
    return null;
  }

  // Frameless: image ONLY — the console section's inactive view embeds it;
  // controls live in the console actions row, never inside the display.
  // Flexing with min-height keeps the caption below from clipping out.
  if (frameless) {
    return (
      <img
        src={url}
        alt={t('machine.machineScreenshot.consoleScreenshotAlt', { machineName })}
        className="img-fluid"
        style={{ flex: '1 1 auto', minHeight: 0, maxWidth: '100%', objectFit: 'contain' }}
      />
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="fs-6 fw-bold mb-0">
            <i className="fas fa-desktop me-2" />
            {t('machine.machineScreenshot.screen')}
          </h4>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={capture}
            title={t('machine.machineScreenshot.refreshTooltip')}
          >
            <i className="fas fa-sync-alt" />
          </button>
        </div>
        <img
          src={url}
          alt={t('machine.machineScreenshot.consoleScreenshotAlt', { machineName })}
          className="img-fluid border rounded"
        />
      </div>
    </div>
  );
};

MachineScreenshot.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string.isRequired,
  isRunning: PropTypes.bool,
  frameless: PropTypes.bool,
};

export default MachineScreenshot;
