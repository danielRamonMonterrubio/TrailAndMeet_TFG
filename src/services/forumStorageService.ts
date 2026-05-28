import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from './supabaseClient';

const BUCKET = 'forum-images';

async function uploadImage(path: string, base64: string, type: string): Promise<string | null> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, upsert: true });
  if (error) {
    console.error('Error subiendo imagen de foro:', error);
    return null;
  }
  return path;
}

export const forumStorageService = {
  async pickAndUploadCover(userId: string): Promise<{ path: string; localUri: string } | null> {
    return new Promise(resolve => {
      launchImageLibrary({ mediaType: 'photo', includeBase64: true, quality: 0.7 }, async response => {
        if (response.didCancel || !response.assets?.[0]?.base64) { resolve(null); return; }
        const asset = response.assets[0];
        const path = `covers/${userId}/${Date.now()}.jpg`;
        const uploaded = await uploadImage(path, asset.base64!, asset.type ?? 'image/jpeg');
        if (!uploaded) { resolve(null); return; }
        resolve({ path: uploaded, localUri: asset.uri! });
      });
    });
  },

  async pickAndUploadPostImage(userId: string): Promise<{ path: string; localUri: string } | null> {
    return new Promise(resolve => {
      launchImageLibrary({ mediaType: 'photo', includeBase64: true, quality: 0.7 }, async response => {
        if (response.didCancel || !response.assets?.[0]?.base64) { resolve(null); return; }
        const asset = response.assets[0];
        const path = `posts/${userId}/${Date.now()}.jpg`;
        const uploaded = await uploadImage(path, asset.base64!, asset.type ?? 'image/jpeg');
        if (!uploaded) { resolve(null); return; }
        resolve({ path: uploaded, localUri: asset.uri! });
      });
    });
  },
};
