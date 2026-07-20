import React, { useEffect, useContext, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ResizableBox } from 'react-resizable';
import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { FooterProvider } from '../contexts/FooterContext';
import { useMode } from '../contexts/ModeContext';
import { useServers } from '../contexts/ServerContext';
import { UserSettings } from '../contexts/UserSettingsContext';
import { hasFeature, hasManageSurface, hasNetworkingSurface } from '../utils/capabilities';

import Footer from './Footer';
import Navbar from './Navbar';
import NotAvailableStub from './NotAvailableStub';
import SideMenu from './Sidemenu';

const Dashboard = React.lazy(() => import('./Dashboard'));
const HyperweaverSettings = React.lazy(() => import('./HyperweaverSettings'));
const AgentSettings = React.lazy(() => import('./AgentSettings'));
const Hosts = React.lazy(() => import('./Hosts'));
const Machines = React.lazy(() => import('./Machines'));
const HostManage = React.lazy(() => import('./HostManage'));
const HostNetworking = React.lazy(() => import('./HostNetworking'));
const HostStorage = React.lazy(() => import('./HostStorage'));
const HostDevices = React.lazy(() => import('./HostDevices'));
const ZoneRegister = React.lazy(() => import('./ZoneRegister'));
const Accounts = React.lazy(() => import('./Accounts'));
const Profile = React.lazy(() => import('./Profile'));

const LoadingSpinner = () => {
  const { t } = useTranslation();
  return (
    <div className="d-flex justify-content-center align-items-center h-100 p-5">
      <div className="text-center">
        <div className="fs-4">
          <i className="fas fa-spinner fa-spin" />
        </div>
        <p className="mt-3">{t('chrome.layout.loading')}</p>
      </div>
    </div>
  );
};

const LayoutContent = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isDirect } = useMode();
  const userSettings = useContext(UserSettings);

  const { servers, selectServer, selectMachine, currentServer, currentMachine } = useServers();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated || servers.length === 0) {
      return;
    }

    const sessionKey = `zw_url_params_processed_${window.location.pathname}${window.location.search}`;
    const alreadyProcessed = sessionStorage.getItem(sessionKey);

    if (alreadyProcessed) {
      return;
    }

    const hostParam = searchParams.get('host');
    const machineParam = searchParams.get('machine');

    if (!hostParam && !machineParam) {
      sessionStorage.setItem(sessionKey, 'true');
      return;
    }

    if (hostParam) {
      const matchingServer = servers.find(server => server.hostname === hostParam);
      if (matchingServer && (!currentServer || currentServer.hostname !== hostParam)) {
        selectServer(matchingServer);
      }

      if (machineParam && matchingServer && (!currentMachine || currentMachine !== machineParam)) {
        selectMachine(machineParam);
      }
    }

    sessionStorage.setItem(sessionKey, 'true');
  }, [
    isAuthenticated,
    servers,
    searchParams,
    currentServer,
    selectServer,
    currentMachine,
    selectMachine,
  ]);

  const handleResize = (e, { size }) => {
    void e;
    userSettings.setSidebarWidth(size.width);
    if (size.width <= 38 && !userSettings.sidebarMinimized) {
      userSettings.setSidebarMinimized(true);
    } else if (size.width > 38 && userSettings.sidebarMinimized) {
      userSettings.setSidebarMinimized(false);
    }
  };

  const effectiveWidth = userSettings.sidebarMinimized
    ? 38
    : Math.max(userSettings.sidebarWidth, 38);

  return (
    <div className="d-flex">
      <ResizableBox
        className={`flex-shrink-0 ${userSettings.sidebarMinimized ? 'is-sidebar-minimized' : ''}`}
        onResize={handleResize}
        width={effectiveWidth}
        height={Infinity}
        resizeHandles={userSettings.sidebarMinimized ? [] : ['e']}
        axis="x"
        maxConstraints={[400, Infinity]}
        minConstraints={[38, Infinity]}
      >
        <SideMenu />
      </ResizableBox>
      <section className="flex-grow-1 d-flex flex-column vh-100" style={{ minWidth: 0 }}>
        <Navbar />
        <div className="flex-grow-1 hw-main-content-scrollable">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="" element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              {/* Server-only pages: deep links (bookmarks, typed URLs) redirect in Direct mode */}
              <Route
                path="accounts"
                element={isDirect ? <Navigate to="/ui" replace /> : <Accounts />}
              />
              <Route
                path="settings/hyperweaver"
                element={isDirect ? <Navigate to="/ui" replace /> : <HyperweaverSettings />}
              />
              <Route path="settings/agent" element={<AgentSettings />} />
              <Route path="machines" element={<Machines />} />
              <Route path="hosts" element={<Hosts />} />
              <Route
                path="host-manage"
                element={
                  hasManageSurface(currentServer) ? (
                    <HostManage />
                  ) : (
                    <NotAvailableStub
                      title={t('chrome.layout.hostManagement')}
                      tokenLabel="any Manage surface"
                    />
                  )
                }
              />
              <Route
                path="host-networking"
                element={
                  hasNetworkingSurface(currentServer) ? (
                    <HostNetworking />
                  ) : (
                    <NotAvailableStub
                      title={t('chrome.layout.hostNetworking')}
                      tokenLabel="vnics / network-spaces"
                    />
                  )
                }
              />
              <Route
                path="host-storage"
                element={
                  hasFeature(currentServer, 'zfs') ? (
                    <HostStorage />
                  ) : (
                    <NotAvailableStub title={t('chrome.layout.hostStorage')} tokenLabel="zfs" />
                  )
                }
              />
              <Route
                path="host-devices"
                element={
                  hasFeature(currentServer, 'devices') ? (
                    <HostDevices />
                  ) : (
                    <NotAvailableStub
                      title={t('chrome.layout.deviceMonitoring')}
                      tokenLabel="devices"
                    />
                  )
                }
              />
              <Route path="zone-register" element={<ZoneRegister />} />
              <Route
                path="profile"
                element={isDirect ? <Navigate to="/ui" replace /> : <Profile />}
              />
            </Routes>
          </Suspense>
        </div>
        <Footer />
      </section>
    </div>
  );
};

/**
 * Layout component for authenticated users
 * @returns {JSX.Element} Layout component
 */
const Layout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/ui' && currentUrl !== '/ui/') {
        localStorage.setItem('hyperweaver_intended_url', currentUrl);
      }
      navigate('/ui/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="fs-3">
            <i className="fas fa-spinner fa-spin" />
          </div>
          <p className="mt-3">{t('chrome.layout.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <FooterProvider>
      <LayoutContent />
    </FooterProvider>
  );
};
export default Layout;
