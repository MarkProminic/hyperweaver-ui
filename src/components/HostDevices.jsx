import { Helmet } from '@dr.pogodin/react-helmet';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import DeviceDetailsModal from './Host/DeviceDetailsModal';
import DeviceFilters from './Host/DeviceFilters';
import DeviceHeader from './Host/DeviceHeader';
import DeviceInventoryTable from './Host/DeviceInventoryTable';
import DeviceSummary from './Host/DeviceSummary';
import PptDevicesTable from './Host/PptDevicesTable';
import { useHostDevicesData } from './Host/useHostDevicesData';

const HostDevices = () => {
  const { t } = useTranslation();
  const {
    devices,
    deviceCategories,
    pptStatus,
    devicesSummary,
    loading,
    error,
    selectedServer,
    selectedDevice,
    setSelectedDevice,
    filters,
    setFilters,
    sectionsCollapsed,
    toggleSection,
    deviceSort,
    handleDeviceSort,
    getSortedDevices,
    getSortIcon,
    user,
    getServers,
    handleDeviceRefresh,
    applyFilters,
    loadDeviceData,
  } = useHostDevicesData();

  // Use useMemo to prevent getServers() calls on every render
  const serverList = useMemo(() => getServers(), [getServers]);

  if (!user) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('pages.hostDevices.titlePage')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="titlebar card-header active d-flex justify-content-between align-items-center mb-0 p-3">
              <div>
                <strong>{t('pages.hostDevices.accessDenied')}</strong>
              </div>
            </div>
            <div className="px-4">
              <div className="alert alert-danger">
                <p>{t('pages.hostDevices.loginRequired')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (serverList.length === 0) {
    return (
      <div className="hw-page-content-scrollable">
        <Helmet>
          <meta charSet="utf-8" />
          <title>{t('pages.hostDevices.titlePage')}</title>
          <link rel="canonical" href={window.location.origin} />
        </Helmet>
        <div className="container-fluid p-0">
          <div className="card">
            <div className="titlebar card-header active d-flex justify-content-between align-items-center mb-0 p-3">
              <div>
                <strong>{t('pages.hostDevices.heading')}</strong>
              </div>
            </div>
            <div className="px-4">
              <div className="alert alert-info">
                <h2 className="fs-4 fw-bold">{t('pages.hostDevices.noServersHeading')}</h2>
                <p>{t('pages.hostDevices.noServersBody')}</p>
                <div className="mt-4">
                  <a href="/ui/settings/hyperweaver?tab=servers" className="btn btn-primary">
                    <span className="me-1">
                      <i className="fas fa-plus" />
                    </span>
                    <span>{t('pages.hostDevices.addServer')}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredDevices = getSortedDevices(applyFilters(devices));

  return (
    <div className="hw-page-content-scrollable">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t('pages.hostDevices.titlePage')}</title>
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      <div className="container-fluid p-0">
        <div className="card">
          <DeviceHeader
            selectedServer={selectedServer}
            loading={loading}
            loadDeviceData={loadDeviceData}
          />

          <div className="px-4">
            {error && (
              <div className="alert alert-danger mb-4">
                <p>{error}</p>
              </div>
            )}

            <DeviceSummary
              deviceCategories={deviceCategories}
              devicesSummary={devicesSummary}
              pptStatus={pptStatus}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
            />

            <DeviceFilters
              filters={filters}
              setFilters={setFilters}
              deviceCategories={deviceCategories}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
              devices={filteredDevices}
              selectedServer={selectedServer}
            />

            <DeviceInventoryTable
              devices={filteredDevices}
              deviceSort={deviceSort}
              handleDeviceSort={handleDeviceSort}
              getSortIcon={getSortIcon}
              setSelectedDevice={setSelectedDevice}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
              loading={loading}
              handleDeviceRefresh={handleDeviceRefresh}
            />

            <PptDevicesTable
              pptStatus={pptStatus}
              sectionsCollapsed={sectionsCollapsed}
              toggleSection={toggleSection}
              setSelectedDevice={setSelectedDevice}
            />
          </div>
        </div>
      </div>

      <DeviceDetailsModal selectedDevice={selectedDevice} setSelectedDevice={setSelectedDevice} />
    </div>
  );
};

export default HostDevices;
