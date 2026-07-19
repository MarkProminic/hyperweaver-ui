import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const TimeSyncPeerTable = ({ peers, loading }) => {
  const { t } = useTranslation();

  const getPeerStatusIndicator = indicator => {
    switch (indicator) {
      case '*':
        return {
          icon: '⭐',
          description: t('hostTime.timeSyncPeerTable.statusPrimary'),
          color: 'text-success',
        };
      case '+':
        return {
          icon: '✅',
          description: t('hostTime.timeSyncPeerTable.statusBackup'),
          color: 'text-info',
        };
      case '-':
        return {
          icon: '❌',
          description: t('hostTime.timeSyncPeerTable.statusRejected'),
          color: 'text-danger',
        };
      case 'x':
        return {
          icon: '⚠️',
          description: t('hostTime.timeSyncPeerTable.statusFalseTicker'),
          color: 'text-warning',
        };
      case '.':
        return {
          icon: '⚪',
          description: t('hostTime.timeSyncPeerTable.statusExcess'),
          color: 'text-muted',
        };
      case ' ':
        return {
          icon: '⚠️',
          description: t('hostTime.timeSyncPeerTable.statusCandidate'),
          color: 'text-warning',
        };
      default:
        return {
          icon: '❓',
          description: t('hostTime.timeSyncPeerTable.statusUnknown'),
          color: 'text-muted',
        };
    }
  };

  const formatOffset = offset => {
    if (typeof offset !== 'number') {
      return t('hostTime.timeSyncPeerTable.notAvailable');
    }
    return `${offset >= 0 ? '+' : ''}${offset.toFixed(1)}ms`;
  };

  const formatDelay = delay => {
    if (typeof delay !== 'number') {
      return t('hostTime.timeSyncPeerTable.notAvailable');
    }
    return `${delay.toFixed(1)}ms`;
  };

  const formatJitter = jitter => {
    if (typeof jitter !== 'number') {
      return t('hostTime.timeSyncPeerTable.notAvailable');
    }
    return `${jitter.toFixed(1)}ms`;
  };

  const getHealthColor = (value, thresholds) => {
    if (typeof value !== 'number') {
      return '';
    }
    if (value <= thresholds.good) {
      return 'text-success';
    }
    if (value <= thresholds.warning) {
      return 'text-warning';
    }
    return 'text-danger';
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="fs-6 fw-bold">
          {t('hostTime.timeSyncPeerTable.heading', { count: peers.length })}
          {loading && (
            <span className="ms-2">
              <i className="fas fa-spinner fa-spin" />
            </span>
          )}
        </h3>

        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>{t('hostTime.timeSyncPeerTable.columnStatus')}</th>
                <th>{t('hostTime.timeSyncPeerTable.columnServer')}</th>
                <th>{t('hostTime.timeSyncPeerTable.columnStratum')}</th>
                <th>{t('hostTime.timeSyncPeerTable.columnDelay')}</th>
                <th>{t('hostTime.timeSyncPeerTable.columnOffset')}</th>
                <th>{t('hostTime.timeSyncPeerTable.columnJitter')}</th>
                <th>{t('hostTime.timeSyncPeerTable.columnReach')}</th>
              </tr>
            </thead>
            <tbody>
              {peers.map(peer => {
                const statusDetails = getPeerStatusIndicator(peer.indicator);
                return (
                  <tr key={peer.remote || peer.name || Math.random()}>
                    <td>
                      <span className={statusDetails.color} title={statusDetails.description}>
                        {statusDetails.icon}
                      </span>
                      <span className="small ms-1">
                        {peer.status || t('hostTime.timeSyncPeerTable.statusUnknownLabel')}
                      </span>
                    </td>
                    <td className="font-monospace">
                      {peer.remote || peer.name || t('hostTime.timeSyncPeerTable.unknownServer')}
                    </td>
                    <td>{peer.stratum || t('hostTime.timeSyncPeerTable.notAvailable')}</td>
                    <td
                      className={getHealthColor(peer.delay, {
                        good: 50,
                        warning: 200,
                      })}
                    >
                      {formatDelay(peer.delay)}
                    </td>
                    <td
                      className={getHealthColor(Math.abs(peer.offset), {
                        good: 10,
                        warning: 100,
                      })}
                    >
                      {formatOffset(peer.offset)}
                    </td>
                    <td
                      className={getHealthColor(peer.jitter, {
                        good: 10,
                        warning: 50,
                      })}
                    >
                      {formatJitter(peer.jitter)}
                    </td>
                    <td
                      className={getHealthColor(100 - (peer.reachability_percent || 0), {
                        good: 10,
                        warning: 50,
                      })}
                    >
                      {peer.reachability_percent !== undefined
                        ? `${peer.reachability_percent}%`
                        : t('hostTime.timeSyncPeerTable.notAvailable')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="small mt-3">
          <p>
            <strong>{t('hostTime.timeSyncPeerTable.statusIndicatorsLabel')}</strong>
          </p>
          <p>{t('hostTime.timeSyncPeerTable.statusIndicatorsDesc')}</p>
          <p>
            <strong>{t('hostTime.timeSyncPeerTable.healthColorsLabel')}</strong>{' '}
            <span className="text-success">{t('hostTime.timeSyncPeerTable.colorGood')}</span> •{' '}
            <span className="text-warning">{t('hostTime.timeSyncPeerTable.colorWarning')}</span> •{' '}
            <span className="text-danger">{t('hostTime.timeSyncPeerTable.colorProblem')}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

TimeSyncPeerTable.propTypes = {
  peers: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
};

export default TimeSyncPeerTable;
