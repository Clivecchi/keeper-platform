import express from 'express';
import {
  getAllKeepers,
  getKeeperById,
  createKeeper,
  updateKeeper,
  deleteKeeper,
  getKeeperTypes,
  createKeeperType,
  getEngagementTemplatesByType,
  getEngagementTemplatesByKeeperType,
  assignEngagementTemplate,
  proposeSoleDraft,
  approveSoleDraft,
  rejectSoleDraft,
  getAgentKeeperTypes,
  assignKeeperTypeToAgent,
  unassignKeeperTypeFromAgent
} from './keepers';

// Import SOLE API functions
import {
  getReflectionsByKeeper,
  getSuggestedPromotions,
  createReflection,
  updateReflection,
  deleteReflection,
  promoteReflectionToMemoryCard
} from './sole-reflections';

import {
  getMemoryCardsByKeeper,
  getMemoryCardsByTopic,
  getEmbeddingStatus,
  updateMemoryCard,
  deleteMemoryCard,
  generateEmbeddings,
  searchMemoryCards
} from './sole-memory-cards';

import {
  getVoiceEntriesByKeeper,
  createVoiceEntry,
  updateVoiceEntry,
  deleteVoiceEntry
} from './sole-voice-panel';

import {
  getEchoesByKeeper,
  getTriggeredEchoes,
  createEcho,
  updateEcho,
  deliverEcho,
  deleteEcho
} from './sole-echo-writer';

import {
  getLogbookEntriesByKeeper,
  getCategoriesByKeeper,
  getTagsByKeeper,
  createLogbookEntry,
  updateLogbookEntry,
  deleteLogbookEntry
} from './sole-identity-logbook';

const router = express.Router();

// Keeper routes
router.get('/keepers', getAllKeepers);
router.get('/keepers/:id', getKeeperById);
router.post('/keepers', createKeeper);
router.put('/keepers/:id', updateKeeper);
router.delete('/keepers/:id', deleteKeeper);

// Keeper types routes
router.get('/keeper-types', getKeeperTypes);
router.post('/keeper-types', createKeeperType);

// Engagement templates routes
router.get('/engagement-templates/:keeperType', getEngagementTemplatesByType);
router.get('/keeper-types/:keeperTypeId/engagement-templates', getEngagementTemplatesByKeeperType);
router.post('/keepers/:keeperId/engagement-templates/:templateId', assignEngagementTemplate);

// SOLE Memory routes
router.post('/keepers/:id/sole/propose', proposeSoleDraft);
router.post('/keepers/:id/sole/approve', approveSoleDraft);
router.post('/keepers/:id/sole/reject', rejectSoleDraft);

// SOLE Reflections routes
router.get('/keepers/:keeperId/reflections', getReflectionsByKeeper);
router.get('/keepers/:keeperId/reflections/suggestions', getSuggestedPromotions);
router.post('/keepers/:keeperId/reflections', createReflection);
router.put('/reflections/:id', updateReflection);
router.delete('/reflections/:id', deleteReflection);
router.post('/reflections/:id/promote', promoteReflectionToMemoryCard);

// SOLE Memory Cards routes
router.get('/keepers/:keeperId/memory-cards', getMemoryCardsByKeeper);
router.get('/keepers/:keeperId/memory-cards/by-topic', getMemoryCardsByTopic);
router.get('/keepers/:keeperId/memory-cards/embedding-status', getEmbeddingStatus);
router.put('/memory-cards/:id', updateMemoryCard);
router.delete('/memory-cards/:id', deleteMemoryCard);
router.post('/keepers/:keeperId/memory-cards/generate-embeddings', generateEmbeddings);
router.get('/keepers/:keeperId/memory-cards/search', searchMemoryCards);

// Agent ↔ KeeperType assignment routes
router.get('/agents/:agentId/keeper-types', getAgentKeeperTypes);
router.post('/agents/:agentId/keeper-types/:keeperTypeId', assignKeeperTypeToAgent);
router.delete('/agents/:agentId/keeper-types/:keeperTypeId', unassignKeeperTypeFromAgent);

// SOLE Voice Panel routes
router.get('/keepers/:keeperId/voice-entries', getVoiceEntriesByKeeper);
router.post('/keepers/:keeperId/voice-entries', createVoiceEntry);
router.put('/voice-entries/:id', updateVoiceEntry);
router.delete('/voice-entries/:id', deleteVoiceEntry);

// SOLE Echo Writer routes
router.get('/keepers/:keeperId/echoes', getEchoesByKeeper);
router.get('/keepers/:keeperId/echoes/triggered', getTriggeredEchoes);
router.post('/keepers/:keeperId/echoes', createEcho);
router.put('/echoes/:id', updateEcho);
router.post('/echoes/:id/deliver', deliverEcho);
router.delete('/echoes/:id', deleteEcho);

// SOLE Identity Logbook routes
router.get('/keepers/:keeperId/logbook-entries', getLogbookEntriesByKeeper);
router.get('/keepers/:keeperId/logbook-entries/categories', getCategoriesByKeeper);
router.get('/keepers/:keeperId/logbook-entries/tags', getTagsByKeeper);
router.post('/keepers/:keeperId/logbook-entries', createLogbookEntry);
router.put('/logbook-entries/:id', updateLogbookEntry);
router.delete('/logbook-entries/:id', deleteLogbookEntry);

export default router; 