import { HelmetProvider } from '@dr.pogodin/react-helmet';
import React, { Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { ModeProvider } from './contexts/ModeContext';
import { ServerProvider } from './contexts/ServerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserSettingsProvider } from './contexts/UserSettingsContext';
import { ZoneTerminalProvider } from './contexts/ZoneTerminalContext';

const Landing = React.lazy(() => import('./components/Landing'));
const Login = React.lazy(() => import('./components/Login'));
const Register = React.lazy(() => import('./components/Register'));
const ServerSetup = React.lazy(() => import('./components/ServerSetup'));
const AuthCallback = React.lazy(() => import('./components/AuthCallback'));
const StandaloneConsole = React.lazy(() => import('./components/StandaloneConsole'));
const StandaloneRdpConsole = React.lazy(() => import('./components/StandaloneRdpConsole'));
const Layout = React.lazy(() => import('./components/Layout'));

const BootFallback = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <i className="fas fa-spinner fa-spin fs-3" />
  </div>
);

/**
 * Main App component with authentication and routing
 * @returns {JSX.Element} App component
 */
const App = () => (
  <ThemeProvider>
    <ModeProvider>
      <AuthProvider>
        <ServerProvider>
          <UserSettingsProvider>
            <ZoneTerminalProvider>
              <HelmetProvider>
                <BrowserRouter>
                  <Suspense fallback={<BootFallback />}>
                    <Routes>
                      <Route exact path="/" element={<Landing />} />
                      {/* Canonical login is /ui/login — it's under the server-served /ui/ base (so a
                          refresh/deep-link resolves), and Login/AuthCallback/the server's OIDC
                          error + ?sso=unavailable redirects all target it. Bare /login funnels here. */}
                      <Route path="/ui/login" element={<Login />} />
                      <Route exact path="/login" element={<Navigate to="/ui/login" replace />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/setup" element={<ServerSetup />} />
                      <Route path="/ui/auth/callback" element={<AuthCallback />} />
                      <Route
                        path="/ui/console/:agentId/:machineName"
                        element={<StandaloneConsole />}
                      />
                      <Route
                        path="/ui/rdp/:agentId/:machineName"
                        element={<StandaloneRdpConsole />}
                      />
                      <Route
                        path="/ui/settings"
                        element={<Navigate to="/ui/settings/hyperweaver" />}
                      />
                      <Route path="/ui/*" element={<Layout />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </HelmetProvider>
            </ZoneTerminalProvider>
          </UserSettingsProvider>
        </ServerProvider>
      </AuthProvider>
    </ModeProvider>
  </ThemeProvider>
);

export default App;
