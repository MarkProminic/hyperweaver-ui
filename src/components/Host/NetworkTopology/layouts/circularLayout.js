/**
 * Circular layout - Arrange nodes in concentric circles
 */
export const calculateCircularLayout = (nodes, edges) => {
  const centerX = 600;
  const centerY = 400;

  // Group nodes by type for circular arrangement
  const nodeGroups = {
    physicalNic: nodes.filter(n => n.type === 'physicalNic'),
    aggregate: nodes.filter(n => n.type === 'aggregate'),
    etherstub: nodes.filter(n => n.type === 'etherstub'),
    vnic: nodes.filter(n => n.type === 'vnic'),
    zone: nodes.filter(n => n.type === 'zone'),
  };

  const layoutedNodes = [];
  let currentRadius = 150;

  // Place each group in concentric circles
  Object.values(nodeGroups).forEach(typeNodes => {
    if (typeNodes.length === 0) {
      return;
    }

    const angleStep = (2 * Math.PI) / typeNodes.length;

    typeNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x = centerX + currentRadius * Math.cos(angle);
      const y = centerY + currentRadius * Math.sin(angle);

      layoutedNodes.push({
        ...node,
        position: { x, y },
      });
    });

    currentRadius += 150; // Move to next circle
  });

  return { nodes: layoutedNodes, edges };
};
