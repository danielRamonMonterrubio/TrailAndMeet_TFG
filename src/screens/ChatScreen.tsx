import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { chatService, ChatMessage } from '../services/chatService';
import { AuthContext } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigation';

// Extiende ChatMessage con estado de envío local (nunca llega del servidor)
type LocalMessage = ChatMessage & { sending?: boolean };

interface RouteParams {
  excursionId: string;
  excursionTitle: string;
  excursionStatus: string;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (isoString: string): string => {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const isSameDay = (a: string, b: string): boolean =>
  new Date(a).toDateString() === new Date(b).toDateString();

const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { excursionId, excursionTitle, excursionStatus } = route.params as RouteParams;
  const { session } = useContext(AuthContext);
  const myUserId = session?.user?.id ?? '';

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [usernameCache, setUsernameCache] = useState<Record<string, string>>({});

  const flatListRef = useRef<FlatList>(null);
  const isFinished = excursionStatus === 'finished';

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { messages: msgs, hasMore: more } = await chatService.getChatMessages(excursionId);
      setMessages(msgs);
      setHasMore(more);
      // Poblar caché de nombres
      const cache: Record<string, string> = {};
      msgs.forEach(m => {
        if (m.usuario) cache[m.usuarioId] = m.usuario.nombreUsuario;
      });
      setUsernameCache(cache);
      // Marcar como leído al abrir
      chatService.markChatRead(excursionId);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar el chat');
    } finally {
      setLoading(false);
    }
  }, [excursionId]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestId = messages[0].id;
      const { messages: older, hasMore: more } = await chatService.getChatMessages(
        excursionId,
        oldestId
      );
      setMessages(prev => [...older, ...prev]);
      setHasMore(more);
      // Añadir nuevos usuarios al caché
      setUsernameCache(prev => {
        const updated = { ...prev };
        older.forEach(m => {
          if (m.usuario) updated[m.usuarioId] = m.usuario.nombreUsuario;
        });
        return updated;
      });
    } catch {
      // Silencioso: no bloquear si falla cargar más
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Suscripción Realtime
  useEffect(() => {
    const channel = chatService.subscribeToChatMessages(excursionId, (newMsg) => {
      setMessages(prev => {
        // Deduplicar: evitar añadir si ya existe (puede llegar antes que la respuesta HTTP)
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, sending: false }];
      });
      chatService.markChatRead(excursionId);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [excursionId]);

  // Scroll al fondo cuando cargan los mensajes iniciales
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [loading]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSending(true);

    // Bubble en estado "enviando": aparece con spinner hasta que el servidor confirma
    const tempId = Date.now();
    const pendingMsg: LocalMessage = {
      id: tempId,
      excursionId: parseInt(excursionId, 10),
      usuarioId: myUserId,
      contenido: text,
      createdAt: new Date().toISOString(),
      sending: true,
    };
    setMessages(prev => [...prev, pendingMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const realMsg = await chatService.sendMessage(excursionId, text);
      // Servidor confirmó: sustituir el bubble pendiente por el mensaje real
      setMessages(prev => {
        const sinPendiente = prev.filter(m => m.id !== tempId);
        // Si Realtime ya lo añadió antes de que llegara la respuesta HTTP, no duplicar
        if (sinPendiente.some(m => m.id === realMsg.id)) return sinPendiente;
        return [...sinPendiente, { ...realMsg, sending: false }];
      });
    } catch (err) {
      // El servidor rechazó el mensaje: eliminar el bubble pendiente
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(text);
      Alert.alert('Error al enviar', err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const getUserName = (msg: ChatMessage): string => {
    if (msg.usuario?.nombreUsuario) return msg.usuario.nombreUsuario;
    return usernameCache[msg.usuarioId] ?? 'Usuario';
  };

  const renderMessage = ({ item, index }: { item: LocalMessage; index: number }) => {
    const isOwn = item.usuarioId === myUserId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = !prevMsg || !isSameDay(prevMsg.createdAt, item.createdAt);
    const showName = !isOwn && (!prevMsg || prevMsg.usuarioId !== item.usuarioId || showDateSeparator);

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
          {!isOwn && (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {getUserName(item).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther]}>
            {showName && (
              <Text style={styles.senderName}>{getUserName(item)}</Text>
            )}
            <View style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
              item.sending && styles.bubbleSending,
            ]}>
              <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                {item.contenido}
              </Text>
              {item.sending ? (
                <ActivityIndicator size={10} color="rgba(255,255,255,0.7)" style={styles.sendingIndicator} />
              ) : (
                <Text style={[styles.timeText, isOwn ? styles.timeTextOwn : styles.timeTextOther]}>
                  {formatTime(item.createdAt)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={loadMoreMessages}
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color={colors.primaryGradientStart} />
        ) : (
          <Text style={styles.loadMoreText}>Cargar mensajes anteriores</Text>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyChat = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>¡Sin mensajes todavía!</Text>
      <Text style={styles.emptySubtitle}>Sé el primero en escribir algo</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{excursionTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {isFinished ? 'Excursión finalizada · Solo lectura' : 'Chat del grupo'}
          </Text>
        </View>
      </LinearGradient>

      {/* Lista de mensajes */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyChat />}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          onScrollToIndexFailed={() => {}}
        />
      )}

      {/* Input */}
      {isFinished ? (
        <View style={styles.finishedBanner}>
          <Text style={styles.finishedBannerText}>
            🏁 La excursión ha finalizado · Chat en solo lectura
          </Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialDesignIcons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.headerSubtitle,
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grayLight,
    marginBottom: 16,
    minHeight: 36,
    justifyContent: 'center',
  },
  loadMoreText: {
    color: colors.primaryGradientStart,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorText: {
    backgroundColor: colors.grayLight,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryGradientEnd,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  avatarText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  bubbleWrapperOwn: {
    alignItems: 'flex-end',
  },
  bubbleWrapperOther: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGradientStart,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleOwn: {
    backgroundColor: colors.primaryGradientStart,
    borderBottomRightRadius: 4,
  },
  bubbleSending: {
    opacity: 0.75,
  },
  sendingIndicator: {
    marginBottom: 1,
    flexShrink: 0,
  },
  bubbleOther: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 1,
  },
  bubbleTextOwn: {
    color: colors.white,
  },
  bubbleTextOther: {
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    marginBottom: 1,
    flexShrink: 0,
  },
  timeTextOwn: {
    color: 'rgba(255,255,255,0.75)',
  },
  timeTextOther: {
    color: colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.grayLight,
  },
  finishedBanner: {
    backgroundColor: colors.backgroundSoft,
    borderTopWidth: 1,
    borderTopColor: colors.grayLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  finishedBannerText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
