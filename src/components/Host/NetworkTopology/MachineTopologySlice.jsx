import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import TopologyCanvas from './TopologyCanvas';
import { sliceForMachine } from './topologyModel';
import { useTopologyFeed } from './useTopologyFeed';

/**
 * The machine-detail embed: this machine's slice of the host topology —
 * its NICs, the carriers they ride, and the networks they land on.
 * Renders nothing when the machine has no network presence.
 */
const MachineTopologySlice = ({ machineName, colClass = null }) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { hosts, pulse } = useTopologyFeed({ scope: 'host' });

  const noop = useCallback(() => {}, []);

  const [host] = hosts;
  const slice = host ? sliceForMachine(host.graph, machineName) : null;
  if (!slice) {
    return null;
  }

  const card = (
    <div className="hw-topo-slice card h-100">
      <div className="d-flex justify-content-between align-items-center p-3 pb-0">
        <h3 className="fs-6 fw-bold mb-0">
          <i className="fas fa-project-diagram me-2" />
          <span>{t('hostTools.topology.sliceHeading')}</span>
        </h3>
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={() => setCollapsed(prev => !prev)}
        >
          <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'}`} />
        </button>
      </div>
      {!collapsed && (
        <div className="p-3">
          <TopologyCanvas
            host={{ server: host.server, graph: slice }}
            lens={null}
            isolatedNet={null}
            onIsolate={noop}
            onDrill={noop}
            onOpenMachine={noop}
            pulse={pulse}
          />
        </div>
      )}
    </div>
  );

  return colClass ? <div className={colClass}>{card}</div> : card;
};

MachineTopologySlice.propTypes = {
  machineName: PropTypes.string.isRequired,
  colClass: PropTypes.string,
};

export default MachineTopologySlice;
