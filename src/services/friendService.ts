import Config from 'react-native-config';
import { supabase } from './supabaseClient';

const API_URL = Config.SUPABASE_URL;
const ANON_KEY = Config.SUPABASE_ANON_KEY;

async function getAuthToken(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
    if (attempt < 2) await new Promise<void>(resolve => setTimeout(() => resolve(), 100 * (attempt + 1)));
  }
  return ANON_KEY ?? '';
}

async function callFunction(name: string, body: object): Promise<any> {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function getFunction(
  name: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<any> {
  const token = await getAuthToken();
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, String(v)]);
  const qs = new URLSearchParams(entries).toString();
  const url = `${API_URL}/functions/v1/${name}${qs ? '?' + qs : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export interface Friend {
  amistadId: string;
  userId: string;
  nombreUsuario: string | null;
  nombre: string | null;
  apellido: string | null;
  fotoUrl: string | null;
  since: string;
}

export interface FriendRequest {
  amistadId: string;
  userId: string;
  nombreUsuario: string | null;
  nombre: string | null;
  apellido: string | null;
  fotoUrl: string | null;
  createdAt: string;
}

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export interface FriendshipStatusResult {
  status: FriendshipStatus;
  amistadId?: string;
}

export const friendService = {
  async sendFriendRequest(receptorId: string): Promise<void> {
    await callFunction('send-friend-request', { receptorId });
  },

  async respondFriendRequest(amistadId: string, accion: 'accepted' | 'rejected'): Promise<void> {
    await callFunction('respond-friend-request', { amistadId, accion });
  },

  async getFriends(): Promise<Friend[]> {
    const data = await getFunction('get-friends');
    return data.friends as Friend[];
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const data = await getFunction('get-friend-requests');
    return data.requests as FriendRequest[];
  },

  async removeFriend(otherUserId: string): Promise<void> {
    await callFunction('remove-friend', { otherUserId });
  },

  async getFriendshipStatus(otherUserId: string): Promise<FriendshipStatusResult> {
    const data = await getFunction('get-friendship-status', { otherUserId });
    return data as FriendshipStatusResult;
  },
};
