import React, { useState, useCallback, useRef, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService, Post, Comment } from '../services/forumService';
import { AuthContext } from '../context/AuthContext';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PostDetail'>;

const PostDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { postId, postTitulo, foroId } = route.params;
  const { session } = useContext(AuthContext);
  const myUserId = session?.user?.id ?? '';

  const [post, setPost] = useState<(Post & { isModerador: boolean }) | null>(null);
  const [comentarios, setComentarios] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [eliminandoPost, setEliminandoPost] = useState(false);
  const [eliminandoComentario, setEliminandoComentario] = useState<number | null>(null);
  const [myUsername, setMyUsername] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await forumService.getPostDetail(postId);
      setPost(data.post);
      setComentarios(data.comentarios);
      // Extraer el username del usuario logueado de los comentarios o del post
      const miComent = data.comentarios.find((c: Comment) => c.usuarioId === myUserId);
      if (miComent?.usuario?.nombreUsuario) setMyUsername(miComent.usuario.nombreUsuario);
      else if (data.post.usuarioId === myUserId && data.post.usuario?.nombreUsuario) setMyUsername(data.post.usuario.nombreUsuario);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, [cargar]));

  const enviarComentario = async () => {
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      const nuevo = await forumService.createComment(postId, comentario.trim());
      setComentarios(prev => [...prev, {
        ...nuevo,
        usuarioId: myUserId,
        usuario: { nombreUsuario: myUsername || 'Tú' },
        isOwner: true,
        isModerador: false,
      }]);
      setComentario('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setEnviando(false);
    }
  };

  const eliminarPost = () => {
    Alert.alert('Eliminar publicación', '¿Seguro que quieres eliminar esta publicación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setEliminandoPost(true);
          try {
            await forumService.deletePost(postId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
            setEliminandoPost(false);
          }
        },
      },
    ]);
  };

  const eliminarComentario = (commentId: number) => {
    Alert.alert('Eliminar comentario', '¿Seguro que quieres eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setEliminandoComentario(commentId);
          try {
            await forumService.deleteComment(commentId);
            setComentarios(prev => prev.filter(c => c.id !== commentId));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setEliminandoComentario(null);
          }
        },
      },
    ]);
  };

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('es-ES');
  };

  const renderComentario = ({ item }: { item: Comment }) => (
    <View style={styles.comentCard}>
      <View style={styles.comentHeader}>
        <Text style={styles.comentAutor}>@{item.usuario?.nombreUsuario ?? 'Usuario'}</Text>
        <Text style={styles.comentFecha}>{formatFecha(item.createdAt)}</Text>
        {(item.isOwner || item.isModerador) && (
          <TouchableOpacity
            onPress={() => eliminarComentario(item.id)}
            disabled={eliminandoComentario === item.id}
            style={styles.deleteBtn}
          >
            {eliminandoComentario === item.id
              ? <ActivityIndicator size="small" color={colors.errorRed} />
              : <MaterialDesignIcons name="delete-outline" size={16} color={colors.errorRed} />
            }
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.comentContenido}>{item.contenido}</Text>
    </View>
  );

  const postHeader = React.useMemo(() => {
    if (!post) return null;
    return (
      <View style={styles.postSection}>
        <View style={styles.postMeta}>
          <Text style={styles.postAutor}>@{post.usuario?.nombreUsuario ?? 'Usuario'}</Text>
          <Text style={styles.postFecha}>{formatFecha(post.createdAt)}</Text>
          {(post.isOwner || post.isModerador) && (
            <TouchableOpacity onPress={eliminarPost} disabled={eliminandoPost} style={styles.deleteBtn}>
              {eliminandoPost
                ? <ActivityIndicator size="small" color={colors.errorRed} />
                : <MaterialDesignIcons name="delete-outline" size={18} color={colors.errorRed} />
              }
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.postTitulo}>{post.titulo}</Text>
        <Text style={styles.postContenido}>{post.contenido}</Text>
        {post.imagen_url && (
          <Image source={{ uri: post.imagen_url }} style={styles.postImagen} />
        )}
        <View style={styles.comentariosSeparator}>
          <Text style={styles.comentariosLabel}>
            Comentarios ({comentarios.length})
          </Text>
        </View>
      </View>
    );
  }, [post, comentarios.length, eliminandoPost]);

  if (loading) {
    return (
      <View style={[shared.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primaryGradientStart} />
      </View>
    );
  }

  // Determinamos si el usuario es miembro (puede comentar)
  // Si el post cargó correctamente y tiene isModerador o isOwner, es miembro
  const puedecomentar = post !== null;

  return (
    <KeyboardAvoidingView
      style={shared.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{postTitulo}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={comentarios}
        keyExtractor={item => String(item.id)}
        renderItem={renderComentario}
        ListHeaderComponent={postHeader}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[colors.primaryGradientStart]} />}
        ListEmptyComponent={
          <View style={styles.emptyComentarios}>
            <Text style={styles.emptyText}>Sé el primero en comentar</Text>
          </View>
        }
      />

      {puedecomentar && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={comentario}
            onChangeText={setComentario}
            placeholder="Escribe un comentario..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!comentario.trim() || enviando) && { opacity: 0.4 }]}
            onPress={enviarComentario}
            disabled={!comentario.trim() || enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color={colors.white} />
              : <MaterialDesignIcons name="send" size={20} color={colors.white} />
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  postSection: { marginBottom: 8 },
  postMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  postAutor: { fontSize: 13, fontWeight: '600', color: colors.primaryGradientStart },
  postFecha: { fontSize: 11, color: colors.textMuted },
  deleteBtn: { marginLeft: 'auto', padding: 4 },
  postTitulo: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 10, lineHeight: 26 },
  postContenido: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 12 },
  postImagen: { width: '100%', height: 220, borderRadius: 12, marginBottom: 16 },
  comentariosSeparator: {
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
    paddingTop: 14,
    marginTop: 4,
  },
  comentariosLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  comentCard: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  comentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  comentAutor: { fontSize: 12, fontWeight: '600', color: colors.primaryGradientStart },
  comentFecha: { fontSize: 11, color: colors.textMuted },
  comentContenido: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  emptyComentarios: { alignItems: 'center', paddingTop: 24 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
    backgroundColor: colors.white,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PostDetailScreen;
