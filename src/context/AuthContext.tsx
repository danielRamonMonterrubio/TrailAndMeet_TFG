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
          
          // Restaurar sesión en Supabase primero, luego actualizar estado
          const { error: setSessionError } = await supabase.auth.setSession(parsedSession);
          if (setSessionError) {
            console.error('❌ Error sincronizando sesión con Supabase:', setSessionError);
            // Si falla, limpiar la sesión guardada
            await AsyncStorage.removeItem('auth_session');
          } else {
            setSessionState(parsedSession);
            console.log('✅ Sesión restaurada desde AsyncStorage y sincronizada con Supabase');
          }
        }
      } catch (error) {
        console.error('Error restaurando sesión:', error);
        // Limpiar sesión inválida
        await AsyncStorage.removeItem('auth_session');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const setSession = (newSession: Session | null) => {
    if (newSession) {
      // Guardar en AsyncStorage
      AsyncStorage.setItem('auth_session', JSON.stringify(newSession)).catch(err => {
        console.error('❌ Error guardando sesión en AsyncStorage:', err);
      });
      
      // Sincronizar con Supabase (sin esperar, pero log en caso de error)
      supabase.auth.setSession(newSession).catch(err => {
        console.error('❌ Error sincronizando sesión con Supabase:', err);
      });
      
      setSessionState(newSession);
      console.log('✅ Sesión guardada en AsyncStorage y sincronizada con Supabase');
    } else {
      // Limpiar sesión
      AsyncStorage.removeItem('auth_session').catch(err => {
        console.error('❌ Error removiendo sesión de AsyncStorage:', err);
      });
      
      supabase.auth.signOut().catch(err => {
        console.error('❌ Error en signOut de Supabase:', err);
      });
      
      setSessionState(null);
      console.log('✅ Sesión eliminada de AsyncStorage y Supabase');
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};