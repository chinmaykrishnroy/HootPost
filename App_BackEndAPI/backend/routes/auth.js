import express from 'express';
import { body } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';

import {registerUser, loginUser, logoutUser, deleteUserSelf, 
    isUsernameValid, isEmailValid, currentSession } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('sex').optional().isIn(['Male', 'Female', 'Other']).withMessage('Sex must be Male, Female, or Other'),
], registerUser);
router.post('/login', loginUser);
router.post('/logout', auth, logoutUser);
router.delete('/deleteUser', [auth, getCurrentUser], deleteUserSelf);
router.post('/user', isUsernameValid);
router.post('/mail', isEmailValid);
router.get('/current', currentSession);

export default router;
