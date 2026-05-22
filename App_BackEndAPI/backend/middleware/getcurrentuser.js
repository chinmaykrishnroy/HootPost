import User from '../models/User.js';

export const getCurrentUser = async (req, res, next) => {
    if (req.currentUser?.username) return next();
    const userId = req.currentUser?._id;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
        return res.status(404).send('Current user not found');
    }

    req.currentUser = currentUser;
    next();
};

