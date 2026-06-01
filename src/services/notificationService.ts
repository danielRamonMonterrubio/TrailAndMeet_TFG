import messaging from '@react-native-firebase/messaging';
import { supabase } from './supabaseClient';
import Config from 'react-native-config';

const API_URL = Config.SUPABASE_URL;

export interface Notificacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  data: Record<string, string>;
  leida: boolean;
  createdAt: string;
}

async function getAuthToken(): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
  }
  return null;
}

async function callFunction(name: string, body: object = {}): Promise<any> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function registerPushToken(): Promise<void> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.log('Permiso de notificaciones denegado');
      return;
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) return;

    const authToken = await getAuthToken();
    if (!authToken) return;

    await fetch(`${API_URL}/functions/v1/register-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: fcmToken }),
    });

    console.log('✅ Push token registrado');
  } catch (error) {
    console.error('Error registrando push token:', error);
  }
}

export async function getNotifications(): Promise<{ notificaciones: Notificacion[]; unreadCount: number }> {
  const data = await callFunction('get-notifications');
  return { notificaciones: data.notificaciones ?? [], unreadCount: data.unreadCount ?? 0 };
}

export async function markNotificationsRead(id?: string): Promise<void> {
  await callFunction('mark-notifications-read', id ? { id } : {});
}
