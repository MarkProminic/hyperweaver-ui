/**
 * Vertical hierarchical layout - Physical NICs at top in a row, then layers below
 */
export const calculateHierarchicalLayout = (nodes, edges) => {
  console.log('🔍 LAYOUT: Calculating vertical hierarchical layout for', nodes.length, 'nodes');

  // Group nodes by type for layered layout
  const nodesByType = {
    physicalNic: nodes.filter(n => n.type === 'physicalNic'),
    aggregate: nodes.filter(n => n.type === 'aggregate'),
    etherstub: nodes.filter(n => n.type === 'etherstub'),
    vnic: nodes.filter(n => n.type === 'vnic'),
    zone: nodes.filter(n => n.type === 'zone'),
  };

  console.log(
    '🔍 LAYOUT: Nodes by type:',
    Object.fromEntries(
      Object.entries(nodesByType).map(([type, nodesList]) => [type, nodesList.length])
    )
  );

  const layoutedNodes = [];
  const horizontalSpacing = 120; // Horizontal spacing between nodes in a row
  const layerHeight = 300; // Vertical spacing between layers (doubled for better visibility)
  const viewportWidth = 1000; // Assume a reasonable viewport width
  const viewportHeight = 500; // Assume a reasonable viewport height
  const minStartX = 100; // Minimum left margin
  const vnicSpacing = 80; // Closer spacing for VNICs

  // Calculate width for each active row
  const rowWidths = [];
  if (nodesByType.physicalNic.length > 0) {
    rowWidths.push((nodesByType.physicalNic.length - 1) * horizontalSpacing);
  }
  if (nodesByType.aggregate.length > 0) {
    rowWidths.push((nodesByType.aggregate.length - 1) * horizontalSpacing);
  }
  if (nodesByType.etherstub.length > 0) {
    rowWidths.push((nodesByType.etherstub.length - 1) * horizontalSpacing);
  }
  if (nodesByType.vnic.length > 0) {
    rowWidths.push((nodesByType.vnic.length - 1) * vnicSpacing);
  }
  if (nodesByType.zone.length > 0) {
    rowWidths.push((nodesByType.zone.length - 1) * horizontalSpacing);
  }

  // Find the maximum width (longest row) and calculate master center point
  const maxRowWidth = Math.max(...rowWidths, 0);
  const masterCenterX = viewportWidth / 2; // Center of viewport

  console.log('🔍 LAYOUT: Row widths:', rowWidths);
  console.log('🔍 LAYOUT: Max row width:', maxRowWidth, 'Master center X:', masterCenterX);

  // Helper function to calculate justified layout for shorter rows
  const getJustifiedLayout = (nodeCount, defaultSpacing, rowType = 'default') => {
    if (nodeCount <= 1) {
      return { startX: masterCenterX, spacing: defaultSpacing };
    }

    const normalRowWidth = (nodeCount - 1) * defaultSpacing;

    // If this row is significantly shorter than the max, justify it by increasing spacing
    if (maxRowWidth > normalRowWidth * 1.5) {
      // Calculate available width for justification (use 70% of max width for aesthetics)
      const availableWidth = maxRowWidth * 0.7;
      const justifiedSpacing = Math.min(
        availableWidth / (nodeCount - 1),
        defaultSpacing * 2 // Don't spread more than 2x normal spacing
      );

      const justifiedRowWidth = (nodeCount - 1) * justifiedSpacing;
      const startX = Math.max(minStartX, masterCenterX - justifiedRowWidth / 2);

      console.log(
        `🔍 LAYOUT: Justifying ${rowType} row - nodes: ${nodeCount}, normal width: ${normalRowWidth}, justified width: ${justifiedRowWidth}, spacing: ${justifiedSpacing}`
      );

      return { startX, spacing: justifiedSpacing };
    }

    // For longer rows or when justification isn't needed, use normal centering
    const startX = Math.max(minStartX, masterCenterX - normalRowWidth / 2);
    return { startX, spacing: defaultSpacing };
  };

  // Calculate total layers needed and center vertically
  const activeLayers = [
    nodesByType.physicalNic.length > 0,
    nodesByType.aggregate.length > 0,
    nodesByType.etherstub.length > 0,
    nodesByType.vnic.length > 0,
    nodesByType.zone.length > 0,
  ].filter(Boolean).length;

  const totalHeight = Math.max(0, (activeLayers - 1) * layerHeight); // Height from first to last layer
  const centeredStartY = Math.max(50, (viewportHeight - totalHeight) / 2); // Center vertically with minimum margin

  // Layout in vertical layers with horizontal rows
  let currentY = centeredStartY;

  // Layer 1: Physical NICs at the top in a horizontal row
  if (nodesByType.physicalNic.length > 0) {
    const layout = getJustifiedLayout(
      nodesByType.physicalNic.length,
      horizontalSpacing,
      'physicalNic'
    );

    nodesByType.physicalNic.forEach((node, index) => {
      const position = {
        x: layout.startX + index * layout.spacing,
        y: currentY,
      };

      layoutedNodes.push({ ...node, position });
    });

    currentY += layerHeight;
  }

  // Layer 2: Aggregates (if any)
  if (nodesByType.aggregate.length > 0) {
    const layout = getJustifiedLayout(nodesByType.aggregate.length, horizontalSpacing, 'aggregate');

    nodesByType.aggregate.forEach((node, index) => {
      const position = {
        x: layout.startX + index * layout.spacing,
        y: currentY,
      };

      layoutedNodes.push({ ...node, position });
    });

    currentY += layerHeight;
  }

  // Layer 3: Etherstubs (if any)
  if (nodesByType.etherstub.length > 0) {
    const layout = getJustifiedLayout(nodesByType.etherstub.length, horizontalSpacing, 'etherstub');

    nodesByType.etherstub.forEach((node, index) => {
      const position = {
        x: layout.startX + index * layout.spacing,
        y: currentY,
      };

      layoutedNodes.push({ ...node, position });
    });

    currentY += layerHeight;
  }

  // Layer 4: VNICs - arrange all on a single row, close together
  if (nodesByType.vnic.length > 0) {
    const layout = getJustifiedLayout(nodesByType.vnic.length, vnicSpacing, 'vnic');

    nodesByType.vnic.forEach((node, index) => {
      const position = {
        x: layout.startX + index * layout.spacing,
        y: currentY,
      };

      layoutedNodes.push({ ...node, position });
    });

    currentY += layerHeight;
  }

  // Layer 5: Zones at the bottom
  if (nodesByType.zone.length > 0) {
    const layout = getJustifiedLayout(nodesByType.zone.length, horizontalSpacing, 'zone');

    nodesByType.zone.forEach((node, index) => {
      const position = {
        x: layout.startX + index * layout.spacing,
        y: currentY,
      };

      layoutedNodes.push({ ...node, position });
    });
  }

  return { nodes: layoutedNodes, edges };
};
