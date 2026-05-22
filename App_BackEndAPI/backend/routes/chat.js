import express from 'express';
import { body, param } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import { isConnected } from '../middleware/isconnected.js';
import { attachmentUpload } from '../middleware/upload.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {startChat, loadChat, deleteChat, sendMessage, getRecentMessage, loadAllMessages, 
    deleteMessage, updateMessage, clearAllMessages, searchMessage, 
    listChats, markChatRead } from '../controllers/chat.js';

const router = express.Router({ mergeParams: true });

router.get('/conversations', [auth, getCurrentUser], listChats);
router.post('/conversations/:chatId/read', [auth, getCurrentUser, param('chatId').isMongoId(), validateRequest], markChatRead);
router.post('/:username/start', [auth, getCurrentUser, isConnected], startChat);
router.get('/:username/load', [auth, getCurrentUser, isConnected], loadChat);
router.delete('/:username/delete', [auth, getCurrentUser, isConnected], deleteChat);
router.post('/:username/send', [
  auth,
  getCurrentUser,
  isConnected,
  attachmentUpload.single('file'),
  body('content').optional().isLength({ max: 4000 }).withMessage('Message cannot exceed 4000 characters'),
  validateRequest,
], sendMessage);
router.get('/:username/recentMessage', [auth, getCurrentUser, isConnected], getRecentMessage);
router.get('/:username/messages', [auth, getCurrentUser, isConnected], loadAllMessages);
router.delete('/:username/message/:messageId', [auth, getCurrentUser, isConnected, param('messageId').isMongoId(), validateRequest], deleteMessage);
router.put('/:username/message/:messageId', [
  auth,
  getCurrentUser,
  isConnected,
  param('messageId').isMongoId(),
  body('content').notEmpty().isLength({ max: 4000 }).withMessage('Message cannot exceed 4000 characters'),
  validateRequest,
], updateMessage);
router.delete('/:username/clearMessages', [auth, getCurrentUser, isConnected], clearAllMessages);
router.get('/:username/searchMessages', [auth, getCurrentUser, isConnected], searchMessage);

export default router;
