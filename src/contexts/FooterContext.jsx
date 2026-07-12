import PropTypes from 'prop-types';
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';

import { getAgentBasePath, fetchWsTicket } from '../api/serverUtils';
import { hasFeature } from '../utils/capabilities';
import { buildWsUrl } from '../utils/websocket';

import { useServers } from './ServerContext';
import { UserSettings } from './UserSettingsContext';

const FooterContext = createContext();

export const useFooter = () => useContext(FooterContext);

export const FooterProvider = ({ children }) => {
  const { currentServer, makeAgentRequest } = useServers();
  const { footerActiveView, footerIsActive, taskMinPriority } = useContext(UserSettings);
  const [tasks, setTasks] = useState([]);
  const [tasksError, setTasksError] = useState('');
  const [session, setSession] = useState(null);

  // Capability gates (v1 feature tokens): agents that don't offer these surfaces get
  // neither the 1s task polling nor the term/start session attempt.
  const tasksAvailable = hasFeature(currentServer, 'tasks');
  const shellAvailable = hasFeature(currentServer, 'host-terminal');

  // Use ref to track current tasks for since parameter
  const tasksRef = useRef([]);
  const intervalRef = useRef(null);

  // Simplified session management for react-xtermjs
  const persistentSession = useRef(null);
  const persistentWs = useRef(null);
  const terminalCreating = useRef(false);

  // Update ref when tasks change
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    if (!currentServer || !makeAgentRequest) {
      return;
    }

    try {
      // Get current tasks from ref to determine since parameter
      const currentTasks = tasksRef.current;
      const params = { min_priority: taskMinPriority, limit: 50 };
      if (currentTasks.length > 0) {
        params.since = new Date(currentTasks[0].updatedAt).toISOString();
      }

      const result = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'tasks',
        'GET',
        null,
        params
      );

      if (result.success) {
        setTasks(prevTasks => {
          if (prevTasks.length === 0) {
            // First load - set all tasks
            const sortedTasks = result.data.tasks.sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            return sortedTasks;
          }
          // Subsequent loads - update existing tasks and add new ones
          if (result.data.tasks.length > 0) {
            const newTasks = result.data.tasks;
            const existingTasksMap = new Map(prevTasks.map(task => [task.id, task]));
            const updatedTasks = [...prevTasks];
            const tasksToAdd = [];
            let hasUpdates = false;

            // Process each task from API
            newTasks.forEach(apiTask => {
              if (existingTasksMap.has(apiTask.id)) {
                // Update existing task if it has changed
                const existingTask = existingTasksMap.get(apiTask.id);
                if (
                  existingTask.status !== apiTask.status ||
                  existingTask.updatedAt !== apiTask.updatedAt ||
                  existingTask.completed_at !== apiTask.completed_at ||
                  existingTask.error_message !== apiTask.error_message
                ) {
                  // Find and update the existing task
                  const taskIndex = updatedTasks.findIndex(task => task.id === apiTask.id);
                  if (taskIndex !== -1) {
                    updatedTasks[taskIndex] = apiTask;
                    hasUpdates = true;
                  }
                }
              } else {
                // New task to add
                tasksToAdd.push(apiTask);
              }
            });

            // Add new tasks to the beginning and sort them
            if (tasksToAdd.length > 0) {
              const sortedNewTasks = tasksToAdd.sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
              );
              return [...sortedNewTasks, ...updatedTasks];
            }

            // Return updated tasks if there were changes
            if (hasUpdates) {
              return updatedTasks;
            }
          }
          return prevTasks;
        });
      } else {
        console.error(result.message || 'Failed to fetch tasks');
      }
    } catch (err) {
      console.error('An error occurred while fetching tasks:', err);
    }
  }, [currentServer, makeAgentRequest, taskMinPriority]);

  // Single useEffect to manage task fetching and refresh intervals
  useEffect(() => {
    // Clear existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const shouldPoll =
      currentServer && tasksAvailable && footerIsActive && footerActiveView === 'tasks';

    if (currentServer) {
      // Clear tasks when server changes
      setTasks([]);
      setTasksError('');

      // Only fetch and refresh tasks when footer is active and tasks view is selected
      if (shouldPoll) {
        const loadAndStartRefresh = async () => {
          // Wait for initial load to complete
          await fetchTasks();
          // Only start the interval after initial load is done and if conditions are still met
          if (currentServer && tasksAvailable && footerIsActive && footerActiveView === 'tasks') {
            intervalRef.current = setInterval(() => {
              // Double-check conditions before each fetch to prevent unnecessary requests
              if (
                currentServer &&
                tasksAvailable &&
                footerIsActive &&
                footerActiveView === 'tasks'
              ) {
                fetchTasks();
              } else if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }, 1000);
          }
        };

        loadAndStartRefresh();
      }
    } else {
      // Clear tasks when no server selected
      setTasks([]);
      setTasksError('');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentServer, tasksAvailable, footerIsActive, footerActiveView, fetchTasks]);

  // Clean up session when server changes
  useEffect(() => {
    // Clean up previous session when server changes
    if (persistentWs.current) {
      persistentWs.current.close();
      persistentWs.current = null;
    }
    if (persistentSession.current) {
      // Stop against the server the session was CREATED on — currentServer is null
      // when the selected server was just deleted (that deref used to crash the app)
      const { id, server: sessionServer } = persistentSession.current;
      if (sessionServer) {
        makeAgentRequest(
          sessionServer.hostname,
          sessionServer.port,
          sessionServer.protocol,
          `term/sessions/${id}/stop`,
          'DELETE'
        ).catch(console.error);
      }
      persistentSession.current = null;
    }

    // Reset session state
    setSession(null);
    // Trigger when the server identity changes (protocol included — it's part of the triple)
  }, [currentServer?.hostname, currentServer?.port, currentServer?.protocol, makeAgentRequest]);

  // Create session and WebSocket for react-xtermjs
  const createSession = useCallback(async () => {
    if (
      !currentServer ||
      !shellAvailable ||
      persistentSession.current ||
      terminalCreating.current
    ) {
      return;
    }

    terminalCreating.current = true;

    try {
      const res = await makeAgentRequest(
        currentServer.hostname,
        currentServer.port,
        currentServer.protocol,
        'term/start',
        'POST'
      );

      if (!res.success) {
        console.error('Failed to create terminal session:', res.message);
        return;
      }

      // The agent returns the session (some responses nest it under data).
      // `id` IS the session UUID — the only key the /term/{id} upgrade
      // matcher and term/sessions/{id}/stop accept.
      const sessionData = res.data?.data || res.data;
      const sessionId = sessionData.id;
      if (!sessionId) {
        console.error('🚨 FOOTER: term/start response missing session UUID:', sessionData);
        return;
      }

      const basePath = getAgentBasePath(currentServer);
      if (basePath === null) {
        console.error('🚫 FOOTER: Agent not resolvable yet — skipping terminal WebSocket');
        return;
      }

      // Phase H: every agent WS upgrade requires a fresh short-lived ticket.
      const ticket = await fetchWsTicket(currentServer);

      // Create WebSocket for react-xtermjs — path DERIVED from mode + session id
      const ws = new WebSocket(buildWsUrl(`${basePath}/term/${sessionId}`, ticket));

      ws.onopen = () => {
        // Send initial prompt
        ws.send('\n');
      };

      ws.onerror = wsError => {
        console.error('🚨 FOOTER: WebSocket error for session:', sessionId, wsError);
      };

      // Store session with WebSocket for HostShell — `id` (UUID) drives the
      // cleanup/restart stop calls (term/sessions/{id}/stop). The creating
      // server's triple rides along so cleanup works after the server is
      // deselected or deleted (currentServer may be null by then).
      const sessionWithWs = {
        ...sessionData,
        server: {
          hostname: currentServer.hostname,
          port: currentServer.port,
          protocol: currentServer.protocol,
        },
        websocket: ws,
      };

      persistentSession.current = sessionWithWs;
      persistentWs.current = ws;
      setSession(sessionWithWs);
    } catch (createErr) {
      console.error('Failed to create session:', createErr);
    } finally {
      terminalCreating.current = false;
    }
  }, [currentServer, shellAvailable, makeAgentRequest]);

  // Create session when server is available
  useEffect(() => {
    if (currentServer && !persistentSession.current) {
      createSession();
    }
  }, [currentServer, createSession]);

  // Restart shell session
  const restartShell = useCallback(async () => {
    if (!currentServer) {
      return;
    }

    try {
      // Clean up current session
      if (persistentWs.current) {
        persistentWs.current.close();
        persistentWs.current = null;
      }
      if (persistentSession.current) {
        const { id, server: sessionServer } = persistentSession.current;
        const stopTarget = sessionServer || currentServer;
        await makeAgentRequest(
          stopTarget.hostname,
          stopTarget.port,
          stopTarget.protocol,
          `term/sessions/${id}/stop`,
          'DELETE'
        ).catch(console.error);
        persistentSession.current = null;
      }

      // Reset state
      setSession(null);

      // Create new session
      await createSession();
    } catch (restartErr) {
      console.error('Failed to restart shell:', restartErr);
    }
  }, [currentServer, createSession, makeAgentRequest]);

  const value = React.useMemo(
    () => ({
      tasks,
      tasksError,
      fetchTasks,
      session,
      restartShell,
    }),
    [tasks, tasksError, fetchTasks, session, restartShell]
  );

  return <FooterContext.Provider value={value}>{children}</FooterContext.Provider>;
};

FooterProvider.propTypes = {
  children: PropTypes.node,
};
