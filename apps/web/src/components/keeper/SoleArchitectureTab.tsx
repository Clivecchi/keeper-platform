import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckIcon, 
  XMarkIcon, 
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { Keeper } from '../../types/keeper';

interface SoleArchitectureTabProps {
  keeper: Keeper;
  userId: string;
  onUpdate: (updatedKeeper: Keeper) => void;
}

const SoleArchitectureTab: React.FC<SoleArchitectureTabProps> = ({
  keeper,
  userId,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedJson, setExpandedJson] = useState(false);

  const isSOLEKeeper = keeper.memoryPattern === 'SOLE' || keeper.KeeperType?.memoryPattern === 'SOLE';

  const handleApproveDraft = async () => {
    if (!keeper.soleDraft) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/keeper/${keeper.id}/sole/approve?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        onUpdate(result.data);
      } else {
        setError(result.error || 'Failed to approve SOLE draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve SOLE draft');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDraft = async () => {
    if (!keeper.soleDraft) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/keeper/${keeper.id}/sole/reject?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        onUpdate(result.data);
      } else {
        setError(result.error || 'Failed to reject SOLE draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject SOLE draft');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExplanation = () => {
    // This would trigger a conversation with the agent to explain the draft
    console.log('Request explanation for SOLE draft');
    // Implementation would depend on how agent conversations are handled
  };

  const formatJsonDisplay = (jsonData: unknown) => {
    if (!jsonData) return 'No data';
    try {
      return JSON.stringify(jsonData, null, 2);
    } catch {
      return 'Invalid JSON data';
    }
  };

  if (!isSOLEKeeper) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <InformationCircleIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            SOLE Memory Pattern Not Active
          </h3>
          <p className="text-muted-foreground">
            This keeper does not use the SOLE (Self-Organizing Learning Environment) memory pattern.
            Only keepers with SOLE memory pattern can use expressive memory architecture.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Current SOLE Architecture */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Current SOLE Architecture
          </h3>
          <button
            onClick={() => setExpandedJson(!expandedJson)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <CodeBracketIcon className="w-5 h-5" />
          </button>
        </div>

        {keeper.sole ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-foreground">{keeper.sole.type || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Author</label>
                  <p className="text-foreground">{keeper.sole.author || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Content</label>
                  <p className="text-foreground mt-1">{keeper.sole.content || 'No content'}</p>
                </div>
                {keeper.sole.timestamp && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="text-foreground">{new Date(keeper.sole.timestamp).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {expandedJson && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Raw JSON</h4>
                <pre className="text-xs text-foreground bg-background rounded p-3 overflow-x-auto">
                  {formatJsonDisplay(keeper.sole)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <InformationCircleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No SOLE architecture defined yet. The agent will create one during initialization.
            </p>
          </div>
        )}
      </motion.div>

      {/* Pending Draft */}
      {keeper.soleDraft && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-amber-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Pending SOLE Draft
            </h3>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              Awaiting Review
            </span>
          </div>

          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-foreground">{keeper.soleDraft.type || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Author</label>
                  <p className="text-foreground">{keeper.soleDraft.author || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Content</label>
                  <p className="text-foreground mt-1">{keeper.soleDraft.content || 'No content'}</p>
                </div>
                {keeper.soleSubmittedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Submitted At</label>
                    <p className="text-foreground">{new Date(keeper.soleSubmittedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApproveDraft}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                {loading ? 'Approving...' : 'Approve'}
              </button>
              
              <button
                onClick={handleRejectDraft}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4 mr-2" />
                {loading ? 'Rejecting...' : 'Reject'}
              </button>
              
              <button
                onClick={handleRequestExplanation}
                className="inline-flex items-center px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                Request Explanation
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* SOLE Memory Pattern Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">
          About SOLE Memory Pattern
        </h3>
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground">
            SOLE (Self-Organizing Learning Environment) allows agents to propose and evolve their own memory architecture.
            The agent can submit drafts of new memory structures for human review and approval.
          </p>
          <ul className="text-muted-foreground mt-4 space-y-2">
            <li>• Agents can propose new memory architectures via the soleDraft field</li>
            <li>• Human administrators review and approve/reject proposals</li>
            <li>• Approved architectures become the new active SOLE structure</li>
            <li>• This enables co-creative memory design between human and AI</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default SoleArchitectureTab; 