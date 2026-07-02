import { HelmetProvider } from '@dr.pogodin/react-helmet';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

import AuthCallback from './components/AuthCallback';
import Landing from './components/Landing';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import ServerSetup from './components/ServerSetup';
import StandaloneConsole from './components/StandaloneConsole';
import { AuthProvider } from './contexts/AuthContext';
import { ModeProvider } from './contexts/ModeContext';
import { ServerProvider } from './contexts/ServerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserSettingsProvider } from './contexts/UserSettingsContext';
import { ZoneTerminalProvider } from './contexts/ZoneTerminalContext';

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
                  <Routes>
                    <Route exact path="/" element={<Landing />} />
                    <Route exact path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/setup" element={<ServerSetup />} />
                    <Route path="/ui/auth/callback" element={<AuthCallback />} />
                    <Route path="/ui/console/:agentId/:zoneName" element={<StandaloneConsole />} />
                    <Route
                      path="/ui/settings"
                      element={<Navigate to="/ui/settings/hyperweaver" />}
                    />
                    <Route path="/ui/*" element={<Layout />} />
                  </Routes>
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
