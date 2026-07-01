import { calculateCircularLayout } from '../layouts/circularLayout';
import { calculateForceLayout } from '../layouts/forceLayout';
import { calculateGridLayout } from '../layouts/gridLayout';
import { calculateHierarchicalLayout } from '../layouts/hierarchicalLayout';
import { getViewSpecificLayout } from '../layouts/viewSpecificLayouts';

/**
 * Calculate layout for network topology based on the selected algorithm and view
 */
export const calculateLayout = (topology, layoutType, viewType) => {
  const { nodes: initialNodes, edges } = topology;

  // First, check if there's a custom layout for the current view
  const viewLayout = getViewSpecificLayout(initialNodes, edges, viewType);
  if (viewLayout) {
    return viewLayout;
  }

  // If no view-specific layout, use the standard layout algorithm
  switch (layoutType) {
    case 'hierarchical':
      return calculateHierarchicalLayout(initialNodes, edges);
    case 'force':
      return calculateForceLayout(initialNodes, edges);
    case 'circular':
      return calculateCircularLayout(initialNodes, edges);
    case 'grid':
      return calculateGridLayout(initialNodes, edges);
    default:
      return calculateHierarchicalLayout(initialNodes, edges);
  }
};
