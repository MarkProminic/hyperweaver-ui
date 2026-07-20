import { connectionInfo, sessionStats } from '@devolutions/iron-remote-desktop-rdp';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { makeAgentRequest } from '../api/serverUtils';

/**
 * Citrix-Workspace-style connection details for the RDP console (Mark's
 * reference panel): quality verdict, network rates, session facts, and a
 * 15-minute history sparkline. Data sources per the fork session's mapping:
 * - invokeExtension(sessionStats()) polled 1/s → cumulative counters,
 *   diffed into ↓/↑ bandwidth and updates/s (NOT fps — RDP has no frames).
 * - Latency: timed GET /status through the same mode-aware path the session
 *   rides (VRDE has no in-protocol RTT; the bridge→VRDE hop is LAN-local).
 * - Verdict/history: derived client-side from ping + paint freshness.
 * - guestFacts (console target only): showvminfo's video {width, height,
 *   depth} + additions_run_level, fetched once by the start preflight.
 */

const HISTORY_SECONDS = 15 * 60;
const SAMPLE_EVERY_MS = 5000;
const HISTORY_LENGTH = Math.floor((HISTORY_SECONDS * 1000) / SAMPLE_EVERY_MS);

const LEVELS = ['Excellent', 'Good', 'Fair', 'Poor'];

const VERDICT_COLORS = ['#2fb344', '#8cc152', '#f0ad4e', '#d9534f'];
const STALLED_COLOR = '#d9534f';

const STALL_AFTER_SECONDS = 5;

const scoreSample = latencyMs => {
  if (latencyMs === null) {
    return 3;
  }
  if (latencyMs < 50) {
    return 0;
  }
  if (latencyMs < 120) {
    return 1;
  }
  if (latencyMs < 250) {
    return 2;
  }
  return 3;
};

const formatRate = bytesPerSec => {
  if (bytesPerSec === null) {
    return '—';
  }
  const kb = bytesPerSec / 1024;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB/s`;
  }
  return `${kb.toFixed(0)} KB/s`;
};

const formatDuration = ms => {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const LEVEL_KEYS = {
  Excellent: 'console.historySparkline.excellent',
  Good: 'console.historySparkline.good',
  Fair: 'console.historySparkline.fair',
  Poor: 'console.historySparkline.poor',
};

/** The 15-minute quality sparkline: one point per 5s sample, four level rows. */
const HistorySparkline = ({ history }) => {
  const { t } = useTranslation();
  const width = 220;
  const height = 60;
  const top = 6;
  const rowGap = (height - 2 * top) / (LEVELS.length - 1);
  const points = history
    .map((sample, index) => {
      const x = (index / Math.max(HISTORY_LENGTH - 1, 1)) * width;
      const y = top + sample.score * rowGap;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="d-flex gap-2 align-items-stretch">
      <div
        className="d-flex flex-column justify-content-between text-muted"
        style={{ fontSize: '0.6rem' }}
      >
        {LEVELS.map(level => (
          <span key={level}>{t(LEVEL_KEYS[level])}</span>
        ))}
      </div>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={t('console.historySparkline.qualityAriaLabel')}
      >
        {LEVELS.map((level, index) => (
          <line
            key={level}
            x1="0"
            x2={width}
            y1={top + index * rowGap}
            y2={top + index * rowGap}
            stroke="currentColor"
            strokeOpacity="0.15"
          />
        ))}
        {history.length > 1 && (
          <polyline points={points} fill="none" stroke="#2fb344" strokeWidth="1.5" />
        )}
      </svg>
    </div>
  );
};

HistorySparkline.propTypes = {
  history: PropTypes.arrayOf(PropTypes.shape({ score: PropTypes.number })).isRequired,
};

const DetailRow = ({ label, value }) => (
  <div className="d-flex justify-content-between gap-3">
    <span className="text-muted small">{label}</span>
    <span className="small text-end">{value}</span>
  </div>
);

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

const RdpConnectionPanel = ({
  uiRef,
  connected,
  currentServer,
  machineName,
  settings,
  guestFacts = null,
}) => {
  const { t } = useTranslation();
  const verdicts = [
    {
      label: t('console.rdpConnectionPanel.verdictExcellentLabel'),
      hint: t('console.rdpConnectionPanel.verdictExcellentHint'),
      color: VERDICT_COLORS[0],
    },
    {
      label: t('console.rdpConnectionPanel.verdictGoodLabel'),
      hint: t('console.rdpConnectionPanel.verdictGoodHint'),
      color: VERDICT_COLORS[1],
    },
    {
      label: t('console.rdpConnectionPanel.verdictFairLabel'),
      hint: t('console.rdpConnectionPanel.verdictFairHint'),
      color: VERDICT_COLORS[2],
    },
    {
      label: t('console.rdpConnectionPanel.verdictPoorLabel'),
      hint: t('console.rdpConnectionPanel.verdictPoorHint'),
      color: VERDICT_COLORS[3],
    },
  ];
  const stalledVerdict = {
    label: t('console.rdpConnectionPanel.verdictStalledLabel'),
    hint: t('console.rdpConnectionPanel.verdictStalledHint'),
    color: STALLED_COLOR,
  };
  const [rates, setRates] = useState({ down: null, up: null, updates: null });
  const [latency, setLatency] = useState(null);
  const [duration, setDuration] = useState(0);
  const [history, setHistory] = useState([]);
  // Negotiated facts, fixed at connect time (connectionInfo()): input mode,
  // the depth the session ACTUALLY runs, compression when it exists.
  const [negotiated, setNegotiated] = useState(null);

  const stallRef = useRef({ quiet: 0, stalled: false });

  // Negotiated connection facts — once per session.
  useEffect(() => {
    if (!connected) {
      setNegotiated(null);
      return;
    }
    try {
      const info = uiRef.current?.invokeExtension(connectionInfo());
      if (info) {
        setNegotiated(info);
      }
    } catch (infoErr) {
      console.warn('RDP connectionInfo:', infoErr);
    }
  }, [connected, uiRef]);

  // 1s stats poll while connected: diff cumulative counters into rates.
  useEffect(() => {
    if (!connected) {
      setRates({ down: null, up: null, updates: null });
      setDuration(0);
      stallRef.current = { quiet: 0, stalled: false };
      return undefined;
    }
    const startedAt = Date.now();
    let prev = null;
    const interval = setInterval(() => {
      const now = Date.now();
      setDuration(now - startedAt);
      let snapshot = null;
      try {
        snapshot = uiRef.current?.invokeExtension(sessionStats());
      } catch (statsErr) {
        console.warn('RDP sessionStats:', statsErr);
      }
      if (snapshot && prev) {
        const dt = (now - prev.at) / 1000;
        if (dt > 0) {
          setRates({
            down: (snapshot.bytesReceived - prev.snapshot.bytesReceived) / dt,
            up: (snapshot.bytesSent - prev.snapshot.bytesSent) / dt,
            updates: (snapshot.regionsDrawn - prev.snapshot.regionsDrawn) / dt,
          });
        }
        const framesDelta = snapshot.framesReceived - prev.snapshot.framesReceived;
        const drawsDelta = snapshot.regionsDrawn - prev.snapshot.regionsDrawn;
        const sentDelta = snapshot.bytesSent - prev.snapshot.bytesSent;
        if (framesDelta > 0 || drawsDelta > 0) {
          stallRef.current = { quiet: 0, stalled: false };
        } else if (sentDelta > 0) {
          const quiet = stallRef.current.quiet + 1;
          stallRef.current = { quiet, stalled: quiet >= STALL_AFTER_SECONDS };
        }
      }
      if (snapshot) {
        prev = { snapshot, at: now };
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [connected, uiRef]);

  // 5s latency ping + history sampling. Times a GET /status over the same
  // Direct/Aggregated path the console rides.
  useEffect(() => {
    if (!connected || !currentServer) {
      setLatency(null);
      setHistory([]);
      return undefined;
    }
    let cancelled = false;
    const sample = async () => {
      const t0 = performance.now();
      const result = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'status'
      );
      if (cancelled) {
        return;
      }
      const measured = result.success ? Math.round(performance.now() - t0) : null;
      setLatency(measured);
      const score = stallRef.current.stalled ? 3 : scoreSample(measured);
      setHistory(prev => [...prev.slice(-(HISTORY_LENGTH - 1)), { score }]);
    };
    sample();
    const interval = setInterval(sample, SAMPLE_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connected, currentServer]);

  const stalled = connected && stallRef.current.stalled;
  const verdict = stalled ? stalledVerdict : verdicts[scoreSample(latency)];

  const transport = 'WSS → IronRDP → TLS → RDP';

  const outputPathValue = (
    <span title={t('console.rdpConnectionPanel.fastPathHint')}>
      {t('console.rdpConnectionPanel.fastPath')}
    </span>
  );

  const inputPathValue = negotiated?.inputMode ? (
    <span
      title={
        negotiated.inputMode === 'slow-path'
          ? t('console.rdpConnectionPanel.slowPathHint')
          : t('console.rdpConnectionPanel.fastPathInputHint')
      }
    >
      {negotiated.inputMode === 'slow-path'
        ? t('console.rdpConnectionPanel.slowPathVrde')
        : t('console.rdpConnectionPanel.fastPath')}
    </span>
  ) : null;

  const handleCopyReport = async () => {
    const report = {
      machine: machineName,
      transport,
      negotiated,
      latency_ms: latency,
      down_bytes_per_s: rates.down,
      up_bytes_per_s: rates.up,
      updates_per_s: rates.updates,
      session_duration_ms: duration,
      stalled,
      color_depth: settings.colorDepth,
      lossy_compression: settings.lossy,
      sound: settings.audio,
      guest_video: guestFacts?.video ?? null,
      guest_additions_run_level: guestFacts?.additions_run_level ?? null,
      history_5s_scores: history.map(sample => LEVELS[sample.score]),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    } catch (copyErr) {
      console.error('RDP report copy:', copyErr);
    }
  };

  return (
    <Dropdown autoClose="outside" align="end">
      <Dropdown.Toggle
        variant="secondary"
        size="sm"
        title={t('console.rdpConnectionPanel.connectionDetails')}
      >
        <i className="fas fa-wave-square" />
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-3 hw-rdp-connection-menu">
        <div className="d-flex align-items-center gap-2 mb-1">
          <i className="fas fa-circle" style={{ color: verdict.color, fontSize: '0.6rem' }} />
          <strong className="small">
            {connected ? verdict.label : t('console.rdpConnectionPanel.notConnected')}
          </strong>
        </div>
        <div className="text-muted mb-2" style={{ fontSize: '0.7rem' }}>
          {connected ? verdict.hint : t('console.rdpConnectionPanel.detailsAppearOnceLive')}
        </div>

        <div className="border-top pt-2 mb-2">
          <div className="text-muted small fw-bold mb-1">
            {t('console.rdpConnectionPanel.network')}
          </div>
          <DetailRow
            label={t('console.rdpConnectionPanel.latency')}
            value={latency === null ? '—' : `${latency} ms`}
          />
          <DetailRow label={t('console.rdpConnectionPanel.down')} value={formatRate(rates.down)} />
          <DetailRow label={t('console.rdpConnectionPanel.up')} value={formatRate(rates.up)} />
          <DetailRow
            label={t('console.rdpConnectionPanel.updatesPerSecond')}
            value={rates.updates === null ? '—' : rates.updates.toFixed(0)}
          />
          <DetailRow label={t('console.rdpConnectionPanel.transport')} value={transport} />
        </div>

        <div className="border-top pt-2 mb-2">
          <div className="text-muted small fw-bold mb-1">
            {t('console.rdpConnectionPanel.session')}
          </div>
          <DetailRow label={t('console.rdpConnectionPanel.machine')} value={machineName || '—'} />
          <DetailRow
            label={t('console.rdpConnectionPanel.duration')}
            value={formatDuration(duration)}
          />
          <DetailRow
            label={t('console.rdpConnectionPanel.colorDepth')}
            value={`${negotiated?.colorDepth ?? settings.colorDepth}-bit`}
          />
          <DetailRow
            label={t('console.rdpConnectionPanel.compression')}
            value={
              negotiated?.compression ??
              (settings.lossy
                ? t('console.rdpConnectionPanel.lossy')
                : t('console.rdpConnectionPanel.lossless'))
            }
          />
          <DetailRow
            label={t('console.rdpConnectionPanel.sound')}
            value={
              settings.audio
                ? t('console.rdpConnectionPanel.on')
                : t('console.rdpConnectionPanel.off')
            }
          />
          {negotiated && (
            <DetailRow label={t('console.rdpConnectionPanel.outputPath')} value={outputPathValue} />
          )}
          {inputPathValue && (
            <DetailRow label={t('console.rdpConnectionPanel.inputPath')} value={inputPathValue} />
          )}
          {negotiated?.resizeMode && (
            <DetailRow
              label={t('console.rdpConnectionPanel.resizeMode')}
              value={negotiated.resizeMode}
            />
          )}
          {guestFacts?.video && (
            <DetailRow
              label={t('console.rdpConnectionPanel.guestDisplay')}
              value={`${guestFacts.video.width}×${guestFacts.video.height}×${guestFacts.video.depth}`}
            />
          )}
          {typeof guestFacts?.additions_run_level === 'number' && (
            <DetailRow
              label={t('console.rdpConnectionPanel.guestAdditions')}
              value={
                guestFacts.additions_run_level > 0
                  ? t('console.rdpConnectionPanel.runLevel', {
                      level: guestFacts.additions_run_level,
                    })
                  : t('console.rdpConnectionPanel.notDetected')
              }
            />
          )}
        </div>

        <div className="border-top pt-2 mb-2">
          <div className="text-muted small fw-bold mb-1">
            {t('console.rdpConnectionPanel.history15Min')}
          </div>
          <HistorySparkline history={history} />
        </div>

        <button
          type="button"
          className="btn btn-sm btn-outline-secondary w-100"
          onClick={handleCopyReport}
          disabled={!connected}
        >
          <i className="fas fa-copy me-2" />
          <span>{t('console.rdpConnectionPanel.copyReport')}</span>
        </button>
      </Dropdown.Menu>
    </Dropdown>
  );
};

RdpConnectionPanel.propTypes = {
  uiRef: PropTypes.object.isRequired,
  connected: PropTypes.bool,
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  settings: PropTypes.shape({
    colorDepth: PropTypes.number,
    lossy: PropTypes.bool,
    audio: PropTypes.bool,
  }).isRequired,
  guestFacts: PropTypes.shape({
    video: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
      depth: PropTypes.number,
    }),
    additions_run_level: PropTypes.number,
  }),
};

export default RdpConnectionPanel;
