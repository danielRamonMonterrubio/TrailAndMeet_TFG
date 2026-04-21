import React, { createContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  setSession: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurar sesión desde AsyncStorage al iniciar
    const restoreSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem('auth_session');
        if (savedSession) {
          setSessionState(JSON.parse(savedSession));
        }
      } catch (error) {
        console.error('Error restaurando sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const setSession = (newSession: Session | null) => {
    setSessionState(newSession);
    if (newSession) {
      AsyncStorage.setItem('auth_session', JSON.stringify(newSession));
    } else {
      AsyncStorage.removeItem('auth_session');
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};