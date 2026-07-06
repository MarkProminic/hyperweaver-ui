import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useServers } from '../../contexts/ServerContext';

export const useHostDevicesData = () => {
  const [devices, setDevices] = useState([]);
  const [deviceCategories, setDeviceCategories] = useState({});
  const [pptStatus, setPptStatus] = useState({});
  const [availableDevices, setAvailableDevices] = useState([]);
  const [devicesSummary, setDevicesSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Filtering and search states
  const [filters, setFilters] = useState({
    category: '',
    pptStatus: '',
    driverStatus: '',
    searchText: '',
  });

  // Collapsible section states
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    summary: false,
    filters: false,
    inventory: false,
    pptDevices: false,
  });

  // Sorting states
  const [deviceSort, setDeviceSort] = useState([{ column: 'device_name', direction: 'asc' }]);

  const { user } = useAuth();
  const {
    getServers,
    servers,
    currentServer,
    getHostDevices,
    getDeviceCategories,
    getPPTStatus,
    getAvailableDevices,
    refreshDeviceDiscovery,
  } = useServers();

  // In-flight guard kept in a ref (NOT the `loading` state) so loadDeviceData's identity
  // stays stable. With `loading` in the deps, every fetch completion minted a new callback,
  // re-fired the load effect below, and the page refetched in an endless loop (visible as
  // the Devices tab flickering). Same pattern as useHostData's isLoadingRef.
  const isLoadingRef = useRef(false);

  const loadDeviceData = useCallback(
    async server => {
      if (!server || isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError('');

        // Load all device data
        const [devicesResult, categoriesResult, pptResult, availableResult] =
          await Promise.allSettled([
            getHostDevices(server.hostname, server.port, server.protocol),
            getDeviceCategories(server.hostname, server.port, server.protocol),
            getPPTStatus(server.hostname, server.port, server.protocol),
            getAvailableDevices(server.hostname, server.port, server.protocol),
          ]);

        // Handle devices
        if (devicesResult.status === 'fulfilled' && devicesResult.value.success) {
          const deviceList = devicesResult.value.data?.devices || [];
          const summary = devicesResult.value.data?.summary || {};
          setDevices(deviceList);
          setDevicesSummary(summary);
        } else {
          console.error('Failed to load devices:', devicesResult);
        }

        // Handle categories
        if (categoriesResult.status === 'fulfilled' && categoriesResult.value.success) {
          const categories = categoriesResult.value.data?.categories || {};
          setDeviceCategories(categories);
        } else {
          console.error('Failed to load categories:', categoriesResult);
        }

        // Handle PPT status
        if (pptResult.status === 'fulfilled' && pptResult.value.success) {
          const pptData = pptResult.value.data || {};
          setPptStatus(pptData);
        } else {
          console.error('Failed to load PPT status:', pptResult);
        }

        // Handle available devices
        if (availableResult.status === 'fulfilled' && availableResult.value.success) {
          const availableList = availableResult.value.data?.devices || [];
          setAvailableDevices(availableList);
        } else {
          console.error('Failed to load available devices:', availableResult);
        }
      } catch (err) {
        console.error('Error loading device data:', err);
        setError('Error loading device data');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [getHostDevices, getDeviceCategories, getPPTStatus, getAvailableDevices]
  );

  useEffect(() => {
    const serverList = getServers();
    if (serverList.length > 0) {
      const server = currentServer || serverList[0];
      setSelectedServer(server);
      loadDeviceData(server);
    }
  }, [servers, currentServer, getServers, loadDeviceData]);

  const handleDeviceRefresh = async () => {
    if (!selectedServer) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Trigger device discovery refresh
      const refreshResult = await refreshDeviceDiscovery(
        selectedServer.hostname,
        selectedServer.port,
        selectedServer.protocol
      );

      if (refreshResult.success) {
        // Reload all device data after refresh
        setTimeout(() => {
          loadDeviceData(selectedServer);
        }, 2000); // Give backend time to complete discovery
      } else {
        setError(refreshResult.message || 'Failed to refresh device discovery');
      }
    } catch (err) {
      console.error('Error refreshing devices:', err);
      setError('Error refreshing device discovery');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search functions
  const applyFilters = deviceList =>
    deviceList.filter(device => {
      // Category filter
      if (filters.category && device.device_category !== filters.category) {
        return false;
      }

      // PPT status filter
      if (filters.pptStatus) {
        if (filters.pptStatus === 'enabled' && !device.ppt_enabled) {
          return false;
        }
        if (filters.pptStatus === 'disabled' && device.ppt_capable) {
          return false;
        }
        if (
          filters.pptStatus === 'assigned' &&
          (!device.ppt_capable || !device.assigned_to_zones?.length)
        ) {
          return false;
        }
        if (
          filters.pptStatus === 'available' &&
          (!device.ppt_capable || device.assigned_to_zones?.length)
        ) {
          return false;
        }
      }

      // Driver status filter
      if (filters.driverStatus) {
        if (filters.driverStatus === 'attached' && !device.driver_attached) {
          return false;
        }
        if (filters.driverStatus === 'detached' && device.driver_attached) {
          return false;
        }
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchFields = [
          device.device_name,
          device.vendor_name,
          device.pci_address,
          device.driver_name,
        ].filter(Boolean);

        if (!matchFields.some(field => field.toLowerCase().includes(searchLower))) {
          return false;
        }
      }

      return true;
    });

  // Sorting functions
  const handleDeviceSort = column => {
    setDeviceSort(prevSort => {
      const existingIndex = prevSort.findIndex(sort => sort.column === column);

      if (existingIndex >= 0) {
        const newSort = [...prevSort];
        if (newSort[existingIndex].direction === 'asc') {
          newSort[existingIndex].direction = 'desc';
        } else {
          newSort.splice(existingIndex, 1);
        }
        return newSort.length > 0 ? newSort : [{ column: 'device_name', direction: 'asc' }];
      }
      return [...prevSort, { column, direction: 'asc' }];
    });
  };

  const getSortedDevices = deviceList =>
    [...deviceList].sort((a, b) => {
      for (const sort of deviceSort) {
        const { column, direction } = sort;
        let aVal = a[column];
        let bVal = b[column];

        // Handle different data types
        if (typeof aVal === 'boolean') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal ? bVal.toLowerCase() : '';
        }

        if (aVal < bVal) {
          return direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });

  const getSortIcon = (currentSortArray, column) => {
    const sortIndex = currentSortArray.findIndex(sort => sort.column === column);
    if (sortIndex === -1) {
      return 'fa-sort';
    }

    const sort = currentSortArray[sortIndex];
    const baseIcon = sort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';

    return baseIcon;
  };

  // Toggle section collapse state
  const toggleSection = section => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return {
    devices,
    deviceCategories,
    pptStatus,
    availableDevices,
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
    servers, // Added for useMemo dependency
    handleDeviceRefresh,
    applyFilters,
    loadDeviceData,
  };
};
