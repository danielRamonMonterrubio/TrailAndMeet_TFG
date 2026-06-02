import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { friendService, Friend, FriendRequest } from '../services/friendService';
import { profileService, UserSearchResult } from '../services/profileService';
import { FriendRequestContext } from '../context/FriendRequestContext';
import BrandHeader from '../components/headers/BrandHeader';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActiveTab = 'friends' | 'requests';

const Avatar: React.FC<{ fotoUrl: string | null; nombre: string | null; size?: number }> = ({ fotoUrl, nombre, size = 48 }) => {
  const letter = (nombre ?? '?').charAt(0).toUpperCase();
  if (fotoUrl) {
    return <Image source={{ uri: fotoUrl }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.38 }]}>{letter}</Text>
    </View>
  );
};

const FriendsScreen = () => {
  const navigation = useNavigation<Nav>();
  const { setPendingCount } = useContext(FriendRequestContext);

  const [activeTab, setActiveTab] = useState<ActiveTab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [fr, rq] = await Promise.all([
        friendService.getFriends(),
        friendService.getFriendRequests(),
      ]);
      setFriends(fr);
      setRequests(rq);
      setPendingCount(rq.length);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setPendingCount]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    cargar();
  }, [cargar]));

  const onRefresh = () => { setRefreshing(true); cargar(); };

  const buscarUsuarios = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await profileService.searchUsers(q.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const cancelSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const responder = async (amistadId: string, accion: 'accepted' | 'rejected', userId: string) => {
    setActioning(amistadId);
    try {
      await friendService.respondFriendRequest(amistadId, accion);
      const updatedRequests = requests.filter(r => r.amistadId !== amistadId);
      setRequests(updatedRequests);
      setPendingCount(updatedRequests.length);
      if (accion === 'accepted') {
        await cargar();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActioning(null);
    }
  };

  const eliminarAmigo = (friend: Friend) => {
    Alert.alert(
      'Eliminar amigo',
      `¿Quieres eliminar a @${friend.nombreUsuario ?? 'este usuario'} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            try {
              await friendService.removeFriend(friend.userId);
              setFriends(prev => prev.filter(f => f.amistadId !== friend.amistadId));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const irAPerfil = (userId: string, username: string) => {
    navigation.navigate('UserProfile', { userId, username });
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => irAPerfil(item.userId, item.nombreUsuario ?? '')} activeOpacity={0.75}>
      <Avatar fotoUrl={item.fotoUrl} nombre={item.nombreUsuario} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemUsername}>@{item.nombreUsuario ?? '—'}</Text>
        {(item.nombre || item.apellido) && (
          <Text style={styles.itemName}>{[item.nombre, item.apellido].filter(Boolean).join(' ')}</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => eliminarAmigo(item)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialDesignIcons name="account-remove-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity onPress={() => irAPerfil(item.userId, item.nombreUsuario ?? '')} activeOpacity={0.75} style={styles.requestLeft}>
        <Avatar fotoUrl={item.fotoUrl} nombre={item.nombreUsuario} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemUsername}>@{item.nombreUsuario ?? '—'}</Text>
          {(item.nombre || item.apellido) && (
            <Text style={styles.itemName}>{[item.nombre, item.apellido].filter(Boolean).join(' ')}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.requestActions}>
        {actioning === item.amistadId ? (
          <ActivityIndicator size="small" color={colors.primaryGradientStart} />
        ) : (
          <>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => responder(item.amistadId, 'accepted', item.userId)}>
              <MaterialDesignIcons name="check" size={18} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => responder(item.amistadId, 'rejected', item.userId)}>
              <MaterialDesignIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => irAPerfil(item.id, item.nombreUsuario)} activeOpacity={0.75}>
      <Avatar fotoUrl={item.fotoUrl} nombre={item.nombreUsuario} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemUsername}>@{item.nombreUsuario}</Text>
        {(item.nombre || item.apellido) && (
          <Text style={styles.itemName}>{[item.nombre, item.apellido].filter(Boolean).join(' ')}</Text>
        )}
      </View>
      <MaterialDesignIcons name="chevron-right" size={20} color={colors.grayLight} />
    </TouchableOpacity>
  );

  return (
    <View style={shared.container}>
      <BrandHeader />

      {/* ── Cabecera de búsqueda y tabs ── */}
      <View style={styles.header}>
        {searchActive ? (
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <MaterialDesignIcons name="magnify" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchText}
                placeholder="Buscar usuarios..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={buscarUsuarios}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <MaterialDesignIcons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={cancelSearch} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Amigos</Text>
            <TouchableOpacity onPress={() => setSearchActive(true)} style={styles.searchIcon}>
              <MaterialDesignIcons name="account-search-outline" size={24} color={colors.primaryGradientStart} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Modo búsqueda ── */}
      {searchActive ? (
        <View style={{ flex: 1 }}>
          {searching ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryGradientStart} />
          ) : searchQuery.length < 2 ? (
            <View style={styles.emptyState}>
              <MaterialDesignIcons name="account-search" size={56} color={colors.grayLight} />
              <Text style={styles.emptyText}>Escribe al menos 2 caracteres para buscar</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialDesignIcons name="account-off-outline" size={56} color={colors.grayLight} />
                  <Text style={styles.emptyText}>Sin resultados para "{searchQuery}"</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        <>
          {/* ── Tabs ── */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'friends' && styles.tabBtnActive]}
              onPress={() => setActiveTab('friends')}
            >
              <Text style={[styles.tabLabel, activeTab === 'friends' && styles.tabLabelActive]}>
                Mis amigos {friends.length > 0 ? `(${friends.length})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]}
              onPress={() => setActiveTab('requests')}
            >
              <Text style={[styles.tabLabel, activeTab === 'requests' && styles.tabLabelActive]}>
                Solicitudes
              </Text>
              {requests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{requests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Contenido ── */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryGradientStart} />
          ) : activeTab === 'friends' ? (
            <FlatList
              data={friends}
              keyExtractor={item => item.amistadId}
              renderItem={renderFriend}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryGradientStart]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialDesignIcons name="account-group-outline" size={64} color={colors.grayLight} />
                  <Text style={styles.emptyTitle}>Aún no tienes amigos</Text>
                  <Text style={styles.emptyText}>Usa el buscador para encontrar a otros montañeros</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={item => item.amistadId}
              renderItem={renderRequest}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primaryGradientStart]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialDesignIcons name="account-clock-outline" size={64} color={colors.grayLight} />
                  <Text style={styles.emptyTitle}>Sin solicitudes pendientes</Text>
                  <Text style={styles.emptyText}>Aquí aparecerán las solicitudes de amistad que recibas</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
};

export default FriendsScreen;

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  searchIcon: { padding: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchText: { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },
  cancelBtn: { paddingVertical: 4 },
  cancelText: { color: colors.primaryGradientStart, fontWeight: '600', fontSize: 15 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.primaryGradientStart },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.primaryGradientStart },
  badge: {
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  listContent: { padding: 16, gap: 10, flexGrow: 1 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  requestLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: 12 },
  avatarCircle: {
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  avatarLetter: { fontWeight: '700', color: colors.primaryGradientStart },
  itemInfo: { flex: 1 },
  itemUsername: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  itemName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  removeBtn: { padding: 4 },
  requestActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
});
