import React, { useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService } from '../services/forumService';
import { forumStorageService } from '../services/forumStorageService';
import { AuthContext } from '../context/AuthContext';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CreatePost'>;

const CreatePostScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { foroId, foroTitulo } = route.params;
  const { session } = useContext(AuthContext);

  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [imagenPath, setImagenPath] = useState<string | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const seleccionarImagen = async () => {
    if (!session?.user?.id) return;
    setSubiendoImagen(true);
    try {
      const result = await forumStorageService.pickAndUploadPostImage(session.user.id);
      if (result) {
        setImagenPath(result.path);
        setImagenPreview(result.localUri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  const publicar = async () => {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es obligatorio'); return; }
    if (!contenido.trim()) { Alert.alert('Error', 'El contenido es obligatorio'); return; }

    setLoading(true);
    try {
      await forumService.createPost({
        foroId,
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        imagen_url: imagenPath,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={shared.screenTitle}>Nueva Publicación</Text>
          <Text style={styles.foroSubtitle}>{foroTitulo}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={shared.label}>Título *</Text>
        <TextInput
          style={shared.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Título de la publicación"
          placeholderTextColor={colors.textMuted}
          maxLength={150}
        />

        <Text style={shared.label}>Contenido *</Text>
        <TextInput
          style={[shared.input, styles.textArea]}
          value={contenido}
          onChangeText={setContenido}
          placeholder="Escribe aquí tu publicación..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        <Text style={shared.label}>Imagen (opcional)</Text>
        {imagenPreview ? (
          <View style={styles.imagenPreviewContainer}>
            <Image source={{ uri: imagenPreview }} style={styles.imagenPreview} />
            <TouchableOpacity style={styles.removeImagen} onPress={() => { setImagenPath(null); setImagenPreview(null); }}>
              <MaterialDesignIcons name="close-circle" size={24} color={colors.errorRed} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagenBtn} onPress={seleccionarImagen} disabled={subiendoImagen}>
            {subiendoImagen ? (
              <ActivityIndicator color={colors.primaryGradientStart} />
            ) : (
              <>
                <MaterialDesignIcons name="image-plus" size={28} color={colors.textMuted} />
                <Text style={styles.imagenBtnText}>Añadir imagen</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[shared.primaryButton, { marginTop: 24 }, loading && { opacity: 0.6 }]}
          onPress={publicar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>Publicar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { padding: 4 },
  foroSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  textArea: { height: 200, textAlignVertical: 'top' },
  imagenBtn: {
    height: 120,
    backgroundColor: colors.backgroundSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagenBtnText: { fontSize: 13, color: colors.textMuted },
  imagenPreviewContainer: { position: 'relative', marginBottom: 8 },
  imagenPreview: { width: '100%', height: 200, borderRadius: 12 },
  removeImagen: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.white, borderRadius: 12 },
});

export default CreatePostScreen;
