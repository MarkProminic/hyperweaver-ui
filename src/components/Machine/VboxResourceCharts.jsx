import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { makeAgentRequest } from '../../api/serverUtils';

import { ChartCard, chartOptions, latest, push } from './MachineResourceCharts';

/**
 * Per-machine resource cards for VirtualBox machines — GET
 * /monitoring/machines/usage (VirtualBox-native metrics, REALTIME: one live
 * sample per RUNNING machine, no stored history). The client accumulates the
 * samples into a rolling window so the cards read like the bhyve ones.
 * Nullability is the wire's signal: RAM null + guest_additions false means
 * the guest lacks Guest Additions; rates are null on the first observation
 * and across a VM restart.
 */

const POLL_SECONDS = 30;
const MB = 1024 ** 2;
const GB = 1024 ** 3;

const emptySeries = () => ({
  cpuGuest: [],
  cpuVmm: [],
  ram: [],
  netRx: [],
  netTx: [],
  diskRead: [],
  diskWrite: [],
});

const num = value => (value === null || value === undefined ? null : Number(value));

const VboxResourceCharts = ({ currentServer, machineName }) => {
  const { t } = useTranslation();
  const [series, setSeries] = useState(emptySeries);
  const [last, setLast] = useState(null);
  const [error, setError] = useState('');
  const lastTsRef = useRef(0);

  const load = useCallback(async () => {
    const result = await makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'monitoring/machines/usage',
      'GET',
      null,
      { machine_name: machineName, limit: 1 }
    );
    if (!result.success) {
      setError(t('machine.vboxResourceCharts.metricsFailed', { message: result.message }));
      return;
    }
    setError('');
    const row = Array.isArray(result.data?.usage) ? result.data.usage[0] : null;
    setLast(row);
    if (!row) {
      return;
    }
    const ts = new Date(row.scan_timestamp).getTime();
    if (!ts || ts <= lastTsRef.current) {
      return;
    }
    lastTsRef.current = ts;
    const add = (list, value) => (value === null ? list : push(list, ts, value));
    setSeries(prev => ({
      cpuGuest: add(prev.cpuGuest, num(row.cpu_guest_pct)),
      cpuVmm: add(prev.cpuVmm, num(row.cpu_vmm_pct)),
      ram: add(prev.ram, num(row.rss_bytes) === null ? null : Number(row.rss_bytes) / GB),
      netRx: add(prev.netRx, num(row.net_rx_bps) === null ? null : Number(row.net_rx_bps) / MB),
      netTx: add(prev.netTx, num(row.net_tx_bps) === null ? null : Number(row.net_tx_bps) / MB),
      diskRead: add(
        prev.diskRead,
        num(row.disk_read_bps) === null ? null : Number(row.disk_read_bps) / MB
      ),
      diskWrite: add(
        prev.diskWrite,
        num(row.disk_write_bps) === null ? null : Number(row.disk_write_bps) / MB
      ),
    }));
  }, [currentServer, machineName, t]);

  useEffect(() => {
    lastTsRef.current = 0;
    setSeries(emptySeries());
    setLast(null);
    setError('');
    if (!currentServer || !machineName) {
      return undefined;
    }
    load();
    const interval = setInterval(load, POLL_SECONDS * 1000);
    return () => clearInterval(interval);
  }, [currentServer, machineName, load]);

  const noAdditions = last ? last.guest_additions === false : false;
  const hasCpu = series.cpuGuest.length > 0 || series.cpuVmm.length > 0;

  const cpuBadges =
    last && num(last.cpu_pct) !== null ? (
      <span
        className="badge text-bg-light border"
        title={t('machine.vboxResourceCharts.cpuTooltip')}
      >
        {t('machine.vboxResourceCharts.pctOfHost', { value: Number(last.cpu_pct).toFixed(1) })}
      </span>
    ) : null;

  const memoryBadges =
    last && num(last.ram_total_bytes) !== null ? (
      <span
        className="badge text-bg-light border"
        title={t('machine.vboxResourceCharts.ramTotalTooltip')}
      >
        {t('machine.vboxResourceCharts.ofTotalGb', {
          value: (Number(last.ram_total_bytes) / GB).toFixed(1),
        })}
      </span>
    ) : null;

  const netBadges = (
    <span
      className="badge text-bg-light border"
      title={t('machine.vboxResourceCharts.rxTxTooltip')}
    >
      {latest(series.netRx).toFixed(2)} / {latest(series.netTx).toFixed(2)} MB/s
    </span>
  );

  return (
    <>
      {error && (
        <div className="col-12">
          <div className="alert alert-danger py-2 mb-0">{error}</div>
        </div>
      )}

      {!last && !error && (
        <div className="col-12">
          <p className="text-muted small mb-0">
            <i className="fas fa-spinner fa-pulse me-2" />
            {t('machine.vboxResourceCharts.waitingForSample')}
          </p>
        </div>
      )}

      {hasCpu && (
        <ChartCard
          icon="fa-microchip"
          title={t('machine.vboxResourceCharts.cpuTitle')}
          badges={cpuBadges}
          options={chartOptions('%', [
            {
              name: t('machine.vboxResourceCharts.guestSeries'),
              data: series.cpuGuest,
              color: '#4caf50',
            },
            {
              name: t('machine.vboxResourceCharts.vmmSeries'),
              data: series.cpuVmm,
              color: '#9575cd',
            },
          ])}
        />
      )}

      {noAdditions && (
        <div className="col-12 col-xl-6">
          <div className="card h-100">
            <div className="card-body">
              <h4 className="fs-6 fw-bold mb-2">
                <i className="fas fa-memory me-2 text-muted" />
                {t('machine.vboxResourceCharts.memoryTitle')}
              </h4>
              <div className="alert alert-info mb-0">
                <p className="mb-0">{t('machine.vboxResourceCharts.additionsRequiredNote')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!noAdditions && series.ram.length > 0 && (
        <ChartCard
          icon="fa-memory"
          title={t('machine.vboxResourceCharts.memoryTitle')}
          badges={memoryBadges}
          options={chartOptions('GB', [
            {
              name: t('machine.vboxResourceCharts.usedSeries'),
              data: series.ram,
              color: '#64b5f6',
            },
          ])}
        />
      )}

      {(series.netRx.length > 0 || series.netTx.length > 0) && (
        <ChartCard
          icon="fa-ethernet"
          title={t('machine.vboxResourceCharts.networkTitle')}
          badges={netBadges}
          options={chartOptions('MB/s', [
            {
              name: t('machine.vboxResourceCharts.rxSeries'),
              data: series.netRx,
              color: '#64b5f6',
            },
            {
              name: t('machine.vboxResourceCharts.txSeries'),
              data: series.netTx,
              color: '#ff9800',
            },
          ])}
        />
      )}

      {(series.diskRead.length > 0 || series.diskWrite.length > 0) && (
        <ChartCard
          icon="fa-hdd"
          title={t('machine.vboxResourceCharts.diskTitle')}
          options={chartOptions('MB/s', [
            {
              name: t('machine.vboxResourceCharts.readSeries'),
              data: series.diskRead,
              color: '#64b5f6',
            },
            {
              name: t('machine.vboxResourceCharts.writeSeries'),
              data: series.diskWrite,
              color: '#ff9800',
            },
          ])}
        />
      )}
    </>
  );
};

VboxResourceCharts.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
};

export default VboxResourceCharts;
