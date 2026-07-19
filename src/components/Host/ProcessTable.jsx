import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ProcessTable = ({
  processes,
  loading,
  onViewDetails,
  onKillProcess,
  onSendSignal,
  showDetailedView,
}) => {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState('pid');
  const [sortDirection, setSortDirection] = useState('asc');

  const parseMemorySize = memStr => {
    if (!memStr && memStr !== 0) {
      return 0;
    }

    // Convert to string to ensure we can call .match()
    const memString = String(memStr);
    const match = memString.match(/^(?<value>\d+(?:\.\d+)?)(?<unit>[KMGT])?$/);
    if (!match) {
      // If it's just a number (bytes), convert it
      const numValue = parseFloat(memString);
      if (!isNaN(numValue)) {
        return numValue / 1024 / 1024; // Convert bytes to MB
      }
      return 0;
    }

    const value = parseFloat(match.groups.value);
    const unit = match.groups.unit || '';

    switch (unit) {
      case 'K':
        return value / 1024;
      case 'M':
        return value;
      case 'G':
        return value * 1024;
      case 'T':
        return value * 1024 * 1024;
      default:
        return value / 1024 / 1024; // Assume bytes
    }
  };
  const handleSort = field => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedProcesses = () =>
    [...processes].sort((a, b) => {
      let aVal;
      let bVal;

      switch (sortField) {
        case 'pid':
          aVal = parseInt(a.pid);
          bVal = parseInt(b.pid);
          break;
        case 'cpu_percent':
          aVal = parseFloat(a.cpu_percent) || 0;
          bVal = parseFloat(b.cpu_percent) || 0;
          break;
        case 'rss':
          // Convert memory format like "7434M" to MB
          aVal = parseMemorySize(a.rss) || 0;
          bVal = parseMemorySize(b.rss) || 0;
          break;
        default:
          aVal = (a[sortField] || '').toString().toLowerCase();
          bVal = (b[sortField] || '').toString().toLowerCase();
      }

      if (sortDirection === 'asc') {
        if (aVal < bVal) {
          return -1;
        }
        if (aVal > bVal) {
          return 1;
        }
        return 0;
      }
      if (aVal > bVal) {
        return -1;
      }
      if (aVal < bVal) {
        return 1;
      }
      return 0;
    });

  const formatMemory = memStr => {
    if (!memStr) {
      return 'N/A';
    }
    return memStr;
  };

  const formatCPU = cpuPercent => {
    if (cpuPercent === null || cpuPercent === undefined) {
      return 'N/A';
    }
    return `${parseFloat(cpuPercent).toFixed(1)}%`;
  };

  const getUserIcon = username => {
    if (username === 'root') {
      return <i className="fas fa-user-shield text-danger me-2" />;
    }
    return <i className="fas fa-user text-info me-2" />;
  };

  const getZoneTag = zone => {
    if (zone === 'global') {
      return <span className="badge text-bg-primary">{zone}</span>;
    }
    return <span className="badge text-bg-info">{zone}</span>;
  };

  const getSortIcon = field => {
    if (sortField !== field) {
      return <i className="fas fa-sort" />;
    }
    if (sortDirection === 'asc') {
      return <i className="fas fa-sort-up" />;
    }
    return <i className="fas fa-sort-down" />;
  };

  const truncateCommand = (command, maxLength = 50) => {
    if (!command) {
      return 'N/A';
    }
    if (command.length <= maxLength) {
      return command;
    }
    return `${command.substring(0, maxLength)}...`;
  };

  if (loading && processes.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-spinner fa-spin fa-2x" />
        <p className="mt-2">{t('host.processTable.loadingProcesses')}</p>
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-tasks fa-2x text-muted" />
        <p className="mt-2 text-muted">{t('host.processTable.noProcessesFound')}</p>
      </div>
    );
  }

  const sortedProcesses = getSortedProcesses();

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th className="cursor-pointer" onClick={() => handleSort('pid')}>
              <span className="d-flex align-items-center">
                {t('host.processTable.pid')}
                <span className="ms-1">{getSortIcon('pid')}</span>
              </span>
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('username')}>
              <span className="d-flex align-items-center">
                {t('host.processTable.user')}
                <span className="ms-1">{getSortIcon('username')}</span>
              </span>
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('zone')}>
              <span className="d-flex align-items-center">
                {t('host.processTable.zone')}
                <span className="ms-1">{getSortIcon('zone')}</span>
              </span>
            </th>
            {showDetailedView && (
              <>
                <th className="cursor-pointer" onClick={() => handleSort('cpu_percent')}>
                  <span className="d-flex align-items-center">
                    {t('host.processTable.cpuPercent')}
                    <span className="ms-1">{getSortIcon('cpu_percent')}</span>
                  </span>
                </th>
                <th className="cursor-pointer" onClick={() => handleSort('rss')}>
                  <span className="d-flex align-items-center">
                    {t('host.processTable.memory')}
                    <span className="ms-1">{getSortIcon('rss')}</span>
                  </span>
                </th>
              </>
            )}
            <th className="cursor-pointer" onClick={() => handleSort('command')}>
              <span className="d-flex align-items-center">
                {t('host.processTable.command')}
                <span className="ms-1">{getSortIcon('command')}</span>
              </span>
            </th>
            <th width="200">{t('host.processTable.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedProcesses.map((process, index) => (
            <tr key={process.pid || index}>
              <td>
                <span className="font-monospace fw-bold">{process.pid}</span>
                {process.ppid && (
                  <div className="small text-muted">
                    {t('host.processTable.ppid')}: {process.ppid}
                  </div>
                )}
              </td>
              <td>
                <div className="d-flex align-items-center">
                  {getUserIcon(process.username)}
                  <span>{process.username || 'N/A'}</span>
                </div>
              </td>
              <td>{getZoneTag(process.zone || 'N/A')}</td>
              {showDetailedView && (
                <>
                  <td>
                    <span className="font-monospace">{formatCPU(process.cpu_percent)}</span>
                  </td>
                  <td>
                    <span className="font-monospace">{formatMemory(process.rss)}</span>
                  </td>
                </>
              )}
              <td>
                <span className="font-monospace small" title={process.command}>
                  {truncateCommand(process.command)}
                </span>
              </td>
              <td>
                <div className="d-flex gap-1">
                  {/* View Details Button */}
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    onClick={() => onViewDetails(process)}
                    disabled={loading}
                    title={t('host.processTable.viewProcessDetails')}
                  >
                    <i className="fas fa-info-circle" />
                  </button>

                  {/* Send Signal Button */}
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={() => onSendSignal(process)}
                    disabled={loading}
                    title={t('host.processTable.sendSignal')}
                  >
                    <i className="fas fa-bolt" />
                  </button>

                  {/* Kill Process Button */}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onKillProcess(process)}
                    disabled={loading}
                    title={t('host.processTable.killProcess')}
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ProcessTable.propTypes = {
  processes: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  onKillProcess: PropTypes.func.isRequired,
  onSendSignal: PropTypes.func.isRequired,
  showDetailedView: PropTypes.bool.isRequired,
};

export default ProcessTable;
