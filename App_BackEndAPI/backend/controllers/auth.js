import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import User from "../models/User.js";
import Post from '../models/Post.js';
import Chat from '../models/Chat.js';

export const registerUser = async (req, res) => {
  const { username, email, password, firstName, lastName, age, sex, bio } =
    req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({error: "Username already exists!"});

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({email_error: "Email already exists!"});

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      age,
      sex,
      bio,
    });

    await newUser.save();
    res.status(201).json({success: "Registration successful!"});
  } catch (err) {
    res.status(400).json({error: err.message});
  }
};
export const loginUser = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) return res.status(400).json({ error: "User not found!" });
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ error: "Wrong Password!" });
    const token = jwt.sign({ _id: user._id }, config.jwtSecret, {
      expiresIn: "30d",
    });
    if (user.currentSessionId && user.currentSessionId !== token) {
      req.io.to(user.currentSessionId).emit('user_logged_out', { userId: user._id });

    }
    await User.updateOne({ _id: user._id }, { currentSessionId: token });
    res.cookie("session_id", token, {
      httpOnly: true,
      secure: config.secure === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    req.io.emit('user_logged_in', { userId: user._id, username: user.username });
    res.status(201).json({ success: "Log in successful!", 
      userId: user._id, 
      username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const logoutUser = async (req, res) => {
  const userId = req.currentUser._id;
  const sessionId = req.cookies['session_id'];
  const user = await User.findById(userId);
  if (!user || user.currentSessionId !== sessionId) {
      return res.status(401).json({ error: "You are not authorized to log out from this session." });
  }
  await User.updateOne({ _id: userId }, { currentSessionId: null });
  res.clearCookie("session_id");
  res.status(201).json({ success: "Log out successful!" });
};
export const deleteUserSelf = async (req, res) => {
  const { password } = req.body;
  try {
    const user = req.currentUser;
    if (!user) return res.status(400).json({ error: "User not found!" });
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Invalid Password!" });
    await Post.deleteMany({ userId: user._id });
    const chats = await Chat.find().lean();
    for (const chat of chats) {
      const allDeleted = chat.participants.every(participant => 
        participant.toString() === user._id.toString() || 
        !user.chats.includes(participant)
      );
      if (allDeleted) {
        await Chat.deleteOne({ _id: chat._id });
      }
    }
    await User.deleteOne({ _id: user._id });
    res.status(201).json({ success: "User deleted successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
export const isUsernameValid = async (req, res) => {
  const { username } = req.body;
  const existingUser = await User.findOne({ username });
  return existingUser ? res.status(400).send() : res.status(200).send();
};
export const isEmailValid = async (req, res) => {
  const { email } = req.body;
  const existingEmail = await User.findOne({ email });
  return existingEmail ? res.status(400).send() : res.status(200).send();
};
export const currentSession = async (req, res) => {
  const sessionId = req.cookies['session_id'];
  if (!sessionId) {
    return res.status(401).json({ error: "No session found." });
  }
  try {
    const user = await User.findOne({ currentSessionId: sessionId });
    if (!user) {
      return res.status(401).json({ error: "Invalid session." });
    }
    return res.status(200).json({
      user_id: user._id,
      username: user.username,
      // session: user.currentSessionId
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error." });
  }
};
