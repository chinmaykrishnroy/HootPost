import BASE_URL from '../config.js';

export type ChatParticipant = {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
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

export const sendTextMessage = async (username: string, content: string, replyTo?: string | null): Promise<ChatMessage> => {
  const response = await fetch(`${BASE_URL}/chat/${username}/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(replyTo ? { content, replyTo } : { content }),
  });
  return readJson(response);
};

export const markChatRead = async (chatId: string) => {
  const response = await fetch(`${BASE_URL}/chat/conversations/${chatId}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  return readJson(response);
};
