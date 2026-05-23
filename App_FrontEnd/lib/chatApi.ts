import BASE_URL from '../config.js';

export type ChatParticipant = {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
};

export type UserProfileSummary = ChatParticipant & {
  profilePicture?: string | null;
};

export type ChatMessage = {
  _id: string;
  chat: string;
  sender: ChatParticipant | string;
  type: string;
  content?: string;
  fileUrl?: string | null;
  replyTo?: ChatMessage | null;
  metadata?: {
    links?: { url: string; host?: string; type?: string }[];
  };
  deliveredAtByUser?: Record<string, string>;
  seenAtByUser?: Record<string, string>;
  systemEvent?: {
    type?: string;
    actor?: string;
    payload?: Record<string, any>;
  };
  createdAt: string;
  updatedAt?: string;
};

export type ChatSummary = {
  _id: string;
  participants: ChatParticipant[];
  createdBy?: string;
  lastMessage?: ChatMessage | null;
  lastMessageAt?: string;
  unreadCount?: number;
  settings?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

const readJson = async (response: Response) => {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || data?.message || data || 'Request failed.');
  }
  return data;
};

export const otherParticipant = (chat: ChatSummary, currentUsername?: string | null) =>
  chat.participants?.find((participant) => participant.username !== currentUsername) || chat.participants?.[0];

export const listChats = async (): Promise<ChatSummary[]> => {
  const response = await fetch(`${BASE_URL}/chat/conversations`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await readJson(response);
  return data?.chats || [];
};

export const startDirectChat = async (username: string): Promise<ChatSummary> => {
  const response = await fetch(`${BASE_URL}/chat/${username}/start`, {
    method: 'POST',
    credentials: 'include',
  });
  return readJson(response);
};

export const loadConnections = async ({ limit = 25, offset = 0 } = {}) => {
  const response = await fetch(`${BASE_URL}/users/connections?paginated=true&limit=${limit}&offset=${offset}`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await readJson(response);
  return Array.isArray(data)
    ? { items: data, nextOffset: null, hasMore: false }
    : data;
};

export const loadChat = async (username: string, before?: string | null) => {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const response = await fetch(`${BASE_URL}/chat/${username}/load${query}`, {
    method: 'GET',
    credentials: 'include',
  });
  return readJson(response);
};

export const loadUserProfileSummary = async (username: string): Promise<UserProfileSummary | null> => {
  const response = await fetch(`${BASE_URL}/users/${username}/complete`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await readJson(response);
  return data
    ? {
        _id: data._id,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        profilePicture: data.profilePicture || null,
      }
    : null;
};

export const loadMessageContext = async (username: string, messageId: string) => {
  const response = await fetch(`${BASE_URL}/chat/${username}/message/${messageId}/context`, {
    method: 'GET',
    credentials: 'include',
  });
  return readJson(response);
};

export const sendTextMessage = async (username: string, content: string, replyTo?: string | null): Promise<ChatMessage> => {
  const response = await fetch(`${BASE_URL}/chat/${username}/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(replyTo ? { content, replyTo } : { content }),
  });
  return readJson(response);
};

export const updateTextMessage = async (username: string, messageId: string, content: string): Promise<ChatMessage> => {
  const response = await fetch(`${BASE_URL}/chat/${username}/message/${messageId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return readJson(response);
};

export const deleteTextMessage = async (username: string, messageId: string) => {
  const response = await fetch(`${BASE_URL}/chat/${username}/message/${messageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return readJson(response);
};

export const searchChatMessages = async (username: string, query: string): Promise<ChatMessage[]> => {
  const response = await fetch(`${BASE_URL}/chat/${username}/searchMessages?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await readJson(response);
  return Array.isArray(data) ? data : data.items || [];
};

export const listChatAttachments = async (chatId: string, type: 'media' | 'files' | 'links'): Promise<ChatMessage[]> => {
  const response = await fetch(`${BASE_URL}/chat/conversations/${chatId}/attachments?type=${type}`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await readJson(response);
  return data.items || [];
};

export const markChatRead = async (chatId: string) => {
  const response = await fetch(`${BASE_URL}/chat/conversations/${chatId}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  return readJson(response);
};
