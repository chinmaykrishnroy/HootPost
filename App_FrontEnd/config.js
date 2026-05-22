import Constants from "expo-constants";

export const SESSION_TOKEN_KEY = "hootpost.sessionToken";

const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;
const explicitApiHost = process.env.EXPO_PUBLIC_API_HOST;

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    "";
  return hostUri.split(":")[0];
};

const apiHost = explicitApiHost || getExpoHost() || "192.168.1.13";

export const API_ORIGIN = explicitApiUrl
  ? explicitApiUrl.replace(/\/api\/?$/, "")
  : `http://${apiHost}:5000`;

export const SOCKET_URL = `${API_ORIGIN}/realtime`;

const BASE_URL = explicitApiUrl || `${API_ORIGIN}/api`;

export default BASE_URL;
