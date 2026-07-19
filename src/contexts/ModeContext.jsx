import axios from 'axios';
import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Mode context — Axis 1 of the dual-mode design (see hyperweaver-dualmode-plan.md §1/§3).
 *
 * The SPA discovers how it is being served by probing its OWN ORIGIN:
 *   GET /api/status  →  { role: "server", ... }  → Aggregated mode (Hyperweaver Server:
 *                                                   registry, user auth, /api/agents proxy)
 *                    →  { role: "agent", ... }   → Direct mode (an agent serves the SPA:
 *                                                   single host, API-key auth, origin-root paths)
 *
 * The probe is a RELATIVE url, so it always resolves to whoever served the page — every
 * node answers only about itself, which is what makes joined/clustered agents unambiguous.
 * In Direct mode the same payload doubles as the self-agent's identity/capabilities
 * (Axis 2): agent name, hypervisors[], platform/arch, auth[], console[], features[],
 * bootstrapAvailable.
 */
const ModeContext = createContext();

/**
 * Custom hook to use mode context
 * @returns {Object} Mode context value
 */
export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

/**
 * Mode provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ModeProvider = ({ children }) => {
  const { t } = useTranslation();
  const [serverInfo, setServerInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const probe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Pre-auth by contract: role/auth/bootstrapAvailable must be readable before login.
      const response = await axios.get('/api/status');

      if (response.data && (response.data.role === 'server' || response.data.role === 'agent')) {
        setServerInfo(response.data);
      } else {
        setError(t('app.modeContext.unrecognizedPayload'));
      }
    } catch (probeErr) {
      console.error('Mode probe failed:', probeErr);
      setError(probeErr.response?.data?.message || t('app.modeContext.probeFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    probe();
  }, [probe]);

  const value = useMemo(() => {
    const mode = (() => {
      if (serverInfo?.role === 'agent') {
        return 'direct';
      }
      if (serverInfo?.role === 'server') {
        return 'aggregated';
      }
      return null;
    })();

    return {
      /** 'direct' | 'aggregated' | null (null until the probe answers) */
      mode,
      isDirect: mode === 'direct',
      isAggregated: mode === 'aggregated',
      /** Raw /api/status payload; in Direct mode this is the self-agent's identity */
      serverInfo,
      /** True once the mode is pinned */
      ready: mode !== null,
      loading,
      error,
      /** Re-run the probe (idempotent; used by the error retry) */
      refresh: probe,
    };
  }, [serverInfo, loading, error, probe]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

ModeProvider.propTypes = {
  children: PropTypes.node,
};

export default ModeContext;
