import { supabase } from "./supabaseClient";

const BUCKET_NAME = "gpx-files";
const ALLOWED_EXTENSION = ".gpx";

export const excursionStorageService = {
  /**
   * Valida que el archivo sea .gpx
   */
  validateGpxFile: (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith(ALLOWED_EXTENSION);
  },

  /**
   * Sube un archivo GPX a Supabase Storage
   * Retorna la ruta guardada (path) en Storage o null si falla
   */
  uploadGpxFile: async (
    base64Data: string,
    fileName: string
  ): Promise<string | null> => {
    try {
      // Obtener el user ID del session actual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user authenticated");
        return null;
      }

      // Construir la ruta: userId/timestamp_nombreArchivo.gpx
      const timestamp = Date.now();
      const storagePath = `${user.id}/${timestamp}_${fileName}`;

      console.log('UPLOAD GPX:', {
        userId: user.id,
        fileName,
        storagePath,
        bucketName: BUCKET_NAME,
      });

      // Convertir base64 a Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('Bytes convertidos:', bytes.length);

      // Subir a Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, bytes, {
          contentType: "application/gpx+xml",
        });

      console.log('Upload response:', { data, error });

      if (error) {
        console.error("Error uploading GPX:", error);
        return null;
      }

      console.log('✅ GPX subido exitosamente a:', storagePath);
      return storagePath;
    } catch (err) {
      console.error("Error in uploadGpxFile:", err);
      return null;
    }
  },

  /**
   * Borra un archivo GPX de Storage (para rollback)
   */
  deleteGpxFile: async (storagePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (error) {
        console.error("Error deleting GPX:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error in deleteGpxFile:", err);
      return false;
    }
  },
};
