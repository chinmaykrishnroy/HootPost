import express from 'express';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import { isConnected } from '../middleware/isconnected.js';
import upload from '../middleware/upload.js';
import {startChat, loadChat, deleteChat, sendMessage, getRecentMessage, loadAllMessages, 
    deleteMessage, updateMessage, clearAllMessages, searchMessage, 
    loadHTMLmessages } from '../controllers/chat.js';

const router = express.Router({ mergeParams: true });

router.post('/:username/start', [auth, getCurrentUser, isConnected], startChat);
router.get('/:username/load', [auth, getCurrentUser, isConnected], loadChat);
router.delete('/:username/delete', [auth, getCurrentUser, isConnected], deleteChat);
router.post('/:username/send', [auth, getCurrentUser, isConnected, upload.single('file')], sendMessage);
router.get('/:username/recentMessage', [auth, getCurrentUser, isConnected], getRecentMessage);
router.get('/:username/messages', [auth, getCurrentUser, isConnected], loadAllMessages);
router.delete('/:username/message/:messageId', [auth, getCurrentUser, isConnected], deleteMessage);
router.put('/:username/message/:messageId', [auth, getCurrentUser, isConnected], updateMessage);
router.delete('/:username/clearMessages', [auth, getCurrentUser, isConnected], clearAllMessages);
router.get('/:username/searchMessages', [auth, getCurrentUser, isConnected], searchMessage);
router.get('/:username/messages/html', [auth, getCurrentUser, isConnected], loadHTMLmessages);

export default router;
