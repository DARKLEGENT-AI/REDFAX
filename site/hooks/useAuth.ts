
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/apiService';

interface AuthContextType {
  token: string | null;
  user: { username: string } | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password);
    
    setToken(response.access_token);
    setUser({ username });
    
    localStorage.setItem('authToken', response.access_token);
    localStorage.setItem('authUser', JSON.stringify({ username }));
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUserJSON = localStorage.getItem('authUser');

      if (storedToken && storedUserJSON) {
        const storedUser = JSON.parse(storedUserJSON);
        
        try {
          // Verify token is still valid with an API call.
          await api.getFriends(storedToken);
          setToken(storedToken);
          setUser(storedUser);
        } catch (error) {
          console.error("Session verification failed, token likely invalid. Logging out.", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, [logout]);

  const register = useCallback(async (username: string, password: string) => {
    // 1. Send credentials to the server
    await api.register(username, password);
    
    // 2. After registration, automatically log the user in to start their session
    await login(username, password);
  }, [login]);

  const value = { token, user, login, register, logout, isLoading };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
