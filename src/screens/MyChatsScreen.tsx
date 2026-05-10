import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { chatService, ChatPreview } from '../services/chatService';
import { AuthContext } from '../context/AuthContext';
import { ChatUnreadContext } from '../context/ChatUnreadContext';
import { RootStackParamList } from '../navigation/AppNavigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyChats'>;
};

const formatRelativeTime = (isoString: string | null): string => {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(isoString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const MyChatsScreen: React.FC<Props> = ({ navigation }) => {
  const { session, setSession } = useContext(AuthContext);
  const { setTotalUnread } = useContext(ChatUnreadContext);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    try {
      setError(null);
      const data = await chatService.getMyChats();
      setChats(data);
      const total = data.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      setTotalUnread(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setTotalUnread]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadChats();
    }, [loadChats])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const handleLogout = async () => {
    setSession(null);
  };

  const navigateToChat = (chat: ChatPreview) => {
    navigation.navigate('Chat', {
      excursionId: chat.excursionId.toString(),
      excursionTitle: chat.titulo,
      excursionStatus: chat.excursionStatus,
    });
  };

  const renderChat = ({ item }: { item: ChatPreview }) => {
    const hasUnread = item.unreadCount > 0;
    const isFinished = item.excursionStatus === 'finished';

    const previewText = item.lastMsgContenido
      ? item.lastMsgIsOwn
        ? `Tú: ${item.lastMsgContenido}`
        : `${item.lastMsgUsername ?? 'Usuario'}: ${item.lastMsgContenido}`
      : 'Sin mensajes todavía';

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => navigateToChat(item)} activeOpacity={0.7}>
        <View style={styles.avatarCircle}>
          <MaterialDesignIcons name="hiking" size={22} color={colors.white} />
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatTitle, hasUnread && styles.chatTitleUnread]} numberOfLines={1}>
              {item.titulo}
            </Text>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
              {formatRelativeTime(item.lastMsgAt)}
            </Text>
          </View>

          <View style={styles.chatBottomRow}>
            <Text
              style={[styles.chatPreview, hasUnread && styles.chatPreviewUnread]}
              numberOfLines={1}
            >
              {previewText}
            </Text>
            <View style={styles.chatMeta}>
              {isFinished && (
                <View style={styles.finishedBadge}>
                  <Text style={styles.finishedBadgeText}>Finalizada</Text>
                </View>
              )}
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={shared.container}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={shared.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={shared.headerTitle}>Mis Chats</Text>
          <Text style={shared.headerSubtitle}>Conversaciones de tus excursiones</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialDesignIcons name="logout" size={22} color={colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
          <Text style={styles.loadingText}>Cargando chats...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChats}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.excursionId.toString()}
          renderItem={renderChat}
          contentContainerStyle={[
            styles.listContent,
            chats.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primaryGradientStart]}
              tintColor={colors.primaryGradientStart}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Sin chats activos</Text>
              <Text style={styles.emptySubtitle}>
                Únete a una excursión para acceder a su chat de grupo
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

export default MyChatsScreen;

const styles = StyleSheet.create({
  logoutButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: colors.hardText,
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primaryGradientStart,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    gap: 12,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  chatTitleUnread: {
    fontWeight: '700',
  },
  chatTime: {
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 0,
  },
  chatTimeUnread: {
    color: colors.primaryGradientStart,
    fontWeight: '600',
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  chatPreviewUnread: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  unreadBadge: {
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  finishedBadge: {
    backgroundColor: colors.grayLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  finishedBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginLeft: 78,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
