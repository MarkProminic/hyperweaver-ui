import PropTypes from 'prop-types';
import Dropdown from 'react-bootstrap/Dropdown';

import { exportDeviceData } from './DeviceUtils';

const DeviceFilters = ({
  filters,
  setFilters,
  deviceCategories,
  sectionsCollapsed,
  toggleSection,
  devices,
  selectedServer,
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <h4 className="fs-5 fw-bold mb-0">
            <i className="fas fa-filter me-2" />
            Device Filters & Search
          </h4>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-info"
              onClick={() =>
                setFilters({
                  category: '',
                  pptStatus: '',
                  driverStatus: '',
                  searchText: '',
                })
              }
              title="Clear all filters"
            >
              <i className="fas fa-times me-2" />
              Clear
            </button>
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                <i className="fas fa-download me-2" />
                Export
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => exportDeviceData(devices, selectedServer, 'csv')}
                >
                  <i className="fas fa-file-csv me-2" />
                  Export as CSV
                </Dropdown.Item>
                <Dropdown.Item
                  as="button"
                  type="button"
                  onClick={() => exportDeviceData(devices, selectedServer, 'json')}
                >
                  <i className="fas fa-file-code me-2" />
                  Export as JSON
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => toggleSection('filters')}
              title={sectionsCollapsed.filters ? 'Expand section' : 'Collapse section'}
            >
              <i
                className={`fas ${sectionsCollapsed.filters ? 'fa-chevron-down' : 'fa-chevron-up'}`}
              />
            </button>
          </div>
        </div>
      </div>
      {!sectionsCollapsed.filters && (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="mb-3">
              <label htmlFor="device-search" className="form-label">
                Search Devices
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search" />
                </span>
                <input
                  id="device-search"
                  className="form-control form-control-sm"
                  type="text"
                  placeholder="Device name, vendor, PCI address..."
                  value={filters.searchText}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      searchText: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="col-lg-3">
            <div className="mb-3">
              <label htmlFor="device-category" className="form-label">
                Category
              </label>
              <select
                id="device-category"
                className="form-select form-select-sm"
                value={filters.category}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              >
                <option value="">All Categories</option>
                {Object.keys(deviceCategories).map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)} (
                    {deviceCategories[category].total})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-lg-3">
            <div className="mb-3">
              <label htmlFor="device-ppt-status" className="form-label">
                PPT Status
              </label>
              <select
                id="device-ppt-status"
                className="form-select form-select-sm"
                value={filters.pptStatus}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    pptStatus: e.target.value,
                  }))
                }
              >
                <option value="">All PPT Status</option>
                <option value="enabled">PPT Capable</option>
                <option value="disabled">Not PPT Capable</option>
                <option value="available">PPT Available</option>
                <option value="assigned">PPT Assigned</option>
              </select>
            </div>
          </div>
          <div className="col-lg-3">
            <div className="mb-3">
              <label htmlFor="device-driver-status" className="form-label">
                Driver Status
              </label>
              <select
                id="device-driver-status"
                className="form-select form-select-sm"
                value={filters.driverStatus}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    driverStatus: e.target.value,
                  }))
                }
              >
                <option value="">All Driver Status</option>
                <option value="attached">Driver Attached</option>
                <option value="detached">No Driver</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

DeviceFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  deviceCategories: PropTypes.object.isRequired,
  sectionsCollapsed: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
  devices: PropTypes.array.isRequired,
  selectedServer: PropTypes.object,
};

export default DeviceFilters;
