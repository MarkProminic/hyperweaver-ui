export const getCategoryTagClass = category => {
  if (category === 'network') {
    return 'text-bg-info';
  }
  if (category === 'storage') {
    return 'text-bg-primary';
  }
  if (category === 'display') {
    return 'text-bg-success';
  }
  return 'text-bg-dark';
};

// Device status helper functions
export const getDeviceStatusColor = device => {
  if (!device.driver_attached) {
    return 'text-bg-warning';
  }
  if (device.ppt_enabled && device.assigned_to_zones?.length) {
    return 'text-bg-info';
  }
  if (device.ppt_enabled) {
    return 'text-bg-success';
  }
  return 'text-bg-dark';
};

export const getDeviceStatusText = device => {
  if (!device.driver_attached) {
    return 'No Driver';
  }
  if (device.ppt_enabled && device.assigned_to_zones?.length) {
    return 'PPT Assigned';
  }
  if (device.ppt_enabled) {
    return 'PPT Ready';
  }
  return 'Driver Attached';
};

export const getPPTStatusColor = device => {
  if (!device.ppt_capable) {
    return 'text-bg-dark';
  }
  if (device.assigned_to_zones?.length) {
    return 'text-bg-warning';
  }
  return 'text-bg-success';
};

export const getPPTStatusText = device => {
  if (!device.ppt_capable) {
    return 'Not Capable';
  }
  if (device.assigned_to_zones?.length) {
    return `Assigned (${device.assigned_to_zones.length})`;
  }
  return 'Available';
};

// Export functionality
export const exportDeviceData = (devices, server, format = 'csv') => {
  if (format === 'csv') {
    const headers = [
      'Device Name',
      'Vendor',
      'PCI Address',
      'Category',
      'Driver',
      'PPT Enabled',
      'Assigned To',
    ];
    const csvContent = [
      headers.join(','),
      ...devices.map(device =>
        [
          `"${device.device_name || ''}"`,
          `"${device.vendor_name || ''}"`,
          `"${device.pci_address || ''}"`,
          `"${device.device_category || ''}"`,
          `"${device.driver_name || ''}"`,
          device.ppt_enabled ? 'Yes' : 'No',
          `"${device.assigned_to_zones?.join(', ') || ''}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_${server?.hostname || 'unknown'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } else if (format === 'json') {
    const jsonContent = JSON.stringify(
      {
        server: server?.hostname,
        export_date: new Date().toISOString(),
        devices,
      },
      null,
      2
    );

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_${server?.hostname || 'unknown'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
