import { makeAgentRequest } from '../../../api/serverUtils';

/**
 * The Go agent's /network/spaces management wire (network-spaces token):
 * typed listing + CRUD on the host-only interface family (with DHCP), the
 * VirtualBox 7 host-only network family, and NAT networks (knobs,
 * port-forwards, loopbacks, service start/stop). Internal networks are
 * read-only by platform rule.
 */

export const listSpaces = async server =>
  await makeAgentRequest(server.hostname, server.port, server.protocol, 'network/spaces');

export const createHostOnlyIf = async (server, body) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    'network/spaces/hostonly',
    'POST',
    body
  );

export const modifyHostOnlyIf = async (server, name, body) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/hostonly/${encodeURIComponent(name)}`,
    'PUT',
    body
  );

export const deleteHostOnlyIf = async (server, name) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/hostonly/${encodeURIComponent(name)}`,
    'DELETE'
  );

export const createHostOnlyNet = async (server, body) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    'network/spaces/hostonlynet',
    'POST',
    body
  );

export const modifyHostOnlyNet = async (server, name, body) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/hostonlynet/${encodeURIComponent(name)}`,
    'PUT',
    body
  );

export const deleteHostOnlyNet = async (server, name) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/hostonlynet/${encodeURIComponent(name)}`,
    'DELETE'
  );

export const createNatNetwork = async (server, body) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    'network/spaces/natnetwork',
    'POST',
    body
  );

export const modifyNatNetwork = async (server, name, body) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/natnetwork/${encodeURIComponent(name)}`,
    'PUT',
    body
  );

export const deleteNatNetwork = async (server, name) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/natnetwork/${encodeURIComponent(name)}`,
    'DELETE'
  );

export const natNetworkService = async (server, name, action) =>
  await makeAgentRequest(
    server.hostname,
    server.port,
    server.protocol,
    `network/spaces/natnetwork/${encodeURIComponent(name)}/${action}`,
    'POST'
  );
