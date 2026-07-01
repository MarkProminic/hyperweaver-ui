/**
 * Zone-centric layout - Zones at center with their network paths radiating out
 */
const calculateZoneCentricLayout = (nodes, edges) => {
  const zoneNodes = nodes.filter(n => n.type === 'zone');
  const centerX = 600;
  const centerY = 400;
  const zoneRadius = 200;

  // Place zones in a circle at the center
  const layoutedNodes = [];

  zoneNodes.forEach((zone, index) => {
    const angle = (index * 2 * Math.PI) / zoneNodes.length;
    const x = centerX + zoneRadius * Math.cos(angle);
    const y = centerY + zoneRadius * Math.sin(angle);

    layoutedNodes.push({
      ...zone,
      position: { x, y },
    });

    // Find connected VNICs and place them around the zone
    const connectedVnics = edges
      .filter(edge => edge.target === zone.id)
      .map(edge => nodes.find(n => n.id === edge.source))
      .filter(Boolean);

    connectedVnics.forEach((vnic, vnicIndex) => {
      const vnicAngle = angle + (vnicIndex - connectedVnics.length / 2) * 0.3;
      const vnicRadius = 100;
      const vnicX = x + vnicRadius * Math.cos(vnicAngle);
      const vnicY = y + vnicRadius * Math.sin(vnicAngle);

      layoutedNodes.push({
        ...vnic,
        position: { x: vnicX, y: vnicY },
      });
    });
  });

  // Add remaining nodes in outer rings
  const remainingNodes = nodes.filter(n => !layoutedNodes.some(ln => ln.id === n.id));

  remainingNodes.forEach((node, index) => {
    const angle = (index * 2 * Math.PI) / remainingNodes.length;
    const radius = 400;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    layoutedNodes.push({
      ...node,
      position: { x, y },
    });
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Bandwidth-focused layout - High bandwidth nodes get prominent positions
 */
const calculateBandwidthLayout = (nodes, edges) => {
  // Calculate bandwidth for each node
  const nodeBandwidth = new Map();

  edges.forEach(edge => {
    const bandwidth = edge.data?.bandwidth?.totalMbps || 0;

    if (!nodeBandwidth.has(edge.source)) {
      nodeBandwidth.set(edge.source, 0);
    }
    if (!nodeBandwidth.has(edge.target)) {
      nodeBandwidth.set(edge.target, 0);
    }

    nodeBandwidth.set(edge.source, nodeBandwidth.get(edge.source) + bandwidth);
    nodeBandwidth.set(edge.target, nodeBandwidth.get(edge.target) + bandwidth);
  });

  // Sort nodes by bandwidth
  const sortedNodes = [...nodes].sort((a, b) => {
    const aBw = nodeBandwidth.get(a.id) || 0;
    const bBw = nodeBandwidth.get(b.id) || 0;
    return bBw - aBw;
  });

  // Place high-bandwidth nodes prominently
  const layoutedNodes = sortedNodes.map((node, index) => {
    const tier = Math.floor(index / 5); // 5 nodes per tier
    const posInTier = index % 5;

    const x = 200 + posInTier * 200;
    const y = 150 + tier * 150;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Custom layout for specific view types
 */
export const getViewSpecificLayout = (nodes, edges, viewType) => {
  switch (viewType) {
    case 'zone-centric':
      return calculateZoneCentricLayout(nodes, edges);

    case 'bandwidth':
      return calculateBandwidthLayout(nodes, edges);

    default:
      return null; // Use standard layout
  }
};
