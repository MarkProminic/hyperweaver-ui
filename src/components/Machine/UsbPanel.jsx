import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

import {
  getHostUsbDevices,
  getUsbFilters,
  attachUsbDevice,
  detachUsbDevice,
  addUsbFilter,
  deleteUsbFilter,
} from '../../api/machineAPI';

const deviceId = device =>
  device.uuid ?? device.address ?? device.id ?? device.device ?? String(device);

const deviceLabel = device =>
  [
    device.product || device.name || device.description,
    device.manufacturer,
    device.vendor_id && device.product_id && `${device.vendor_id}:${device.product_id}`,
    device.serial_number && `SN ${device.serial_number}`,
  ]
    .filter(Boolean)
    .join(' · ') || deviceId(device);

const emptyFilter = () => ({
  name: '',
  vendor_id: '',
  product_id: '',
  manufacturer: '',
  product: '',
  serial_number: '',
});

const FILTER_FIELDS = [
  ['name', 'Name'],
  ['vendor_id', 'Vendor ID'],
  ['product_id', 'Product ID'],
  ['manufacturer', 'Manufacturer'],
  ['product', 'Product'],
  ['serial_number', 'Serial'],
];

const UsbPanel = ({ currentServer, machineName, isRunning, disabled }) => {
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState([]);
  const [filterForm, setFilterForm] = useState(emptyFilter);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState('info');

  const report = (text, variant) => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const load = useCallback(async () => {
    if (!currentServer || !machineName) {
      return;
    }
    setLoading(true);
    const [deviceResult, filterResult] = await Promise.all([
      getHostUsbDevices(currentServer.hostname, currentServer.port, currentServer.protocol),
      getUsbFilters(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        machineName
      ),
    ]);
    setDevices(
      deviceResult.success
        ? deviceResult.data?.devices || (Array.isArray(deviceResult.data) ? deviceResult.data : [])
        : []
    );
    setFilters(
      filterResult.success
        ? filterResult.data?.filters || (Array.isArray(filterResult.data) ? filterResult.data : [])
        : []
    );
    if (!deviceResult.success) {
      report(`Host USB list failed: ${deviceResult.message}`, 'danger');
    }
    setLoading(false);
  }, [currentServer, machineName]);

  useEffect(() => {
    setMsg('');
    setFilterForm(emptyFilter());
    load();
  }, [load]);

  const handleLive = async (kind, device) => {
    setLoading(true);
    const call = kind === 'attach' ? attachUsbDevice : detachUsbDevice;
    const result = await call(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      deviceId(device)
    );
    setLoading(false);
    report(
      result.success
        ? result.data?.message || `USB ${kind} done.`
        : `USB ${kind} failed: ${result.message}`,
      result.success ? 'success' : 'danger'
    );
  };

  const handleAddFilter = async () => {
    const body = Object.fromEntries(
      Object.entries(filterForm)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value !== '')
    );
    setLoading(true);
    const result = await addUsbFilter(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      body
    );
    setLoading(false);
    if (result.success) {
      setFilterForm(emptyFilter());
      report(result.data?.message || 'Filter added.', 'success');
      load();
    } else {
      report(`Add filter failed: ${result.message}`, 'danger');
    }
  };

  const handleDeleteFilter = async index => {
    setLoading(true);
    const result = await deleteUsbFilter(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      machineName,
      index
    );
    setLoading(false);
    if (result.success) {
      report(result.data?.message || 'Filter removed.', 'success');
      load();
    } else {
      report(`Delete filter failed: ${result.message}`, 'danger');
    }
  };

  const prefillFromDevice = device =>
    setFilterForm({
      name: device.product || device.name || '',
      vendor_id: device.vendor_id || '',
      product_id: device.product_id || '',
      manufacturer: device.manufacturer || '',
      product: device.product || '',
      serial_number: device.serial_number || '',
    });

  return (
    <div>
      {msg && <div className={`alert alert-${msgVariant} py-2`}>{msg}</div>}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="fw-bold mb-0">Host USB Devices</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={load}
          disabled={loading}
        >
          <i className="fas fa-sync-alt me-2" />
          Refresh
        </button>
      </div>
      {!isRunning && (
        <p className="form-text text-warning mt-0">
          Live attach/detach needs {machineName} running — persistent filters below work anytime.
        </p>
      )}
      {devices.length === 0 && <p className="text-muted small">No host USB devices reported.</p>}
      <div className="d-flex flex-column gap-1 mb-3">
        {devices.map(device => (
          <div
            className="d-flex justify-content-between align-items-center border rounded px-2 py-1"
            key={deviceId(device)}
          >
            <span className="small">{deviceLabel(device)}</span>
            <span className="d-flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleLive('attach', device)}
                disabled={disabled || loading || !isRunning}
                title="Attach to the running machine"
              >
                <i className="fas fa-plug" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleLive('detach', device)}
                disabled={disabled || loading || !isRunning}
                title="Detach from the running machine"
              >
                <i className="fas fa-plug-circle-xmark" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => prefillFromDevice(device)}
                disabled={disabled || loading}
                title="Prefill a capture filter from this device"
              >
                <i className="fas fa-filter" />
              </button>
            </span>
          </div>
        ))}
      </div>

      <h6 className="fw-bold">Capture Filters</h6>
      <p className="form-text text-muted mt-0">
        Persistent — matching devices auto-capture whenever the machine starts. Empty fields match
        anything.
      </p>
      {filters.length === 0 && <p className="text-muted small">No filters.</p>}
      <div className="d-flex flex-column gap-1 mb-2">
        {filters.map((filter, index) => (
          <div
            className="d-flex justify-content-between align-items-center border rounded px-2 py-1"
            key={FILTER_FIELDS.map(([key]) => `${filter[key] ?? ''}`).join('|') || index}
          >
            <span className="small">
              {FILTER_FIELDS.filter(([key]) => filter[key]).map(([key, label]) => (
                <span className="me-2" key={key}>
                  {label}: <code>{String(filter[key])}</code>
                </span>
              ))}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              aria-label="Delete filter"
              onClick={() => handleDeleteFilter(filter.index ?? index)}
              disabled={disabled || loading}
            >
              <i className="fas fa-trash" />
            </button>
          </div>
        ))}
      </div>

      <div className="row g-2 align-items-end">
        {FILTER_FIELDS.map(([key, label]) => (
          <div className="col-6 col-md-2" key={key}>
            <label className="form-label small mb-1" htmlFor={`usb-filter-${key}`}>
              {label}
            </label>
            <input
              id={`usb-filter-${key}`}
              className="form-control form-control-sm"
              type="text"
              value={filterForm[key]}
              onChange={e => setFilterForm(prev => ({ ...prev, [key]: e.target.value }))}
              disabled={disabled || loading}
            />
          </div>
        ))}
        <div className="col-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={handleAddFilter}
            disabled={disabled || loading}
          >
            <i className="fas fa-plus me-2" />
            Add Filter
          </button>
        </div>
      </div>
    </div>
  );
};

UsbPanel.propTypes = {
  currentServer: PropTypes.object,
  machineName: PropTypes.string,
  isRunning: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default UsbPanel;
