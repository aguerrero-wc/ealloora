// contexts/AuthContext.tsx
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../constants/firebaseConfig';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthProvider: Setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔔 Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};