import { getCurrentUser } from "@/lib/auth";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from 'expo-router'; 
import { io } from 'socket.io-client';
import BASE_URL from '../config.js';

interface User {
  userId: string;
  username: string;
}

interface GlobalContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void; // Add this type
  setIsLoading: (loading: boolean) => void;
  user: User | null;
  setUser: (user: string | null) => void;
  isLoading: boolean;
}

const defaultContextValue: GlobalContextType = {
  isLoggedIn: false,
  setIsLoggedIn: () => {}, // Add this default empty function
  setIsLoading: () => {},
  user: null,
  setUser: () => {},
  isLoading: true,
};

const GlobalContext = createContext<GlobalContextType>(defaultContextValue);
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const socket = io(`${BASE_URL}`);
    const handleUserLoggedOut = () => {
      setIsLoggedIn(false);
      setUser(null);
      router.replace('/sign-in');
    };
    const handleUserLoggedIn = (data: { userId: string; username: string }) => {
      console.log("User logged in event received", data);
    };
    socket.on('user_logged_out', handleUserLoggedOut);
    socket.on('user_logged_in', handleUserLoggedIn);
  
    return () => {
      socket.off('user_logged_out', handleUserLoggedOut);
      socket.off('user_logged_in', handleUserLoggedIn);
      socket.disconnect();
    };
  }, []);

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
        setIsLoggedIn, // Add this to the context provider
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
