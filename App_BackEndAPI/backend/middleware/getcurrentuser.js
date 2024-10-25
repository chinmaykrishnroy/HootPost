import User from '../models/User.js';

export const getCurrentUser = async (req, res, next) => {

    const userId = req.currentUser?._id; // Access _id from req.currentUser instead

    if (!userId) {
        return res.status(401).send('User not authenticated');
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
        return res.status(404).send('Current user not found');
    }

    req.currentUser = currentUser; // This line is already correct
    next();
};

