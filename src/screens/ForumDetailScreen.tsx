import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Modal, TextInput, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService, ForumDetail, Post } from '../services/forumService';
import { AuthContext } from '../context/AuthContext';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ForumDetail'>;

const ForumDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { foroId, foroTitulo } = route.params;
  const { session } = useContext(AuthContext);

  const [foro, setForo] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [errorPassword, setErrorPassword] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [detalle, postsData] = await Promise.all([
        forumService.getForumDetail(foroId),
        forumService.getPosts(foroId),
      ]);
      setForo(detalle);
      setPosts(postsData.posts);
      setHasMore(postsData.hasMore);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [foroId]);

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, [cargar]));

  const cargarMasPosts = async () => {
    if (cargandoMas || !hasMore || posts.length === 0) return;
    setCargandoMas(true);
    try {
      const cursor = posts[posts.length - 1].id;
      const data = await forumService.getPosts(foroId, cursor);
      setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.hasMore);
    } catch (e: any) {
      console.error('Error cargando más posts:', e);
    } finally {
      setCargandoMas(false);
    }
  };

  const unirse = async (pwd?: string) => {
    setAccionando(true);
    setErrorPassword('');
    try {
      await forumService.joinForum(foroId, pwd);
      setModalPassword(false);
      setPassword('');
      await cargar();
    } catch (e: any) {
      if (pwd !== undefined) {
        setErrorPassword(e.message);
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setAccionando(false);
    }
  };

  const abandonar = () => {
    Alert.alert('Abandonar foro', '¿Seguro que quieres abandonar este foro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Abandonar', style: 'destructive', onPress: async () => {
          setAccionando(true);
          try {
            await forumService.leaveForum(foroId);
            await cargar();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setAccionando(false);
          }
        },
      },
    ]);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id, postTitulo: item.titulo, foroId })}
    >
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{item.usuario?.nombreUsuario ?? 'Usuario'}</Text>
        <Text style={styles.postFecha}>{new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
      </View>
      <Text style={styles.postTitulo}>{item.titulo}</Text>
      <Text style={styles.postContenido} numberOfLines={3}>{item.contenido}</Text>
      {item.imagen_url && (
        <Image source={{ uri: item.imagen_url }} style={styles.postImagen} />
      )}
      <View style={styles.postFooter}>
        <MaterialDesignIcons name="comment-outline" size={14} color={colors.textMuted} />
        <Text style={styles.postComments}> {item.commentCount} comentarios</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[shared.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primaryGradientStart} />
      </View>
    );
  }

  if (!foro) return null;

  const ListHeader = () => (
    <View>
      {foro.portada_url ? (
        <Image source={{ uri: foro.portada_url }} style={styles.portada} />
      ) : (
        <View style={[styles.portada, styles.portadaPlaceholder]}>
          <MaterialDesignIcons name="forum" size={48} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.infoSection}>
        <View style={styles.titleRow}>
          <Text style={styles.titulo}>{foro.titulo}</Text>
          <Text style={styles.codigo}>#{foro.codigo}</Text>
        </View>
        <Text style={styles.descripcion}>{foro.descripcion}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.badge, foro.tipo === 'privado' ? styles.badgePrivado : styles.badgePublico]}>
            {foro.tipo === 'privado' && <MaterialDesignIcons name="lock" size={11} color={colors.textPrimary} />}
            <Text style={styles.badgeText}> {foro.tipo === 'privado' ? 'Privado' : 'Público'}</Text>
          </View>
          {foro.isModerador && (
            <View style={[styles.badge, styles.badgeModerador]}>
              <Text style={styles.badgeText}>Moderador</Text>
            </View>
          )}
          <Text style={styles.members}>
            <MaterialDesignIcons name="account-group" size={13} color={colors.textMuted} /> {foro.memberCount} miembros
          </Text>
        </View>

        {foro.categorias.length > 0 && (
          <Text style={styles.categorias}>{foro.categorias.join(' · ')}</Text>
        )}

        {/* Acciones */}
        <View style={styles.actionsRow}>
          {!foro.isMember ? (
            <TouchableOpacity
              style={[styles.actionBtn, accionando && { opacity: 0.6 }]}
              onPress={() => foro.tipo === 'privado' ? setModalPassword(true) : unirse()}
              disabled={accionando}
            >
              {accionando ? <ActivityIndicator size="small" color={colors.white} /> : (
                <>
                  <MaterialDesignIcons name="account-plus" size={16} color={colors.white} />
                  <Text style={styles.actionBtnText}>Unirse</Text>
                </>
              )}
            </TouchableOpacity>
          ) : !foro.isModerador ? (
            <TouchableOpacity style={[styles.actionBtnOutline, accionando && { opacity: 0.6 }]} onPress={abandonar} disabled={accionando}>
              <MaterialDesignIcons name="account-minus" size={16} color={colors.errorRed} />
              <Text style={[styles.actionBtnText, { color: colors.errorRed }]}>Abandonar</Text>
            </TouchableOpacity>
          ) : null}

          {foro.isModerador && (
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => navigation.navigate('ForumMembers', { foroId, foroTitulo: foro.titulo })}
            >
              <MaterialDesignIcons name="account-group" size={16} color={colors.primaryGradientStart} />
              <Text style={[styles.actionBtnText, { color: colors.primaryGradientStart }]}>Miembros</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.postsHeader}>
        <Text style={styles.sectionTitle}>Publicaciones</Text>
        {foro.isMember && (
          <TouchableOpacity
            style={styles.newPostBtn}
            onPress={() => navigation.navigate('CreatePost', { foroId, foroTitulo: foro.titulo })}
          >
            <MaterialDesignIcons name="pencil-plus" size={16} color={colors.white} />
            <Text style={styles.newPostText}>Nueva</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{foroTitulo}</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        renderItem={renderPost}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[colors.primaryGradientStart]} />}
        onEndReached={cargarMasPosts}
        onEndReachedThreshold={0.3}
        ListFooterComponent={cargandoMas ? <ActivityIndicator color={colors.primaryGradientStart} style={{ margin: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <MaterialDesignIcons name="text-box-outline" size={48} color={colors.grayLight} />
            <Text style={styles.emptyText}>
              {foro.isMember ? 'Sé el primero en publicar algo.' : 'Únete para ver las publicaciones.'}
            </Text>
          </View>
        }
      />

      {/* Modal contraseña foro privado */}
      <Modal visible={modalPassword} transparent animationType="fade" onRequestClose={() => setModalPassword(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Foro privado</Text>
            <Text style={styles.modalDesc}>Introduce la contraseña para unirte.</Text>
            <TextInput
              style={[shared.input, { marginTop: 12 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoFocus
            />
            {errorPassword ? <Text style={shared.errorText}>{errorPassword}</Text> : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setModalPassword(false); setPassword(''); setErrorPassword(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, accionando && { opacity: 0.6 }]}
                onPress={() => unirse(password)}
                disabled={accionando}
              >
                {accionando ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.modalBtnConfirmText}>Unirse</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  portada: { width: '100%', height: 180 },
  portadaPlaceholder: { backgroundColor: colors.backgroundSoft, alignItems: 'center', justifyContent: 'center' },
  infoSection: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, flex: 1, lineHeight: 28 },
  codigo: { fontSize: 13, color: colors.textMuted, marginLeft: 8, marginTop: 4 },
  descripcion: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgePublico: { backgroundColor: colors.infoBg },
  badgePrivado: { backgroundColor: '#FEF3C7' },
  badgeModerador: { backgroundColor: colors.successGreen + '22' },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  members: { fontSize: 12, color: colors.textMuted },
  categorias: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryGradientStart,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.borderColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { fontWeight: '600', fontSize: 14, color: colors.white },
  postsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGradientStart,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newPostText: { fontSize: 13, fontWeight: '600', color: colors.white },
  postCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  postAuthor: { fontSize: 12, fontWeight: '600', color: colors.primaryGradientStart },
  postFecha: { fontSize: 11, color: colors.textMuted },
  postTitulo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  postContenido: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  postImagen: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  postFooter: { flexDirection: 'row', alignItems: 'center' },
  postComments: { fontSize: 12, color: colors.textMuted },
  emptyPosts: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: colors.white, borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  modalDesc: { fontSize: 13, color: colors.textSecondary },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: colors.backgroundSoft },
  modalBtnCancelText: { fontWeight: '600', color: colors.textSecondary },
  modalBtnConfirm: { backgroundColor: colors.primaryGradientStart },
  modalBtnConfirmText: { fontWeight: '600', color: colors.white },
});

export default ForumDetailScreen;
