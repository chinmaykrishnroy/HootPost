import express from 'express';
import {getAllUsers, deleteAllUsers, deleteUser, deleteAllPosts,
     deleteLargeBuffers} from '../controllers/admin.js';

const router = express.Router();

router.post('/view-all', getAllUsers);
router.delete('/delete-all', deleteAllUsers);
router.delete('/deleteuser', deleteUser);
router.delete('/delete-large-buffers', deleteLargeBuffers);
router.delete('/delete-posts-all', deleteAllPosts);
export default router;