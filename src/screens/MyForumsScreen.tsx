import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService, ForumSummary } from '../services/forumService';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MyForumsScreen = () => {
  const navigation = useNavigation<Nav>();
  const [foros, setForos] = useState<ForumSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const data = await forumService.getMyForums();
      setForos(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, [cargar]));

  const renderForo = ({ item }: { item: ForumSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ForumDetail', { foroId: item.id, foroTitulo: item.titulo })}
    >
      {item.portada_url ? (
        <Image source={{ uri: item.portada_url }} style={styles.portada} />
      ) : (
        <View style={[styles.portada, styles.portadaPlaceholder]}>
          <MaterialDesignIcons name="forum" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.codigo}>#{item.codigo}</Text>
        </View>
        <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
        <View style={styles.cardFooter}>
          <View style={[styles.badge, item.tipo === 'privado' ? styles.badgePrivado : styles.badgePublico]}>
            <Text style={styles.badgeText}>{item.tipo === 'privado' ? 'Privado' : 'Público'}</Text>
          </View>
          {item.isModerador && (
            <View style={[styles.badge, styles.badgeModerador]}>
              <Text style={styles.badgeText}>Moderador</Text>
            </View>
          )}
          <Text style={styles.members}>
            <MaterialDesignIcons name="account-group" size={13} color={colors.textMuted} /> {item.memberCount}
          </Text>
        </View>
        {item.categorias.length > 0 && (
          <Text style={styles.categorias} numberOfLines={1}>
            {item.categorias.join(' · ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={shared.container}>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ExploreForums')}>
          <MaterialDesignIcons name="magnify" size={18} color={colors.white} />
          <Text style={styles.actionBtnText}>Explorar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => navigation.navigate('CreateForum')}>
          <MaterialDesignIcons name="plus" size={18} color={colors.primaryGradientStart} />
          <Text style={[styles.actionBtnText, { color: colors.primaryGradientStart }]}>Crear foro</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryGradientStart} />
      ) : error ? (
        <Text style={[shared.errorText, { margin: 20 }]}>{error}</Text>
      ) : (
        <FlatList
          data={foros}
          keyExtractor={item => String(item.id)}
          renderItem={renderForo}
          contentContainerStyle={foros.length === 0 ? styles.emptyContainer : { padding: 16 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[colors.primaryGradientStart]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialDesignIcons name="forum-outline" size={64} color={colors.grayLight} />
              <Text style={styles.emptyTitle}>Sin foros todavía</Text>
              <Text style={styles.emptyText}>Explora y únete a foros o crea el tuyo propio.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primaryGradientStart,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  portada: {
    width: '100%',
    height: 100,
  },
  portadaPlaceholder: {
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  codigo: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
  descripcion: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgePublico: { backgroundColor: colors.infoBg },
  badgePrivado: { backgroundColor: '#FEF3C7' },
  badgeModerador: { backgroundColor: colors.successGreen + '22' },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  members: { fontSize: 12, color: colors.textMuted, marginLeft: 'auto' },
  categorias: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});

export default MyForumsScreen;
