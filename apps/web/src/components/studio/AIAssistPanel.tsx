/**
 * AI Assist Panel - Phase 4 Implementation
 * Chat interface for board assistance and prop suggestions
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { simulateDialog, suggestProps, getDialogHistory, type PropSuggestionsResponse } from '../../ai/agentBridge';

// =============================================================================
// TYPES
// =============================================================================

interface AIAssistPanelProps {
  boardId?: string;
  selectedFrameId?: string;
  selectedFrame?: {
    name: string;
    pattern: string;
    frameType: string;
    props: any;
  };
  boardName?: string;
  boardDescription?: string;
  onApplySuggestion?: (frameId: string, updates: Record<string, any>) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  propSuggestions?: PropSuggestionsResponse;
}

// =============================================================================
// COMPONENT
// =============================================================================

const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  boardId,
  selectedFrameId,
  selectedFrame,
  boardName,
  boardDescription,
  onApplySuggestion,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sample prompts for empty state
  const samplePrompts = [
    "Suggest a cover image idea for this board",
    "How can I improve the layout?",
    "What engagement pattern works best here?",
    "Help me organize these frames better"
  ];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load existing history when board/frame changes
  useEffect(() => {
    if (boardId) {
      const history = getDialogHistory(boardId, selectedFrameId);
      setMessages(history.map(h => ({
        id: h.id,
        type: 'assistant' as const,
        content: h.response,
        timestamp: h.timestamp,
        suggestions: h.suggestions
      })));
    }
  }, [boardId, selectedFrameId]);

  const handleSendMessage = async () => {
    if (!input.trim() || !boardId || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send to agent bridge
      const response = await simulateDialog({
        boardId,
        frameId: selectedFrameId,
        prompt: userMessage.content,
        context: {
          boardName,
          frameType: selectedFrame?.frameType,
          currentProps: selectedFrame?.props
        }
      });

      // Check if we should also get prop suggestions
      let propSuggestions: PropSuggestionsResponse | undefined;
      if (
        selectedFrame && 
        (userMessage.content.toLowerCase().includes('suggest') || 
         userMessage.content.toLowerCase().includes('improve') ||
         userMessage.content.toLowerCase().includes('help'))
      ) {
        try {
          propSuggestions = await suggestProps({
            frameType: selectedFrame.frameType,
            currentProps: selectedFrame.props,
            context: {
              boardName,
              boardDescription,
              pattern: selectedFrame.pattern
            }
          });
        } catch (error) {
          console.warn('Failed to get prop suggestions:', error);
        }
      }

      const assistantMessage: ChatMessage = {
        id: response.id,
        type: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        suggestions: response.suggestions,
        propSuggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (messageId: string, suggestions: Record<string, any>) => {
    if (!selectedFrameId || !onApplySuggestion) return;
    
    onApplySuggestion(selectedFrameId, suggestions);
    setAppliedSuggestions(prev => new Set([...prev, messageId]));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSamplePrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">Ask the Studio</h3>
        </div>
        {selectedFrame && (
          <div className="text-xs text-gray-500">
            {selectedFrame.name} • {selectedFrame.pattern}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <SparklesIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">AI Studio Assistant</h4>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              I can help you improve your board design, suggest content, and optimize layouts.
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">Try asking:</p>
              {samplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSamplePrompt(prompt)}
                  className="block w-full text-left p-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Message history
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-sm xl:max-w-md ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                } rounded-lg px-4 py-2 space-y-2`}>
                  {/* Message content */}
                  <div className="text-sm">
                    {message.content}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                  
                  {/* Text suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, index) => (
                        <div key={index} className="text-xs bg-white bg-opacity-20 rounded px-2 py-1">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Prop suggestions */}
                  {message.propSuggestions && Object.keys(message.propSuggestions.suggestions).length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-900">Suggested Changes</div>
                        <div className="text-xs text-gray-500">
                          {Math.round(message.propSuggestions.confidence * 100)}% confidence
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {message.propSuggestions.explanations.map((exp, index) => (
                          <div key={index} className="text-xs text-gray-700">
                            <strong>{exp.path}:</strong> {exp.reason}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => handleApplySuggestion(message.id, message.propSuggestions!.suggestions)}
                          disabled={appliedSuggestions.has(message.id)}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            appliedSuggestions.has(message.id)
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {appliedSuggestions.has(message.id) ? (
                            <span className="flex items-center space-x-1">
                              <CheckIcon className="w-3 h-3" />
                              <span>Applied</span>
                            </span>
                          ) : (
                            'Apply Suggestions'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
              <ArrowPathIcon className="w-4 h-4 text-gray-500 animate-spin" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your board design..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistPanel;
