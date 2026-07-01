/**
 * Grid layout - Simple grid arrangement
 */
export const calculateGridLayout = (nodes, edges) => {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellWidth = 250;
  const cellHeight = 200;

  const layoutedNodes = nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      ...node,
      position: {
        x: col * cellWidth + 100,
        y: row * cellHeight + 100,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
