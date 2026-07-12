import { useEffect, useState } from 'react';

import { useServers } from '../contexts/ServerContext';

// Agent-reported hostnames (GET /stats `hostname`), cached per registered
// address for the session — a host registered by IP (127.0.0.1 in Direct
// mode) still DISPLAYS its real name everywhere. The registered address
// keeps doing the wiring; a user-set entityName beats both.
const agentHostnames = new Map();

export const useAgentHostname = server => {
  const { makeAgentRequest } = useServers();
  const key = server ? `${server.hostname}:${server.port}` : null;
  const [reported, setReported] = useState(() => (key ? agentHostnames.get(key) || null : null));

  useEffect(() => {
    if (!server || !key) {
      setReported(null);
      return undefined;
    }
    if (agentHostnames.has(key)) {
      setReported(agentHostnames.get(key));
      return undefined;
    }
    let cancelled = false;
    makeAgentRequest(server.hostname, server.port, server.protocol, 'stats').then(result => {
      if (cancelled) {
        return;
      }
      if (result.success && result.data?.hostname) {
        agentHostnames.set(key, result.data.hostname);
        setReported(result.data.hostname);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [server, key, makeAgentRequest]);

  return server?.entityName || reported || server?.hostname || '';
};
