import { hasFeature } from '../../../../utils/capabilities';

const processNetworkInterfaces = interfacesResult => {
  if (interfacesResult.status !== 'fulfilled') {
    return [];
  }
  const interfaces =
    interfacesResult.value?.data?.interfaces || interfacesResult.value?.interfaces || [];

  return interfaces.reduce((acc, netInterface) => {
    const interfaceId = netInterface.link;
    const existingItem = acc.find(item => item.link === interfaceId);

    if (!existingItem) {
      acc.push(netInterface);
    } else if (
      netInterface.scan_timestamp &&
      existingItem.scan_timestamp &&
      new Date(netInterface.scan_timestamp) > new Date(existingItem.scan_timestamp)
    ) {
      const index = acc.indexOf(existingItem);
      acc[index] = netInterface;
    }
    return acc;
  }, []);
};

const processNetworkUsage = usageResult => {
  if (usageResult.status !== 'fulfilled') {
    return [];
  }
  const usage = usageResult.value?.data?.usage || usageResult.value?.usage || [];
  return usage.reduce((acc, entry) => {
    const interfaceId = entry.link;
    const existingItem = acc.find(item => item.link === interfaceId);
    if (!existingItem) {
      acc.push(entry);
    } else if (
      entry.scan_timestamp &&
      existingItem.scan_timestamp &&
      new Date(entry.scan_timestamp) > new Date(existingItem.scan_timestamp)
    ) {
      const index = acc.indexOf(existingItem);
      acc[index] = entry;
    }
    return acc;
  }, []);
};

const processIpAddresses = ipResult => {
  if (ipResult.status !== 'fulfilled') {
    return [];
  }
  const ips = ipResult.value?.data?.addresses || ipResult.value?.addresses || [];
  return ips.reduce((acc, ip) => {
    const ipId = ip.addrobj || `${ip.interface}-${ip.ip_address}`;
    const existingItem = acc.find(
      item => (item.addrobj || `${item.interface}-${item.ip_address}`) === ipId
    );
    if (!existingItem) {
      acc.push(ip);
    } else if (
      ip.scan_timestamp &&
      existingItem.scan_timestamp &&
      new Date(ip.scan_timestamp) > new Date(existingItem.scan_timestamp)
    ) {
      const index = acc.indexOf(existingItem);
      acc[index] = ip;
    }
    return acc;
  }, []);
};

const processRoutes = routesResult => {
  if (routesResult.status !== 'fulfilled') {
    return [];
  }
  const routes = routesResult.value?.data?.routes || routesResult.value?.routes || [];
  return routes.reduce((acc, route) => {
    const routeId = `${route.destination}-${route.gateway}-${route.interface}`;
    const existingItem = acc.find(
      item => `${item.destination}-${item.gateway}-${item.interface}` === routeId
    );
    if (!existingItem) {
      acc.push(route);
    } else if (
      route.scan_timestamp &&
      existingItem.scan_timestamp &&
      new Date(route.scan_timestamp) > new Date(existingItem.scan_timestamp)
    ) {
      const index = acc.indexOf(existingItem);
      acc[index] = route;
    }
    return acc;
  }, []);
};

const processAggregates = aggregatesResult => {
  if (aggregatesResult.status !== 'fulfilled') {
    return [];
  }
  const aggregates =
    aggregatesResult.value?.data?.aggregates || aggregatesResult.value?.aggregates || [];
  return aggregates.reduce((acc, aggregate) => {
    const aggregateId = aggregate.name || aggregate.link;
    const existingItem = acc.find(item => (item.name || item.link) === aggregateId);
    if (!existingItem) {
      acc.push(aggregate);
    } else if (
      aggregate.scan_timestamp &&
      existingItem.scan_timestamp &&
      new Date(aggregate.scan_timestamp) > new Date(existingItem.scan_timestamp)
    ) {
      const index = acc.indexOf(existingItem);
      acc[index] = aggregate;
    }
    return acc;
  }, []);
};

const processGenericNetworkItems = (result, key, idField = 'name') => {
  if (result.status !== 'fulfilled') {
    return [];
  }
  const items = result.value?.data?.[key] || result.value?.[key] || [];
  return items.reduce((acc, item) => {
    const itemId = item[idField] || item.link;
    const existingItem = acc.find(ex => (ex[idField] || ex.link) === itemId);
    if (!existingItem) {
      acc.push(item);
    } else if (
      item.scan_timestamp &&
      existingItem.scan_timestamp &&
      new Date(item.scan_timestamp) > new Date(existingItem.scan_timestamp)
    ) {
      const index = acc.indexOf(existingItem);
      acc[index] = item;
    }
    return acc;
  }, []);
};

export const fetchNetworkData = async (currentServer, makeAgentRequest) => {
  console.log('🔍 NETWORKING: Loading complete network data for', currentServer.hostname);

  // The monitoring/network/* fetches are token-gated (sync OPEN ITEM 4b) — the
  // topology fetches below (aggregates/etherstubs/vnics/machines) are not, so a
  // vnics-capable agent without host monitoring still draws its topology.
  const monitoringAvailable = hasFeature(currentServer, 'monitoring');
  const skipped = Promise.resolve({ success: false, message: 'monitoring not advertised' });

  const [
    interfacesResult,
    usageResult,
    ipResult,
    routesResult,
    aggregatesResult,
    etherstubsResult,
    vnicsResult,
    zonesResult,
  ] = await Promise.allSettled([
    monitoringAvailable
      ? makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          'monitoring/network/interfaces'
        )
      : skipped,
    monitoringAvailable
      ? makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          'monitoring/network/usage?limit=1&per_interface=true'
        )
      : skipped,
    monitoringAvailable
      ? makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          'monitoring/network/ipaddresses'
        )
      : skipped,
    monitoringAvailable
      ? makeAgentRequest(
          currentServer.hostname,
          currentServer.port,
          currentServer.protocol,
          'monitoring/network/routes'
        )
      : skipped,
    makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'network/aggregates'
    ),
    makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'network/etherstubs'
    ),
    makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'network/vnics'
    ),
    makeAgentRequest(
      currentServer.hostname,
      currentServer.port,
      currentServer.protocol,
      'machines'
    ),
  ]);

  return {
    networkInterfaces: processNetworkInterfaces(interfacesResult),
    networkUsage: processNetworkUsage(usageResult),
    ipAddresses: processIpAddresses(ipResult),
    routes: processRoutes(routesResult),
    aggregates: processAggregates(aggregatesResult),
    etherstubs: processGenericNetworkItems(etherstubsResult, 'etherstubs'),
    vnics: processGenericNetworkItems(vnicsResult, 'vnics'),
    zones: processGenericNetworkItems(zonesResult, 'machines', 'name'),
  };
};
