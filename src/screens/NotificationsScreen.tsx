import React, { useCallback, useContext, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Alert, Pressable, StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { colors } from '../theme/colors';
import { getNotifications, markNotificationsRead, Notificacion } from '../services/notificationService';
import { NotificationContext } from '../context/NotificationContext';

const ICON_MAP: Record<string, React.ComponentProps<typeof MaterialDesignIcons>['name']> = {
  join_request: 'account-plus',
  request_accepted: 'check-circle',
  request_rejected: 'close-circle',
  left_excursion: 'account-minus',
  attendance_confirmed: 'checkbox-marked-circle',
  excursion_deleted: 'delete-circle',
  excursion_finished: 'flag-checkered',
  new_message: 'message',
  new_comment: 'comment',
  kicked_from_forum: 'account-remove',
};

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { setUnreadCount } = useContext(NotificationContext);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notificacion | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { notificaciones: data, unreadCount } = await getNotifications();
      setNotificaciones(data);
      setUnreadCount(unreadCount);
    } catch (e) {
      console.error('Error cargando notificaciones:', e);
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const handlePress = async (item: Notificacion) => {
    setSelected(item);
    if (!item.leida) {
      setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leida: true } : n));
      setUnreadCount(Math.max(0, notificaciones.filter(n => !n.leida).length - 1));
      markNotificationsRead(item.id).catch(() => {});
    }
  };

  const handleMarkAllRead = () => {
    const hayNoLeidas = notificaciones.some(n => !n.leida);
    if (!hayNoLeidas) return;
    Alert.alert(
      'Marcar todo como leído',
      '¿Quieres marcar todas las notificaciones como leídas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar todo',
          onPress: async () => {
            setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
            setUnreadCount(0);
            markNotificationsRead().catch(() => {});
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Notificacion }) => {
    const iconName = ICON_MAP[item.tipo] ?? 'bell';
    return (
      <TouchableOpacity
        style={[styles.item, !item.leida && styles.itemUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        {!item.leida && <View style={styles.unreadBar} />}
        <View style={[styles.iconWrap, !item.leida && styles.iconWrapUnread]}>
          <MaterialDesignIcons name={iconName} size={22} color={item.leida ? colors.textMuted : colors.primaryGradientStart} />
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.titulo, !item.leida && styles.tituloUnread]}>{item.titulo}</Text>
          <Text style={styles.cuerpo} numberOfLines={2}>{item.cuerpo}</Text>
          <Text style={styles.tiempo}>{tiempoRelativo(item.createdAt)}</Text>
        </View>
        {!item.leida && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  const hayNoLeidas = notificaciones.some(n => !n.leida);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <MaterialDesignIcons name="arrow-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={10} disabled={!hayNoLeidas}>
          <MaterialDesignIcons name="check-all" size={24} color={hayNoLeidas ? colors.primaryGradientStart : colors.grayLight} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryGradientStart} />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={cargar} colors={[colors.primaryGradientStart]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialDesignIcons name="bell-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Sin notificaciones</Text>
            </View>
          }
        />
      )}

      {/* Modal detalle */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            {selected && (
              <>
                <View style={styles.modalIconWrap}>
                  <MaterialDesignIcons
                    name={ICON_MAP[selected.tipo] ?? 'bell'}
                    size={36}
                    color={colors.primaryGradientStart}
                  />
                </View>
                <Text style={styles.modalTitulo}>{selected.titulo}</Text>
                <Text style={styles.modalCuerpo}>{selected.cuerpo}</Text>
                <Text style={styles.modalTiempo}>{tiempoRelativo(selected.createdAt)}</Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.modalBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 24) + 8,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  itemUnread: {
    backgroundColor: colors.infoBg,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapUnread: {
    backgroundColor: colors.headerSubtitle,
  },
  itemBody: {
    flex: 1,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  tituloUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cuerpo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tiempo: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryGradientStart,
    marginLeft: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalCuerpo: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalTiempo: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalBtn: {
    marginTop: 8,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
