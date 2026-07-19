import PropTypes from 'prop-types';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { getNetworkUsage, getZoneDiskIo, getZoneUsage } from '../../api/monitoringAPI';
import Chart from '../Chart';

/**
 * Per-machine resource cards. CPU + memory ride /monitoring/zones/usage; disk
 * I/O rides /monitoring/zones/diskio — PER ZVOL, because a machine's volumes
 * can live on different arrays, so the unit is the DEVICE and the numbers are
 * never summed into one. Network rides the per-link series. Each chart is its
 * own grid card, so they flow with the rest of the Overview instead of
 * stacking in a column.
 */

const WINDOW_MINUTES = 15;
const POLL_SECONDS = 30;
const MB = 1024 ** 2;
const GB = 1024 ** 3;
const COL = 'col-12 col-xl-6';

const sinceIso = () => new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
const cutoffMs = () => Date.now() - WINDOW_MINUTES * 60 * 1000;

export const chartOptions = (unit, series) => ({
  chart: { type: 'spline', height: 190, backgroundColor: 'transparent', marginRight: 10 },
  time: { useUTC: false },
  title: { text: undefined },
  xAxis: { type: 'datetime', tickPixelInterval: 130 },
  yAxis: { title: { text: unit }, min: 0 },
  legend: { enabled: true, itemStyle: { fontSize: '10px' } },
  plotOptions: { spline: { marker: { enabled: false }, lineWidth: 2 } },
  series,
  credits: { enabled: false },
  tooltip: { shared: true, valueSuffix: ` ${unit}` },
});

/** Newest-first rows → oldest-first, dropping anything already plotted. */
const freshRows = (rows, lastMs) =>
  rows
    .slice()
    .sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp))
    .filter(row => !lastMs || new Date(row.scan_timestamp).getTime() > lastMs);

export const push = (list, ts, value) =>
  [...list, [ts, value]].filter(([time]) => time >= cutoffMs());

export const latest = list => (list.length > 0 ? list[list.length - 1][1] : 0);

export const ChartCard = ({ icon, title, subtitle, badges = null, options }) => (
  <div className={COL}>
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
          <h4 className="fs-6 fw-bold mb-0">
            <i className={`fas ${icon} me-2 text-muted`} />
            {title}
          </h4>
          {subtitle && (
            <code className="small text-muted text-truncate" title={subtitle}>
              {subtitle}
            </code>
          )}
          {badges && <span className="ms-auto d-flex gap-1">{badges}</span>}
        </div>
        <Chart options={options} />
      </div>
    </div>
  </div>
);

ChartCard.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  badges: PropTypes.node,
  options: PropTypes.object.isRequired,
};

/** A zvol's array + its latest IOPS — the numbers a throughput line hides. */
const DeviceBadges = ({ entry }) => (
  <>
    <span className="badge text-bg-secondary" title="The array this volume lives on">
      {entry.pool}
    </span>
    <span className="badge text-bg-light border" title="Latest read IOPS">
      {Math.round(latest(entry.readIops))} r/s
    </span>
    <span className="badge text-bg-light border" title="Latest write IOPS">
      {Math.round(latest(entry.writeIops))} w/s
    </span>
  </>
);

DeviceBadges.propTypes = {
  entry: PropTypes.object.isRequired,
};

const MachineResourceCharts = ({ currentServer, machineName, links }) => {
  const [zoneData, setZoneData] = useState(null);
  // {dataset: {pool, device, read, write, readIops, writeIops}}
  const [diskData, setDiskData] = useState({});
  // {link: {rx, tx}}
  const [netData, setNetData] = useState({});
  const [error, setError] = useState('');
  // Newest plotted timestamp per series — the next poll's `since`.
  const lastSeen = useRef({});

  // `links` is a fresh array each parent render — a joined key drives the
  // effect and a ref feeds the callback, so the poll never resets per render.
  const linksKey = links.join(',');
  const linksRef = useRef(links);
  linksRef.current = links;

  const loadUsage = useCallback(async () => {
    const result = await getZoneUsage(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      { zone: machineName, since: lastSeen.current.usage || sinceIso(), limit: 200 }
    );
    if (!result.success) {
      return `CPU/memory failed (GET monitoring/zones/usage): ${result.message}`;
    }
    const rows = Array.isArray(result.data?.usage) ? result.data.usage : [];
    setZoneData(prev => {
      let next = prev || { cpu: [], rss: [], swap: [] };
      freshRows(rows, lastSeen.current.usageMs).forEach(row => {
        const ts = new Date(row.scan_timestamp).getTime();
        next = {
          cpu: push(next.cpu, ts, parseFloat(row.cpu_pct) || 0),
          rss: push(next.rss, ts, (Number(row.rss_bytes) || 0) / GB),
          swap: push(next.swap, ts, (Number(row.swap_bytes) || 0) / GB),
        };
        lastSeen.current.usage = row.scan_timestamp;
        lastSeen.current.usageMs = ts;
      });
      return next;
    });
    return '';
  }, [currentServer, machineName]);

  const loadDiskIo = useCallback(async () => {
    const result = await getZoneDiskIo(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      { zone: machineName, since: lastSeen.current.diskio || sinceIso(), limit: 500 }
    );
    if (!result.success) {
      return `Disk I/O failed (GET monitoring/zones/diskio): ${result.message}`;
    }
    const rows = Array.isArray(result.data?.diskio) ? result.data.diskio : [];
    setDiskData(prev => {
      const next = { ...prev };
      freshRows(rows, lastSeen.current.diskioMs).forEach(row => {
        const ts = new Date(row.scan_timestamp).getTime();
        const entry = next[row.dataset] || {
          pool: row.pool,
          device: row.device,
          dataset: row.dataset,
          read: [],
          write: [],
          readIops: [],
          writeIops: [],
        };
        next[row.dataset] = {
          ...entry,
          read: push(entry.read, ts, (Number(row.read_bps) || 0) / MB),
          write: push(entry.write, ts, (Number(row.write_bps) || 0) / MB),
          readIops: push(entry.readIops, ts, Number(row.read_iops) || 0),
          writeIops: push(entry.writeIops, ts, Number(row.write_iops) || 0),
        };
        lastSeen.current.diskio = row.scan_timestamp;
        lastSeen.current.diskioMs = ts;
      });
      return next;
    });
    return '';
  }, [currentServer, machineName]);

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
    setNetData(prev => {
      const next = { ...prev };
      results.forEach(({ link, result }) => {
        const rows = result.success && Array.isArray(result.data?.usage) ? result.data.usage : [];
        const entry = next[link] || { rx: [], tx: [] };
        let { rx, tx } = entry;
        freshRows(rows, lastSeen.current[`${link}Ms`]).forEach(row => {
          const ts = new Date(row.scan_timestamp).getTime();
          rx = push(rx, ts, parseFloat(row.rx_mbps) || 0);
          tx = push(tx, ts, parseFloat(row.tx_mbps) || 0);
          lastSeen.current[link] = row.scan_timestamp;
          lastSeen.current[`${link}Ms`] = ts;
        });
        next[link] = { rx, tx };
      });
      return next;
    });
    return failed ? `Network failed (GET monitoring/network/usage): ${failed.result.message}` : '';
  }, [currentServer]);

  const load = useCallback(async () => {
    const errors = await Promise.all([loadUsage(), loadDiskIo(), loadNetwork()]);
    setError(errors.filter(Boolean)[0] || '');
  }, [loadUsage, loadDiskIo, loadNetwork]);

  useEffect(() => {
    lastSeen.current = {};
    setZoneData(null);
    setDiskData({});
    setNetData({});
    setError('');
    if (!currentServer || !machineName) {
      return undefined;
    }
    load();
    const interval = setInterval(load, POLL_SECONDS * 1000);
    return () => clearInterval(interval);
  }, [currentServer, machineName, linksKey, load]);

  const hasUsage = zoneData && zoneData.cpu.length > 0;
  // Devices sort by their ARRAY — a machine's volumes can span pools, and
  // each device keeps its own card (never summed).
  const devices = Object.values(diskData).sort(
    (a, b) => a.pool.localeCompare(b.pool) || a.device.localeCompare(b.device)
  );

  // Hoisted: multiline JSX inside a prop trips jsx-wrap-multilines, and the
  // parens it wants are the ones prettier strips (circular fix).
  const cpuBadges = hasUsage ? (
    <span className="badge text-bg-light border" title="Latest">
      {latest(zoneData.cpu).toFixed(1)}% of host
    </span>
  ) : null;

  const memoryBadges = hasUsage ? (
    <span className="badge text-bg-light border" title="Latest resident">
      {latest(zoneData.rss).toFixed(2)} GB
    </span>
  ) : null;

  return (
    <>
      {error && (
        <div className="col-12">
          <div className="alert alert-danger py-2 mb-0">{error}</div>
        </div>
      )}

      {!hasUsage && !error && (
        <div className="col-12">
          <p className="text-muted small mb-0">
            <i className="fas fa-spinner fa-pulse me-2" />
            Waiting for the first resource samples…
          </p>
        </div>
      )}

      {hasUsage && (
        <ChartCard
          icon="fa-microchip"
          title="CPU"
          badges={cpuBadges}
          options={chartOptions('%', [{ name: 'CPU', data: zoneData.cpu, color: '#4caf50' }])}
        />
      )}

      {hasUsage && (
        <ChartCard
          icon="fa-memory"
          title="Memory"
          badges={memoryBadges}
          options={chartOptions('GB', [
            { name: 'Resident', data: zoneData.rss, color: '#64b5f6' },
            { name: 'Swap', data: zoneData.swap, color: '#ff9800' },
          ])}
        />
      )}

      {devices.map(entry => (
        <ChartCard
          key={entry.dataset}
          icon="fa-hdd"
          title={`Disk — ${entry.device}`}
          subtitle={entry.dataset}
          badges={<DeviceBadges entry={entry} />}
          options={chartOptions('MB/s', [
            { name: 'Read', data: entry.read, color: '#64b5f6' },
            { name: 'Write', data: entry.write, color: '#ff9800' },
          ])}
        />
      ))}

      {links.map(link => {
        const entry = netData[link];
        if (!entry || entry.rx.length === 0) {
          return null;
        }
        return (
          <Fragment key={link}>
            <ChartCard
              icon="fa-ethernet"
              title={`Network — ${link}`}
              options={chartOptions('Mbps', [
                { name: 'RX', data: entry.rx, color: '#64b5f6' },
                { name: 'TX', data: entry.tx, color: '#ff9800' },
              ])}
            />
          </Fragment>
        );
      })}
    </>
  );
};

MachineResourceCharts.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  links: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default MachineResourceCharts;
