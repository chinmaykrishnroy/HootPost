export const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeUsername = (username = "") =>
  String(username).trim().toLowerCase();

export const normalizeEmail = (email = "") =>
  String(email).trim().toLowerCase();
