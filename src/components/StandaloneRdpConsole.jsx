import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { useMode } from '../contexts/ModeContext';
import { useServers } from '../contexts/ServerContext';

import RdpConnectionPanel from './RdpConnectionPanel';
import RdpSessionHost from './RdpSessionHost';

/**
 * Full-window browser-RDP console, opened in its own tab by the RDP
 * console's expand action (the VNC StandaloneConsole pattern). The route
 * carries the agent's registry id (`self` in Direct mode) + machine name
 * (+ ?target=guest for the guest's own RDP instead of the VRDE console);
 * the session is this tab's own — the bridge takes a fresh WebSocket per
 * viewer, and VRDE multi-con permitting, it runs beside the embedded one.
 * Full-window is also the geometry the component's fit/full modes like best.
 */
const StandaloneRdpConsole = () => {
  const { agentId, machineName } = useParams();
  const [searchParams] = useSearchParams();
  const { isDirect, ready: modeReady } = useMode();
  const { servers } = useServers();
  const machine = machineName ? decodeURIComponent(machineName) : '';
  const target = searchParams.get('target') === 'guest' ? 'guest' : 'console';

  const uiRef = useRef(null);
  const [phase, setPhase] = useState('connecting');
  const [connectKey, setConnectKey] = useState(0);
  // Fixed sensible defaults here — the embedded console is where knobs live.
  const [settings] = useState({
    colorDepth: 16,
    lossy: true,
    audio: true,
    clipboard: true,
    scale: 'fit',
    resizeMode: 'follow-guest',
  });

  if (!agentId || !machine) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        Invalid console address.
      </div>
    );
  }

  const server = isDirect
    ? servers[0]
    : servers.find(candidate => String(candidate.id) === String(agentId));

  if (!modeReady || (!server && servers.length === 0)) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        <div className="text-center">
          <i className="fas fa-spinner fa-pulse fa-2x mb-2" />
          <p>Connecting to host...</p>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="hw-standalone-console hw-standalone-console-error">
        Unknown host for console (agent {agentId}).
      </div>
    );
  }

  return (
    <div className="hw-standalone-console">
      <div className="bg-dark text-white px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0">
        <h6 className="fs-6 fw-bold text-white mb-0">
          {target === 'guest' ? 'RDP' : 'VRDP'} — {machine}
        </h6>
        <div className="d-flex gap-1 m-0">
          <RdpConnectionPanel
            uiRef={uiRef}
            connected={phase === 'connected'}
            currentServer={server}
            machineName={machine}
            settings={settings}
          />
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={async () => {
              try {
                await uiRef.current?.sendClipboardData();
              } catch (err) {
                console.error('RDP clipboard send:', err);
              }
            }}
            disabled={phase !== 'connected'}
            title="Send your clipboard to the guest"
          >
            <i className="fas fa-paste" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => uiRef.current?.ctrlAltDel()}
            disabled={phase !== 'connected'}
            title="Send Ctrl+Alt+Del to the guest"
          >
            <i className="fas fa-keyboard" />
          </button>
        </div>
      </div>
      <div className="hw-standalone-console-viewer position-relative">
        <RdpSessionHost
          currentServer={server}
          machineName={machine}
          settings={settings}
          target={target}
          uiRef={uiRef}
          connectKey={connectKey}
          onPhase={setPhase}
          onReconnect={() => setConnectKey(key => key + 1)}
        />
      </div>
    </div>
  );
};

export default StandaloneRdpConsole;
