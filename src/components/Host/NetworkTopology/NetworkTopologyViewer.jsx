import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import PropTypes from 'prop-types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import '@xyflow/react/dist/style.css';

// Import our custom components
import BandwidthEdge from './edges/BandwidthEdge';
import BidirectionalEdge from './edges/BidirectionalEdge';
import FloatingEdge from './edges/FloatingEdge';
import NetworkTopologyControls from './NetworkTopologyControls';
// Import node types
import AggregateNode from './nodes/AggregateNode';
import EtherstubNode from './nodes/EtherstubNode';
import PhysicalNicNode from './nodes/PhysicalNicNode';
import VnicNode from './nodes/VnicNode';
import ZoneNode from './nodes/ZoneNode';
// Import edge types
import TopologyViewSwitcher from './TopologyViewSwitcher';
// Import utilities
import { calculateLayout } from './utils/layoutCalculator';
import { autoMapTopology } from './utils/topologyAutoMapper';
import { applyViewTransformation } from './utils/viewTransformations';

// Define node types for React Flow
const nodeTypes = {
  physicalNic: PhysicalNicNode,
  aggregate: AggregateNode,
  etherstub: EtherstubNode,
  vnic: VnicNode,
  zone: ZoneNode,
};

// Define edge types for React Flow
const edgeTypes = {
  bandwidth: BandwidthEdge,
  bidirectional: BidirectionalEdge,
  floating: FloatingEdge,
};

const NetworkTopologyViewer = ({ networkData, onNodeClick, onEdgeClick }) => {
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // View state
  const [currentView, setCurrentView] = useState('physical');
  const [layoutType, setLayoutType] = useState('hierarchical');
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [edgeType, setEdgeType] = useState('floating');
  const [showMinimap, setShowMinimap] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    nodeTypes: {
      physicalNic: true,
      aggregate: true,
      etherstub: true,
      vnic: true,
      zone: true,
    },
    showIdleLinks: true,
    showUnattachedNodes: false, // Hide by default
    vlans: [],
    zones: [],
  });

  // Auto-map topology from existing network data
  const baseTopology = useMemo(() => {
    if (!networkData) {
      console.log('🔍 TOPOLOGY: No networkData provided');
      return { nodes: [], edges: [] };
    }

    console.log('🔍 TOPOLOGY: Full networkData received:', {
      networkInterfaces: networkData.networkInterfaces?.length || 0,
      aggregates: networkData.aggregates?.length || 0,
      etherstubs: networkData.etherstubs?.length || 0,
      vnics: networkData.vnics?.length || 0,
      zones: networkData.zones?.length || 0,
      networkUsage: networkData.networkUsage?.length || 0,
      ipAddresses: networkData.ipAddresses?.length || 0,
    });

    console.log('🔍 TOPOLOGY: Sample networkUsage data:', networkData.networkUsage?.slice(0, 3));
    console.log(
      '🔍 TOPOLOGY: Sample networkInterfaces data:',
      networkData.networkInterfaces?.slice(0, 3)
    );

    return autoMapTopology({
      interfaces: networkData.networkInterfaces || [],
      aggregates: networkData.aggregates || [],
      etherstubs: networkData.etherstubs || [],
      vnics: networkData.vnics || [],
      zones: networkData.zones || [],
      bandwidthData: networkData.networkUsage || [],
      ipAddresses: networkData.ipAddresses || [],
    });
  }, [networkData]);

  // Apply current view transformation and filters
  const viewTopology = useMemo(() => {
    if (!baseTopology.nodes.length) {
      return baseTopology;
    }

    const transformedTopology = applyViewTransformation(baseTopology, currentView, filters);

    // Convert edge types based on selected edge type
    const updatedEdges = transformedTopology.edges.map(edge => {
      // For React Flow built-in types, we need to preserve the bandwidth data but use simpler styling
      if (['default', 'straight', 'step', 'smoothstep'].includes(edgeType)) {
        const { bandwidth = {}, linkSpeed = 1000 } = edge.data || {};
        const currentMbps = bandwidth?.totalMbps || 0;
        const utilization = (currentMbps / linkSpeed) * 100;

        // Apply temperature gradient color to built-in edges
        let edgeColor = '#3b82f6'; // Default blue
        if (utilization > 0) {
          let hue;
          let saturation;
          let lightness;
          if (utilization <= 10) {
            hue = 240 - (utilization / 10) * 20;
            saturation = 85 + (utilization / 10) * 10;
            lightness = 55 + (utilization / 10) * 10;
          } else if (utilization <= 25) {
            const t = (utilization - 10) / 15;
            hue = 220 - t * 40;
            saturation = 95;
            lightness = 65 + t * 5;
          } else if (utilization <= 50) {
            const t = (utilization - 25) / 25;
            hue = 180 - t * 60;
            saturation = 95 - t * 15;
            lightness = 70;
          } else if (utilization <= 75) {
            const t = (utilization - 50) / 25;
            hue = 120 - t * 60;
            saturation = 80 + t * 15;
            lightness = 70 - t * 5;
          } else if (utilization <= 90) {
            const t = (utilization - 75) / 15;
            hue = 60 - t * 30;
            saturation = 95;
            lightness = 65 - t * 5;
          } else {
            const t = (utilization - 90) / 10;
            hue = 30 - t * 30;
            saturation = 95 + t * 5;
            lightness = 60 - t * 10;
          }
          edgeColor = `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
        }

        return {
          ...edge,
          type: edgeType,
          style: {
            ...edge.style,
            stroke: edgeColor,
            strokeWidth: Math.max(1, Math.min(8, 1 + utilization / 12.5)), // 1-8px based on utilization
            opacity: currentMbps > 0 ? 0.8 : 0.4,
            strokeDasharray: currentMbps > 0 ? 'none' : '5,5',
          },
          animated: currentMbps > 10, // Animate if significant traffic
        };
      }

      // For custom edge types, just change the type
      return {
        ...edge,
        type: edgeType,
      };
    });

    return {
      ...transformedTopology,
      edges: updatedEdges,
    };
  }, [baseTopology, currentView, filters, edgeType]);

  // Update React Flow nodes and edges when topology changes
  useEffect(() => {
    if (viewTopology.nodes.length > 0) {
      console.log('🔍 VIEWER: About to calculate layout for', viewTopology.nodes.length, 'nodes');
      console.log(
        '🔍 VIEWER: Input nodes:',
        viewTopology.nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
        }))
      );

      const layoutedTopology = calculateLayout(viewTopology, layoutType, currentView);

      console.log(
        '🔍 VIEWER: Layout calculated, result:',
        layoutedTopology.nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
        }))
      );

      // Debug: Log all edges to see what's being passed to React Flow
      console.log('🔍 VIEWER: Total edges being set:', layoutedTopology.edges.length);
      const zoneEdges = layoutedTopology.edges.filter(
        e => e.target.includes('--') || e.source.includes('--')
      );
      console.log(
        '🔍 VIEWER: Zone edges:',
        zoneEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          flowDirection: e.data?.flowDirection,
        }))
      );

      setNodes(layoutedTopology.nodes);
      setEdges(layoutedTopology.edges);
    } else {
      console.log('🔍 VIEWER: No nodes to layout');
    }
  }, [viewTopology, layoutType, currentView, setNodes, setEdges]);

  // Handle view changes
  const handleViewChange = useCallback(newView => {
    setCurrentView(newView);
  }, []);

  // Handle layout changes
  const handleLayoutChange = useCallback(newLayout => {
    setLayoutType(newLayout);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(newFilters => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  }, []);

  // Handle node selection
  const handleNodeClick = useCallback(
    node => {
      console.log('Node clicked:', node);
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Handle edge selection - show bandwidth chart
  const handleEdgeClick = useCallback(
    edge => {
      console.log('Edge clicked:', edge);

      // Get the interface names from the edge
      const sourceInterface = edge.data?.sourceInterface || edge.source;
      const targetInterface = edge.data?.targetInterface || edge.target;

      // Show bandwidth chart modal or panel
      // For now, just log the information - you can enhance this to show actual charts
      console.log('Show bandwidth chart for:', {
        sourceInterface,
        targetInterface,
        bandwidth: edge.data?.bandwidth,
        linkSpeed: edge.data?.linkSpeed,
        type: edge.data?.type,
      });

      // Call the parent handler if provided
      onEdgeClick?.(edge);
    },
    [onEdgeClick]
  );

  return (
    <div
      className={`${isFullscreen ? 'has-z-index-modal hw-topology-container-fullscreen' : 'hw-topology-container-normal'}`}
    >
      {/* Hide React Flow attribution and handles for floating edges */}
      <style>
        {`
        .react-flow__attribution {
          display: none !important;
        }
        ${
          edgeType === 'floating'
            ? `
        .react-flow__handle {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        `
            : ''
        }
      `}
      </style>

      {/* Header with View Switcher and Fullscreen Toggle */}
      <div
        className={`d-flex justify-content-between align-items-center mb-3 ${isFullscreen ? 'hw-topology-header-fullscreen' : 'hw-topology-header-normal'}`}
      >
        <div className="d-flex align-items-center gap-2">
          <TopologyViewSwitcher
            currentView={currentView}
            onViewChange={handleViewChange}
            layoutType={layoutType}
            onLayoutChange={handleLayoutChange}
          />
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group">
            <button
              type="button"
              className={`btn btn-sm ${showMinimap ? 'btn-info' : 'btn-light'}`}
              onClick={() => setShowMinimap(!showMinimap)}
              title={showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            >
              <i className="fas fa-map me-2" />
              <span>Minimap</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isFullscreen ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} me-2`} />
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters - Horizontal layout */}
      <div
        className={`mb-3 ${isFullscreen ? 'hw-topology-filters-fullscreen' : 'hw-topology-filters-normal'}`}
      >
        <NetworkTopologyControls
          filters={filters}
          onFilterChange={handleFilterChange}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          networkData={networkData}
          horizontal
          edgeType={edgeType}
          onEdgeTypeChange={setEdgeType}
        />
      </div>

      {/* Main Content Area - ReactFlow takes full width */}
      <div
        className={isFullscreen ? 'hw-topology-content-fullscreen' : 'hw-topology-content-normal'}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          fitView
          fitViewOptions={{ padding: 50 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition={null}
          connectionMode="loose"
          multiSelectionKeyCode={null}
        >
          <Background variant="dots" gap={20} size={1} />
          <Controls />
          {showMinimap && (
            <MiniMap
              nodeColor={node => {
                switch (node.type) {
                  case 'physicalNic':
                    return '#48c78e';
                  case 'aggregate':
                    return '#3273dc';
                  case 'etherstub':
                    return '#ffdd57';
                  case 'vnic':
                    return '#ff9f43';
                  case 'zone':
                    return '#f14668';
                  default:
                    return '#dbdbdb';
                }
              }}
              maskColor="rgba(255, 255, 255, 0.2)"
            />
          )}
        </ReactFlow>

        {/* Additional CSS to ensure attribution is hidden */}
        <style>
          {`
          .react-flow__attribution {
            display: none !important;
          }
        `}
        </style>
      </div>
    </div>
  );
};

NetworkTopologyViewer.propTypes = {
  networkData: PropTypes.shape({
    networkInterfaces: PropTypes.array,
    aggregates: PropTypes.array,
    etherstubs: PropTypes.array,
    vnics: PropTypes.array,
    zones: PropTypes.array,
    networkUsage: PropTypes.array,
    ipAddresses: PropTypes.array,
  }).isRequired,
  onNodeClick: PropTypes.func,
  onEdgeClick: PropTypes.func,
};

export default NetworkTopologyViewer;
