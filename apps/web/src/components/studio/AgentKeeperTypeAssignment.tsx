import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KipAgent } from '../../lib/kipApi';
import { keeperApi } from '../../lib/keeperApi';
import { KeeperType } from '../../types/keeper';
import {
  SparklesIcon,
  TagIcon,
  CpuChipIcon,
  PlusIcon,
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AgentKeeperTypeAssignmentProps {
  agent: KipAgent;
  onAssignmentsUpdated: (assignments: KeeperType[]) => void;
}

const AgentKeeperTypeAssignment: React.FC<AgentKeeperTypeAssignmentProps> = ({ 
  agent, 
  onAssignmentsUpdated 
}) => {
  const [keeperTypes, setKeeperTypes] = useState<KeeperType[]>([]);
  const [assignedTypes, setAssignedTypes] = useState<KeeperType[]>([]);
  const [availableTypes, setAvailableTypes] = useState<KeeperType[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKeeperTypes();
    loadAgentAssignments();
  }, [agent.id]);

  const loadKeeperTypes = async () => {
    try {
      const response = await keeperApi.getKeeperTypes();
      if (response.success && response.data) {
        setKeeperTypes(response.data);
      }
    } catch (err) {
      setError('Failed to load keeper types');
    }
  };

  const loadAgentAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/keeper/agents/${agent.id}/keeper-types`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setAssignedTypes(result.data);
        onAssignmentsUpdated(result.data);
      } else {
        setError(result.error || 'Failed to load agent assignments');
      }
    } catch (err) {
      setError('Failed to load agent assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Update available types when assignments change
    setAvailableTypes(keeperTypes.filter(type => 
      !assignedTypes.find(assigned => assigned.id === type.id)
    ));
  }, [keeperTypes, assignedTypes]);

  const handleAssignType = async (keeperType: KeeperType) => {
    try {
      setAssigning(true);
      const response = await fetch(`/api/keeper/agents/${agent.id}/keeper-types/${keeperType.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        const updatedAssignments = [...assignedTypes, keeperType];
        setAssignedTypes(updatedAssignments);
        onAssignmentsUpdated(updatedAssignments);
        setShowAssignDialog(false);
      } else {
        setError(result.error || 'Failed to assign keeper type');
      }
    } catch (err) {
      setError('Failed to assign keeper type');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignType = async (keeperType: KeeperType) => {
    try {
      setAssigning(true);
      const response = await fetch(`/api/keeper/agents/${agent.id}/keeper-types/${keeperType.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        const updatedAssignments = assignedTypes.filter(assigned => assigned.id !== keeperType.id);
        setAssignedTypes(updatedAssignments);
        onAssignmentsUpdated(updatedAssignments);
      } else {
        setError(result.error || 'Failed to unassign keeper type');
      }
    } catch (err) {
      setError('Failed to unassign keeper type');
    } finally {
      setAssigning(false);
    }
  };

  const getMemoryPatternIcon = (pattern?: string) => {
    switch (pattern) {
      case 'SOLE':
        return <SparklesIcon className="w-4 h-4" />;
      case 'CRMTimeline':
        return <TagIcon className="w-4 h-4" />;
      default:
        return <CpuChipIcon className="w-4 h-4" />;
    }
  };

  const getMemoryPatternColor = (pattern?: string) => {
    switch (pattern) {
      case 'SOLE':
        return 'bg-blue-100 text-blue-800';
      case 'CRMTimeline':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderKeeperTypeCard = (keeperType: KeeperType, isAssigned: boolean) => (
    <div
      key={keeperType.id}
      className={`border rounded-lg p-4 transition-all ${
        isAssigned 
          ? 'border-green-200 bg-green-50' 
          : 'border-border hover:border-muted-foreground'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getMemoryPatternIcon(keeperType.memoryPattern)}
            <h4 className="font-medium text-foreground">{keeperType.name}</h4>
            {isAssigned && (
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            {keeperType.memoryPattern && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMemoryPatternColor(keeperType.memoryPattern)}`}>
                {keeperType.memoryPattern}
              </span>
            )}
            
            {keeperType.system && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                System
              </span>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground mb-3">
                         <div className="flex items-center gap-1">
               <span>Templates:</span>
               <span className="font-medium">{(keeperType._count as any)?.engagement_templates || 0}</span>
             </div>
            <div className="flex items-center gap-1">
              <span>Active Keepers:</span>
              <span className="font-medium">{keeperType._count?.Keeper || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAssigned ? (
            <button
              onClick={() => handleUnassignType(keeperType)}
              disabled={assigning}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleAssignType(keeperType)}
              disabled={assigning}
              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Loading keeper types...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Assigned Keeper Types</h3>
          <p className="text-sm text-muted-foreground">
            Manage which keeper types this agent can work with
          </p>
        </div>
        <button
          onClick={() => setShowAssignDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Assign New
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Assigned Types */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Currently Assigned ({assignedTypes.length})</h4>
        
        {assignedTypes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {assignedTypes.map(keeperType => renderKeeperTypeCard(keeperType, true))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg">
            <SparklesIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No keeper types assigned yet. Click "Assign New" to get started.
            </p>
          </div>
        )}
      </div>

      {/* Assignment Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Assign Keeper Type</h3>
                <p className="text-sm text-muted-foreground">
                  Select keeper types to assign to {agent.name}
                </p>
              </div>
              <button
                onClick={() => setShowAssignDialog(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Available Types */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Available Keeper Types ({availableTypes.length})</h4>
              
              {availableTypes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableTypes.map(keeperType => renderKeeperTypeCard(keeperType, false))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <InformationCircleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    All available keeper types have been assigned to this agent.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-border">
              <button
                onClick={() => setShowAssignDialog(false)}
                className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AgentKeeperTypeAssignment; 