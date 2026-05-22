import express from 'express';
import { body } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import { validateRequest } from '../middleware/validateRequest.js';

import {registerUser, loginUser, logoutUser, deleteUserSelf, 
    isUsernameValid, isEmailValid, currentSession, listSessions,
    revokeSelectedSession, revokeOtherSessions, revokeAllUserSessions } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('sex').optional().isIn(['Male', 'Female', 'Other']).withMessage('Sex must be Male, Female, or Other'),
], validateRequest, registerUser);
router.post('/login', [
    body('identifier').notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], validateRequest, loginUser);
router.post('/logout', auth, logoutUser);
router.delete('/deleteUser', [auth, getCurrentUser], deleteUserSelf);
router.post('/user', body('username').notEmpty().withMessage('Username is required'), validateRequest, isUsernameValid);
router.post('/mail', body('email').isEmail().withMessage('Invalid email format'), validateRequest, isEmailValid);
router.post('/email', body('email').isEmail().withMessage('Invalid email format'), validateRequest, isEmailValid);
router.get('/current', auth, currentSession);
router.get('/sessions', auth, listSessions);
router.delete('/sessions/:sessionId', auth, revokeSelectedSession);
router.delete('/sessions', auth, revokeOtherSessions);
router.delete('/sessions-all', auth, revokeAllUserSessions);

export default router;
