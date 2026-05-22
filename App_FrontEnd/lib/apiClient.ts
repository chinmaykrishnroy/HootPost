import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import BASE_URL, { SESSION_TOKEN_KEY } from "../config.js";

let installed = false;
let memoryToken: string | null = null;

const canUseSecureStore = Platform.OS !== "web";

export const setSessionToken = async (token: string | null) => {
  memoryToken = token;
  if (canUseSecureStore) {
    if (token) await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    return;
  }
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
  else localStorage.removeItem(SESSION_TOKEN_KEY);
};

export const getSessionToken = async () => {
  if (memoryToken) return memoryToken;
  if (canUseSecureStore) {
    memoryToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    return memoryToken;
  }
  if (typeof localStorage === "undefined") return null;
  memoryToken = localStorage.getItem(SESSION_TOKEN_KEY);
  return memoryToken;
};

export const clearSessionToken = () => setSessionToken(null);

const requestUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const withAuthHeader = (headers: HeadersInit | undefined, token: string) => {
  const nextHeaders = new Headers(headers);
  if (!nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }
  return nextHeaders;
};

export const installAuthenticatedFetch = () => {
  if (installed) return;
  installed = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = requestUrl(input);
    const shouldAttachToken = typeof url === "string" && url.startsWith(BASE_URL);
    const token = shouldAttachToken ? await getSessionToken() : null;
    const nextInit = token
      ? { ...init, headers: withAuthHeader(init.headers, token) }
      : init;

    const response = await originalFetch(input, nextInit);
    if (
      shouldAttachToken &&
      response.ok &&
      (url.endsWith("/auth/logout") || url.endsWith("/auth/deleteUser"))
    ) {
      await clearSessionToken();
    }
    return response;
  };
};
