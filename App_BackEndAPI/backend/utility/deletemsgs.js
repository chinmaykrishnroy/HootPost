import cron from "node-cron";
import Chat from "../models/Chat.js";

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const chats = await Chat.find({
      "messages.expires": { $lte: now },
    });
    for (let chat of chats) {
      chat.messages = chat.messages.filter(
        (message) => !message.expires || message.expires > now
      );
      await chat.save();
    }
    const chatsToClear = await Chat.find({
      chatDeleteAt: { $lte: now },
    });
    for (let chat of chatsToClear) {
      chat.messages = [];
      await chat.save();
    }
  } catch (err) {
    console.error("Error deleting expired messages:", err);
  }
});
