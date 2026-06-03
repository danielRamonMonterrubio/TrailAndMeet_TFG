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
      Authorization: `Bearer ${token}`,
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
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export interface ForumSummary {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: 'publico' | 'privado';
  portada_url: string | null;
  categorias: string[];
  creadoPor: string;
  created_at: string;
  memberCount: number;
  isMember: boolean;
  isModerador?: boolean;
  fechaUnion?: string;
}

export interface ForumDetail extends ForumSummary {
  isModerador: boolean;
}

export interface Post {
  id: number;
  foroId: number;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  createdAt: string;
  usuario: { id: string; nombreUsuario: string };
  commentCount: number;
  isOwner: boolean;
}

export interface Comment {
  id: number;
  publicacionId: number;
  contenido: string;
  createdAt: string;
  usuario: { id: string; nombreUsuario: string };
  isOwner: boolean;
  isModerador: boolean;
}

export interface ForumMember {
  usuarioId: string;
  nombreUsuario: string;
  fechaUnion: string;
}

export const forumService = {
  async createForum(params: {
    titulo: string;
    descripcion: string;
    tipo: 'publico' | 'privado';
    categorias: string[];
    password?: string;
    portada_url?: string | null;
  }): Promise<ForumDetail> {
    const data = await callFunction('create-forum', params);
    return data.foro;
  },

  async getForums(params: {
    search?: string;
    categoria?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ foros: ForumSummary[]; total: number }> {
    return getFunction('get-forums', params);
  },

  async getForumDetail(foroId: number): Promise<ForumDetail> {
    const data = await getFunction('get-forum-detail', { foroId });
    return data.foro;
  },

  async joinForum(foroId: number, password?: string): Promise<void> {
    await callFunction('join-forum', { foroId, password });
  },

  async leaveForum(foroId: number): Promise<void> {
    await callFunction('leave-forum', { foroId });
  },

  async getMyForums(): Promise<ForumSummary[]> {
    const data = await getFunction('get-my-forums');
    return data.foros;
  },

  async kickMember(foroId: number, targetUserId: string): Promise<void> {
    await callFunction('kick-forum-member', { foroId, targetUserId });
  },

  async createPost(params: {
    foroId: number;
    titulo: string;
    contenido: string;
    imagen_url?: string | null;
  }): Promise<Post> {
    const data = await callFunction('create-post', params);
    return data.publicacion;
  },

  async getPosts(foroId: number, cursor?: number): Promise<{ posts: Post[]; hasMore: boolean }> {
    return getFunction('get-posts', { foroId, cursor, limit: 20 });
  },

  async deletePost(postId: number): Promise<void> {
    await callFunction('delete-post', { postId });
  },

  async createComment(publicacionId: number, contenido: string): Promise<Comment> {
    const data = await callFunction('create-comment', { publicacionId, contenido });
    return data.comentario;
  },

  async getPostDetail(postId: number): Promise<{ post: Post & { isModerador: boolean }; comentarios: Comment[] }> {
    return getFunction('get-post-detail', { postId });
  },

  async deleteComment(commentId: number): Promise<void> {
    await callFunction('delete-comment', { commentId });
  },

  async getForumMembers(foroId: number): Promise<{
    members: (ForumMember & { esModerador: boolean })[];
    isModerador: boolean;
  }> {
    return getFunction('get-forum-members', { foroId });
  },
};
