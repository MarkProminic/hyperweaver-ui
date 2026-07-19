import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getNetworkUsage, getZoneUsage } from '../../api/monitoringAPI';
import Chart from '../Chart';

/**
 * Per-machine resource graphs — CPU / memory / filesystem I/O from the
 * per-zone series (GET /monitoring/zones/usage?zone=…&since=…) plus the
 * machine's own vnics from the per-LINK network series. The disk graph is
 * FILESYSTEM I/O: bhyve zvol block traffic is not per-zone-attributable
 * on this platform.
 */

const WINDOW_MINUTES = 15;
const POLL_SECONDS = 30;

const sinceIso = () => new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

const chartOptionsFor = (title, unit, series) => ({
  chart: { type: 'spline', height: 220, backgroundColor: 'transparent', marginRight: 10 },
  time: { useUTC: false },
  title: { text: title, style: { fontSize: '13px' } },
  xAxis: { type: 'datetime', tickPixelInterval: 150 },
  yAxis: { title: { text: unit }, min: 0 },
  legend: { enabled: true, itemStyle: { fontSize: '10px' } },
  plotOptions: { spline: { marker: { enabled: false }, lineWidth: 2 } },
  series,
  credits: { enabled: false },
  tooltip: { shared: true, valueSuffix: ` ${unit}` },
});

const appendPoint = (list, ts, value, cutoff) =>
  [...list, [ts, value]].filter(([time]) => time >= cutoff);

const MachineNetworkCharts = ({ currentServer, machineName, links }) => {
  const { t } = useTranslation();
  // {link: {rx: [[ts, mbps]], tx: [[ts, mbps]]}}
  const [data, setData] = useState({});
  // {cpu: [[ts, pct]], rss: [[ts, GB]], swap: [[ts, GB]], read: [[ts, MBps]], write: [[ts, MBps]]}
  const [zoneData, setZoneData] = useState(null);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  // The newest scan_timestamp per series — the next poll's `since`.
  const lastSeen = useRef({});

  const loadZoneUsage = useCallback(async () => {
    const result = await getZoneUsage(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      { zone: machineName, since: lastSeen.current.__zone__ || sinceIso(), limit: 200 }
    );
    if (!result.success) {
      return t('machine.machineNetworkCharts.zoneUsageFailed', { message: result.message });
    }
    const rows = Array.isArray(result.data?.usage) ? result.data.usage : [];
    setZoneData(prev => {
      const cutoff = Date.now() - WINDOW_MINUTES * 60 * 1000;
      let next = prev || { cpu: [], rss: [], swap: [], read: [], write: [] };
      rows
        .slice()
        .sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp))
        .forEach(row => {
          const ts = new Date(row.scan_timestamp).getTime();
          if (next.cpu.length > 0 && ts <= next.cpu[next.cpu.length - 1][0]) {
            return;
          }
          next = {
            cpu: appendPoint(next.cpu, ts, parseFloat(row.cpu_pct) || 0, cutoff),
            rss: appendPoint(next.rss, ts, (Number(row.rss_bytes) || 0) / 1024 ** 3, cutoff),
            swap: appendPoint(next.swap, ts, (Number(row.swap_bytes) || 0) / 1024 ** 3, cutoff),
            read: appendPoint(next.read, ts, (Number(row.vfs_read_bps) || 0) / 1024 ** 2, cutoff),
            write: appendPoint(
              next.write,
              ts,
              (Number(row.vfs_write_bps) || 0) / 1024 ** 2,
              cutoff
            ),
          };
          lastSeen.current.__zone__ = row.scan_timestamp;
        });
      return next;
    });
    return '';
  }, [currentServer, machineName, t]);

  // `links` is a fresh array each parent render — a joined key drives the
  // effect, a ref feeds the callback, so the poll only resets when the
  // machine or its link set actually changes (never every render).
  const linksKey = links.join(',');
  const linksRef = useRef(links);
  linksRef.current = links;

  const loadNetwork = useCallback(async () => {
    const results = await Promise.all(
      linksRef.current.map(link =>
        getNetworkUsage(currentServer.hostname, currentServer.port, currentServer.protocol, {
          link,
          since: lastSeen.current[link] || sinceIso(),
          limit: 200,
        }).then(result => ({ link, result }))
      )
    );
    const failed = results.find(({ result }) => !result.success);
    setData(prev => {
      const next = { ...prev };
      const cutoff = Date.now() - WINDOW_MINUTES * 60 * 1000;
      results.forEach(({ link, result }) => {
        const rows = result.success && Array.isArray(result.data?.usage) ? result.data.usage : [];
        const entry = next[link]
          ? { rx: [...next[link].rx], tx: [...next[link].tx] }
          : { rx: [], tx: [] };
        rows
          .slice()
          .sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp))
          .forEach(row => {
            const ts = new Date(row.scan_timestamp).getTime();
            if (entry.rx.length > 0 && ts <= entry.rx[entry.rx.length - 1][0]) {
              return;
            }
            entry.rx.push([ts, parseFloat(row.rx_mbps) || 0]);
            entry.tx.push([ts, parseFloat(row.tx_mbps) || 0]);
            lastSeen.current[link] = row.scan_timestamp;
          });
        entry.rx = entry.rx.filter(([ts]) => ts >= cutoff);
        entry.tx = entry.tx.filter(([ts]) => ts >= cutoff);
        next[link] = entry;
      });
      return next;
    });
    return failed
      ? t('machine.machineNetworkCharts.networkUsageFailed', { message: failed.result.message })
      : '';
  }, [currentServer, t]);

  const load = useCallback(async () => {
    const [zoneError, netError] = await Promise.all([loadZoneUsage(), loadNetwork()]);
    setError(zoneError || netError);
  }, [loadZoneUsage, loadNetwork]);

  useEffect(() => {
    lastSeen.current = {};
    setData({});
    setZoneData(null);
    setError('');
    if (!currentServer || !machineName) {
      return undefined;
    }
    load();
    const interval = setInterval(load, POLL_SECONDS * 1000);
    return () => clearInterval(interval);
    // Machine switch or a changed link set resets the window.
  }, [currentServer, machineName, linksKey, load]);

  const hasZoneSamples = zoneData && zoneData.cpu.length > 0;

  return (
    <div className="card mb-0 pt-0">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="fs-6 fw-bold mb-0">
            <i className="fas fa-chart-area me-2" />
            {t('machine.machineNetworkCharts.resourcesHeading', { minutes: WINDOW_MINUTES })}
          </h4>
          <button
            type="button"
            className="btn btn-sm btn-link"
            onClick={() => setCollapsed(prev => !prev)}
            title={
              collapsed
                ? t('machine.machineNetworkCharts.showCharts')
                : t('machine.machineNetworkCharts.hideCharts')
            }
          >
            <i className={`fas ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
          </button>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {!collapsed && !hasZoneSamples && (
          <p className="text-muted small mb-2">
            <i className="fas fa-spinner fa-pulse me-2" />
            {t('machine.machineNetworkCharts.waitingForZoneSamples')}
          </p>
        )}
        {!collapsed && hasZoneSamples && (
          <>
            <Chart
              options={chartOptionsFor(t('machine.machineNetworkCharts.cpuTitle'), '%', [
                {
                  name: t('machine.machineNetworkCharts.cpuSeries'),
                  data: zoneData.cpu,
                  color: '#4caf50',
                },
              ])}
            />
            <Chart
              options={chartOptionsFor(t('machine.machineNetworkCharts.memoryTitle'), 'GB', [
                {
                  name: t('machine.machineNetworkCharts.rssSeries'),
                  data: zoneData.rss,
                  color: '#64b5f6',
                },
                {
                  name: t('machine.machineNetworkCharts.swapSeries'),
                  data: zoneData.swap,
                  color: '#ff9800',
                },
              ])}
            />
            <Chart
              options={chartOptionsFor(
                t('machine.machineNetworkCharts.filesystemIoTitle'),
                'MB/s',
                [
                  {
                    name: t('machine.machineNetworkCharts.readSeries'),
                    data: zoneData.read,
                    color: '#64b5f6',
                  },
                  {
                    name: t('machine.machineNetworkCharts.writeSeries'),
                    data: zoneData.write,
                    color: '#ff9800',
                  },
                ]
              )}
            />
          </>
        )}
        {!collapsed &&
          links.map(link => {
            const entry = data[link];
            if (!entry || entry.rx.length === 0) {
              return (
                <p className="text-muted small mb-2" key={link}>
                  <i className="fas fa-spinner fa-pulse me-2" />
                  {t('machine.machineNetworkCharts.waitingForLinkSamplesPrefix')}{' '}
                  <code>{link}</code>
                  {t('machine.machineNetworkCharts.waitingForLinkSamplesSuffix')}
                </p>
              );
            }
            return (
              <Chart
                key={link}
                options={chartOptionsFor(
                  t('machine.machineNetworkCharts.networkTitle', { link }),
                  'Mbps',
                  [
                    {
                      name: t('machine.machineNetworkCharts.rxSeries'),
                      data: entry.rx,
                      color: '#64b5f6',
                    },
                    {
                      name: t('machine.machineNetworkCharts.txSeries'),
                      data: entry.tx,
                      color: '#ff9800',
                    },
                  ]
                )}
              />
            );
          })}
      </div>
    </div>
  );
};

MachineNetworkCharts.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  links: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default MachineNetworkCharts;
