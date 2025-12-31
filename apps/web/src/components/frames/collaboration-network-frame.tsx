/**
 * Collaboration Network Frame
 * ============================
 * 
 * Media card frame component for visualizing collaboration networks.
 * Shows interactive graph of people, domains, and journeys with connections.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShareIcon,
  UserGroupIcon,
  MapIcon,
  GlobeAltIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface NetworkNode {
  id: string;
  type: 'person' | 'domain' | 'journey';
  name: string;
  x: number;
  y: number;
  connections: string[];
  metadata: {
    avatar?: string;
    role?: string;
    status?: string;
    memberCount?: number;
    pathCount?: number;
  };
}

interface NetworkConnection {
  source: string;
  target: string;
  strength: number;
  type: 'member' | 'collaborator' | 'owner' | 'contributor';
}

const CollaborationNetworkFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'person' | 'domain' | 'journey'>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Mock network data
  const [nodes] = useState<NetworkNode[]>([
    {
      id: 'alice',
      type: 'person',
      name: 'Alice Johnson',
      x: 200,
      y: 150,
      connections: ['tech-domain', 'react-journey', 'team-journey'],
      metadata: {
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        role: 'owner',
        status: 'active'
      }
    },
    {
      id: 'bob',
      type: 'person',
      name: 'Bob Smith',
      x: 350,
      y: 100,
      connections: ['tech-domain', 'node-journey'],
      metadata: {
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        role: 'admin',
        status: 'active'
      }
    },
    {
      id: 'carol',
      type: 'person',
      name: 'Carol Williams',
      x: 100,
      y: 250,
      connections: ['marketing-domain'],
      metadata: {
        role: 'member',
        status: 'pending'
      }
    },
    {
      id: 'david',
      type: 'person',
      name: 'David Brown',
      x: 400,
      y: 250,
      connections: ['tech-domain', 'design-domain', 'react-journey'],
      metadata: {
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        role: 'member',
        status: 'active'
      }
    },
    {
      id: 'tech-domain',
      type: 'domain',
      name: 'Tech Domain',
      x: 300,
      y: 50,
      connections: ['alice', 'bob', 'david'],
      metadata: {
        memberCount: 15,
        status: 'active'
      }
    },
    {
      id: 'marketing-domain',
      type: 'domain',
      name: 'Marketing Domain',
      x: 50,
      y: 200,
      connections: ['carol', 'alice'],
      metadata: {
        memberCount: 8,
        status: 'active'
      }
    },
    {
      id: 'design-domain',
      type: 'domain',
      name: 'Design Domain',
      x: 450,
      y: 200,
      connections: ['david'],
      metadata: {
        memberCount: 5,
        status: 'active'
      }
    },
    {
      id: 'react-journey',
      type: 'journey',
      name: 'React Development',
      x: 250,
      y: 300,
      connections: ['alice', 'david'],
      metadata: {
        pathCount: 8,
        status: 'active'
      }
    },
    {
      id: 'node-journey',
      type: 'journey',
      name: 'Node.js Backend',
      x: 400,
      y: 350,
      connections: ['bob'],
      metadata: {
        pathCount: 6,
        status: 'active'
      }
    },
    {
      id: 'team-journey',
      type: 'journey',
      name: 'Team Leadership',
      x: 150,
      y: 350,
      connections: ['alice'],
      metadata: {
        pathCount: 4,
        status: 'active'
      }
    }
  ]);

  const [connections] = useState<NetworkConnection[]>([
    { source: 'alice', target: 'tech-domain', strength: 1, type: 'owner' },
    { source: 'alice', target: 'marketing-domain', strength: 0.8, type: 'member' },
    { source: 'alice', target: 'react-journey', strength: 1, type: 'owner' },
    { source: 'alice', target: 'team-journey', strength: 1, type: 'owner' },
    { source: 'bob', target: 'tech-domain', strength: 0.9, type: 'member' },
    { source: 'bob', target: 'node-journey', strength: 1, type: 'owner' },
    { source: 'carol', target: 'marketing-domain', strength: 0.7, type: 'member' },
    { source: 'david', target: 'tech-domain', strength: 0.8, type: 'member' },
    { source: 'david', target: 'design-domain', strength: 0.9, type: 'member' },
    { source: 'david', target: 'react-journey', strength: 0.7, type: 'collaborator' }
  ]);

  const getNodeColor = (node: NetworkNode) => {
    switch (node.type) {
      case 'person':
        return node.metadata.status === 'active' ? '#6366F1' : '#9CA3AF';
      case 'domain':
        return '#10B981';
      case 'journey':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getNodeIcon = (node: NetworkNode) => {
    switch (node.type) {
      case 'person':
        return <UserGroupIcon className="w-4 h-4" />;
      case 'domain':
        return <GlobeAltIcon className="w-4 h-4" />;
      case 'journey':
        return <MapIcon className="w-4 h-4" />;
      default:
        return <ShareIcon className="w-4 h-4" />;
    }
  };

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
    
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { 
        action: 'node_select', 
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.name 
      },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleNetworkAction = (action: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const filteredNodes = nodes.filter(node => 
    filterType === 'all' || node.type === filterType
  );

  const filteredConnections = connections.filter(conn => {
    const sourceNode = nodes.find(n => n.id === conn.source);
    const targetNode = nodes.find(n => n.id === conn.target);
    return filteredNodes.includes(sourceNode!) && filteredNodes.includes(targetNode!);
  });

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ShareIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">Collaboration Network</h3>
        </div>
        <p className="text-sm text-gray-600">
          Visual network of people, domains, and journeys with interactive connections.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ShareIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-medium text-gray-900">Collaboration Network</h3>
            <span className="text-sm text-gray-500">({nodes.length} nodes)</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
              className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
            >
              <ArrowsPointingInIcon className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
              className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Nodes</option>
              <option value="person">People Only</option>
              <option value="domain">Domains Only</option>
              <option value="journey">Journeys Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              <span>People</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Domains</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Journeys</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Visualization */}
      <div className="relative h-96 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
        >
          {/* Connections */}
          <g>
            {filteredConnections.map((connection, index) => {
              const sourceNode = nodes.find(n => n.id === connection.source);
              const targetNode = nodes.find(n => n.id === connection.target);
              if (!sourceNode || !targetNode) return null;

              return (
                <motion.line
                  key={`${connection.source}-${connection.target}`}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="#E5E7EB"
                  strokeWidth={connection.strength * 2}
                  strokeOpacity={0.6}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {filteredNodes.map((node, index) => (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(node)}
              >
                {/* Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={selectedNode?.id === node.id ? 25 : 20}
                  fill={getNodeColor(node)}
                  stroke={selectedNode?.id === node.id ? '#4F46E5' : '#FFFFFF'}
                  strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                  className="transition-all duration-200"
                />
                
                {/* Node Icon */}
                <foreignObject
                  x={node.x - 8}
                  y={node.y - 8}
                  width={16}
                  height={16}
                  className="pointer-events-none"
                >
                  <div className="text-white flex items-center justify-center w-full h-full">
                    {getNodeIcon(node)}
                  </div>
                </foreignObject>

                {/* Node Label */}
                <text
                  x={node.x}
                  y={node.y + 35}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                  className="font-medium pointer-events-none"
                >
                  {node.name.length > 12 ? `${node.name.substring(0, 12)}...` : node.name}
                </text>
              </motion.g>
            ))}
          </g>
        </svg>

        {/* Node Details Overlay */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getNodeColor(selectedNode) }}
                  />
                  <h4 className="font-medium text-gray-900">{selectedNode.name}</h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="capitalize">{selectedNode.type}</span>
                </div>
                
                {selectedNode.metadata.role && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Role:</span>
                    <span className="capitalize">{selectedNode.metadata.role}</span>
                  </div>
                )}
                
                {selectedNode.metadata.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="capitalize">{selectedNode.metadata.status}</span>
                  </div>
                )}
                
                {selectedNode.metadata.memberCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Members:</span>
                    <span>{selectedNode.metadata.memberCount}</span>
                  </div>
                )}
                
                {selectedNode.metadata.pathCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paths:</span>
                    <span>{selectedNode.metadata.pathCount}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Connections:</span>
                  <span>{selectedNode.connections.length}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleNetworkAction('node_view', { nodeId: selectedNode.id })}
                  className="w-full inline-flex items-center justify-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {filteredNodes.length} of {nodes.length} nodes • {filteredConnections.length} connections
          </span>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleNetworkAction('network_export')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Export Network
            </button>
            <button
              onClick={() => handleNetworkAction('network_analyze')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Analyze Connections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationNetworkFrame;
