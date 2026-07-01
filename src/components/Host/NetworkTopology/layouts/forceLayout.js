/**
 * Force-directed layout - Simulates physical forces
 */
export const calculateForceLayout = (nodes, edges) => {
  const width = 1200;
  const height = 800;

  // Simple force-directed positioning
  const layoutedNodes = nodes.map((node, index) => {
    // Start with a rough grid
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const x = (index % cols) * (width / cols) + 100;
    const y = Math.floor(index / cols) * (height / Math.ceil(nodes.length / cols)) + 100;

    // Add some randomness for natural clustering
    const randomX = (Math.random() - 0.5) * 100;
    const randomY = (Math.random() - 0.5) * 100;

    return {
      ...node,
      position: {
        x: x + randomX,
        y: y + randomY,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
