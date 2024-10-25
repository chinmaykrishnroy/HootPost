import { detectFileType, handleError } from "../utility/fileutils.js";
import Chat from "../models/Chat.js";

export const startChat = async (req, res) => {
  const currentUser = req.currentUser;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (chat) {
      return res
        .status(400)
        .send("Chat already started. Load existing chat instead.");
    }

    chat = new Chat({
      participants: [currentUser._id, req.targetUser._id],
      messages: [], // Initialize with an empty messages array
      chatDeleteAt: null, // Optional initial value, can be set later if needed
    });

    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};
export const loadChat = async (req, res) => {
  const currentUser = req.currentUser;

  try {
    const chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    }).populate("messages.sender", "username"); // Populate sender's username

    // If chat does not exist
    if (!chat) {
      return res.status(404).send("Chat not found. Please start a new chat.");
    }

    res.json({
      participants: chat.participants,
      messages: chat.messages, // Load all messages in the chat
      chatDeleteAt: chat.chatDeleteAt, // Optional, if needed
      createdAt: chat.createdAt, // Optional, if needed
      updatedAt: chat.updatedAt, // Optional, if needed
    });
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};
export const deleteChat = async (req, res) => {
  const currentUser = req.currentUser;

  try {
    const chat = await Chat.findOneAndDelete({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat) {
      return res.status(404).send("Chat not found.");
    }

    res.status(200).send("Chat deleted successfully.");
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};
export const sendMessage = async (req, res) => {
  const { username } = req.params;
  const { content, private: isPrivate = false, expires } = req.body;
  const currentUser = req.currentUser;

  try {
    if (!content?.trim() && !req.file) {
      return res.status(400).send("Message content or file must be provided.");
    }

    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat) {
      return res.status(404).send("Chat not found. Start a chat first.");
    }

    let fileBuffer = null;
    let fileType = null;

    if (req.file) {
      fileBuffer = req.file.buffer;

      try {
        fileType = await detectFileType(fileBuffer);
      } catch (error) {
        return handleError(res, error);
      }
    }

    const message = {
      sender: currentUser._id,
      content: content?.trim() || "",
      file: fileBuffer,
      fileType: fileType || "",
      private: isPrivate,
      seen: false,
      createdAt: Date.now(),
      expires: isPrivate
        ? expires
          ? new Date(Date.now() + expires * 1 * 60 * 1000) // Custom expiry in hours
          : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Default 1 day expiry
        : null,
    };

    chat.messages.push(message);

    await chat.save();

    const sentMessage = chat.messages[chat.messages.length - 1];
    res.status(201).json(sentMessage);
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};
export const getRecentMessage = async (req, res) => {
  const { username } = req.params;
  const currentUser = req.currentUser;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat || chat.messages.length === 0) {
      return res.status(404).send("No messages found in the chat.");
    }

    const recentMessage = chat.messages[chat.messages.length - 1];

    res.status(200).json(recentMessage);
  } catch (err) {
    handleError(res, err);
  }
};
export const loadAllMessages = async (req, res) => {
  const { username, messageId } = req.params;
  const currentUser = req.currentUser;

  try {
    const chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    })
      .select("messages")
      .populate("messages.sender", "username");

    if (!chat) {
      return res.status(404).send("Chat not found.");
    }
    res.status(200).json(chat.messages);
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};
export const deleteMessage = async (req, res) => {
  const { username, messageId } = req.params;
  const currentUser = req.currentUser;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat) {
      return res.status(404).send("Chat not found.");
    }

    const messageIndex = chat.messages.findIndex(
      (msg) => msg._id.toString() === messageId
    );
    if (messageIndex === -1) {
      return res.status(404).send("Message 1 not found.");
    }

    chat.messages.splice(messageIndex, 1);
    await chat.save();

    res.status(200).send("Message deleted successfully.");
  } catch (err) {
    handleError(res, err);
  }
};
export const updateMessage = async (req, res) => {
  const { username, messageId } = req.params;
  const currentUser = req.currentUser;
  const { content, file } = req.body;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat) {
      return res.status(404).send("Chat not found.");
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).send("Message 2 not found.");
    }

    if (content) {
      message.content = content.trim();
    }

    if (file) {
      message.file = file;
      message.fileType = await detectFileType(file);
    }

    await chat.save();

    res.status(200).json(message);
  } catch (err) {
    handleError(res, err);
  }
};
export const clearAllMessages = async (req, res) => {
  const { username } = req.params;
  const currentUser = req.currentUser;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat) {
      return res.status(404).send("Chat not found.");
    }

    chat.messages = [];
    await chat.save();

    res.status(200).send("All messages cleared.");
  } catch (err) {
    handleError(res, err);
  }
};
export const searchMessage = async (req, res) => {
  const { username } = req.params;
  const currentUser = req.currentUser;
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).send("Search query cannot be empty.");
  }

  const searchTerms = query.trim().split(/\s+/); // Split the query into individual search terms

  try {
    // Find chat based on participants
    let chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    });

    if (!chat) {
      return res.status(404).send("Chat not found."); // If no chat found
    }

    const matchingMessages = chat.messages.filter((message) => {
      if (!message.content) return false; // Skip messages with no content
      const messageWords = message.content.trim().split(/\s+/); // Split message content by spaces
      // Check if any search term matches any word in the message content
      return searchTerms.some((term) => messageWords.includes(term));
    });

    const sortedMessages = matchingMessages.sort((a, b) => {
      const aMatchCount = searchTerms.filter((term) =>
        a.content.trim().split(/\s+/).includes(term)
      ).length;
      const bMatchCount = searchTerms.filter((term) =>
        b.content.trim().split(/\s+/).includes(term)
      ).length;
      return bMatchCount - aMatchCount;
    });

    const resultMessages = sortedMessages.map(({ file, ...rest }) => rest);
    res.json(resultMessages);
  } catch (err) {
    handleError(res, err);
  }
};
export const loadHTMLmessages = async (req, res) => {
  const { username } = req.params;
  const currentUser = req.currentUser;

  try {
    // Find the chat based on participants
    const chat = await Chat.findOne({
      participants: { $all: [currentUser._id, req.targetUser._id] },
    }).populate("messages.sender", "username");

    if (!chat) {
      return res.status(404).send("Chat not found.");
    }

    let html = `
            <style>
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    padding: 10px;
                    max-width: 500px; /* Set a max width for chat container */
                    font-family: Arial, sans-serif; /* Set a font family */
                }
                .message {
                    margin: 5px 0;
                    padding: 10px;
                    border-radius: 10px;
                    position: relative; /* For positioning the message */
                    max-width: 70%; /* Set a max width for messages */
                }
                .message.left {
                    background-color: #f1f1f1; /* Light background for others */
                    align-self: flex-start; /* Align to left */
                }
                .message.right {
                    background-color: #007bff; /* Blue background for current user */
                    color: white;
                    align-self: flex-end; /* Align to right */
                }
                .message-header {
                    display: flex;
                    justify-content: space-between; /* Space between username and timestamp */
                }
                .username {
                    font-weight: bold;
                }
                .timestamp {
                    font-size: 0.7em;
                    color: #000; /* Gray color for timestamp */
                }
                .file {
                    margin-top: 5px;
                    border: 1px solid #ccc; /* Border for file preview */
                    border-radius: 5px;
                    overflow: hidden; /* Hide overflow for rounded corners */
                }
                .file img {
                    max-width: 100%; /* Scale image to fit */
                    border-radius: 5px; /* Rounded corners */
                }
                .file video, .file audio {
                    width: 100%; /* Full width for video/audio */
                    border-radius: 5px; /* Rounded corners */
                }
            </style>
            <div class="chat-container">
        `;

    chat.messages.forEach((message) => {
      const { content, sender, createdAt, file, fileType } = message;
      const senderUsername = sender ? sender.username : "Unknown User";

      // Determine alignment based on the sender
      const messageAlignment = sender._id.equals(currentUser._id)
        ? "right"
        : "left";

      // Append each message to the HTML
      html += `
                <div class="message ${messageAlignment}">
                    <div class="message-header">
                        <span class="username">${senderUsername}</span>
                        <span class="timestamp">${new Date(
                          createdAt
                        ).toLocaleTimeString()}</span>
                    </div>
                    <div class="message-content">${content}</div>
            `;

      // Handle file attachments
      if (file) {
        html += `<div class="file">`;
        if (fileType.startsWith("image/")) {
          html += `<img src="data:${fileType};base64,${file.toString(
            "base64"
          )}" alt="Image message"/>`;
        } else if (fileType.startsWith("video/")) {
          html += `<video controls><source src="data:${fileType};base64,${file.toString(
            "base64"
          )}" type="${fileType}">Your browser does not support the video tag.</video>`;
        } else if (fileType.startsWith("audio/")) {
          html += `<audio controls>
                                <source src="data:${fileType};base64,${file.toString(
            "base64"
          )}" type="${fileType}">
                                Your browser does not support the audio tag.
                            </audio>`;
        }
        html += `</div>`; // Close file div
      }

      html += `</div>`; // Close message div
    });

    html += "</div>"; // Close chat container
    res.status(200).send(html); // Send the constructed HTML
  } catch (err) {
    res.status(500).send("Server error: " + err.message);
  }
};
