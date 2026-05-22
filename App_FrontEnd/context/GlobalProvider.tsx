import { getCurrentUser } from "@/lib/auth";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from 'expo-router'; 
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config.js';
import { getSessionToken } from "@/lib/apiClient";

interface User {
  userId: string;
  username: string;
}

interface GlobalContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const defaultContextValue: GlobalContextType = {
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  setIsLoading: () => {},
  user: null,
  setUser: () => {},
  isLoading: true,
};

const GlobalContext = createContext<GlobalContextType>(defaultContextValue);
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null;
    let cancelled = false;

    const handleSessionRevoked = () => {
      setIsLoggedIn(false);
      setUser(null);
      router.replace('/sign-in');
    };

    const connectSocket = async () => {
      const token = await getSessionToken();
      if (!token || cancelled) return;
      socket = io(SOCKET_URL, { auth: { token } });
      socket.on('session:revoked', handleSessionRevoked);
      socket.on('sessions:changed', () => {});
      socket.on('notification:new', () => {});
    };
    connectSocket();
  
    return () => {
      cancelled = true;
      socket?.off('session:revoked', handleSessionRevoked);
      socket?.disconnect();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setIsLoggedIn(true);
          setUser({ userId: res.userId, username: res.username });
        } else {
          setIsLoggedIn(false);
          setUser(null);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        setIsLoading,
        user,
        setUser,
        isLoading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
