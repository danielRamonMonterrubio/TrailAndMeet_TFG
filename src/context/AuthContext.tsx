import React, { createContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabaseClient";

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
          const parsedSession = JSON.parse(savedSession) as Session;
          setSessionState(parsedSession);
          
          // Restaurar sesión en Supabase también
          await supabase.auth.setSession(parsedSession);
          console.log('✅ Sesión restaurada desde AsyncStorage y sincronizada con Supabase');
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
      // Sincronizar sesión con Supabase
      supabase.auth.setSession(newSession);
      console.log('✅ Sesión guardada en AsyncStorage y sincronizada con Supabase');
    } else {
      AsyncStorage.removeItem('auth_session');
      // Limpiar sesión en Supabase
      supabase.auth.signOut();
      console.log('✅ Sesión eliminada de AsyncStorage y Supabase');
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};