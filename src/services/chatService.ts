import { supabase } from './supabaseClient';
import Config from 'react-native-config';

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

export interface ChatMessage {
  id: number;
  excursionId: number;
  usuarioId: string;
  contenido: string;
  createdAt: string;
  usuario?: {
    id: string;
    nombreUsuario: string;
  };
}

export interface ChatPreview {
  excursionId: number;
  titulo: string;
  excursionStatus: string;
  lastMsgContenido: string | null;
  lastMsgAt: string | null;
  lastMsgUsername: string | null;
  lastMsgIsOwn: boolean;
  unreadCount: number;
}

export const chatService = {
  async sendMessage(excursionId: string, contenido: string): Promise<ChatMessage> {
    const data = await callFunction('send-message', {
      excursionId: parseInt(excursionId, 10),
      contenido,
    });
    return data.mensaje as ChatMessage;
  },

  async getChatMessages(
    excursionId: string,
    cursor?: number,
    limit = 50
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    const data = await getFunction('get-chat-messages', {
      excursionId: parseInt(excursionId, 10),
      limit,
      cursor,
    });
    return { messages: data.messages ?? [], hasMore: data.hasMore ?? false };
  },

  async markChatRead(excursionId: string): Promise<void> {
    // No lanzamos error si falla: no debe bloquear la UX
    await callFunction('mark-chat-read', { excursionId: parseInt(excursionId, 10) }).catch(() => {});
  },

  async getMyChats(): Promise<ChatPreview[]> {
    const data = await getFunction('get-my-chats');
    return data.chats ?? [];
  },

  subscribeToChatMessages(
    excursionId: string,
    onNewMessage: (message: ChatMessage) => void
  ) {
    const numericId = parseInt(excursionId, 10);
    const channel = supabase
      .channel(`chat-${excursionId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensaje',
          // Sin filtro server-side: columnas camelCase no funcionan bien en Realtime filters.
          // Filtramos client-side en el callback.
        },
        (payload: any) => {
          const msg = payload.new as ChatMessage;
          if (Number(msg.excursionId) === numericId) {
            onNewMessage(msg);
          }
        }
      )
      .subscribe();

    return channel;
  },
};
