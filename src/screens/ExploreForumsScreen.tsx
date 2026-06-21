import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image, ScrollView, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService, ForumSummary } from '../services/forumService';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIAS = [
  'Zonas geográficas', 'Niveles técnicos', 'Meteorología',
  'Material', 'Seguridad', 'Entrenamiento', 'Refugios', 'Iniciación',
];

const ExploreForumsScreen = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [foros, setForos] = useState<ForumSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (texto: string, cat: string | null, offset = 0) => {
    if (offset === 0) setLoading(true);
    else setCargandoMas(true);
    setError(null);
    try {
      const result = await forumService.getForums({
        search: texto.trim() || undefined,
        categoria: cat ?? undefined,
        offset,
        limit: 20,
        excludeJoined: true,
      });
      if (offset === 0) {
        setForos(result.foros);
      } else {
        setForos(prev => [...prev, ...result.foros]);
      }
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setCargandoMas(false);
    }
  }, []);

  const onSearchChange = (texto: string) => {
    setSearch(texto);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => buscar(texto, categoriaActiva), 400);
  };

  const onCategoriaPress = (cat: string) => {
    const nueva = categoriaActiva === cat ? null : cat;
    setCategoriaActiva(nueva);
    buscar(search, nueva);
  };

  useFocusEffect(useCallback(() => {
    buscar('', null);
  }, [buscar]));

  const cargarMas = () => {
    if (!cargandoMas && foros.length < total) {
      buscar(search, categoriaActiva, foros.length);
    }
  };

  const renderForo = ({ item }: { item: ForumSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ForumDetail', { foroId: item.id, foroTitulo: item.titulo })}
    >
      {item.portada_url ? (
        <Image source={{ uri: item.portada_url }} style={styles.portada} />
      ) : (
        <View style={[styles.portada, styles.portadaPlaceholder]}>
          <MaterialDesignIcons name="forum" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.titulo} numberOfLines={1}>{item.titulo}</Text>
          <Text style={styles.codigo}>#{item.codigo}</Text>
        </View>
        <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
        <View style={styles.cardFooter}>
          {item.tipo === 'privado' && (
            <View style={[styles.badge, styles.badgePrivado]}>
              <MaterialDesignIcons name="lock" size={11} color={colors.textPrimary} />
              <Text style={styles.badgeText}> Privado</Text>
            </View>
          )}
          {item.isMember && (
            <View style={[styles.badge, styles.badgeUnido]}>
              <Text style={styles.badgeText}>Unido</Text>
            </View>
          )}
          <Text style={styles.members}>
            <MaterialDesignIcons name="account-group" size={13} color={colors.textMuted} /> {item.memberCount}
          </Text>
        </View>
        {item.categorias.length > 0 && (
          <Text style={styles.categorias} numberOfLines={1}>{item.categorias.join(' · ')}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={shared.screenTitle}>Explorar Foros</Text>
      </View>

      <View style={styles.searchRow}>
        <MaterialDesignIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por título o #código..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={onSearchChange}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); buscar('', categoriaActiva); }}>
            <MaterialDesignIcons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORIAS.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, categoriaActiva === cat && styles.chipActivo]}
            onPress={() => onCategoriaPress(cat)}
          >
            <Text style={[styles.chipText, categoriaActiva === cat && styles.chipTextActivo]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => buscar(search, categoriaActiva)} colors={[colors.primaryGradientStart]} />}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.3}
          ListFooterComponent={cargandoMas ? <ActivityIndicator color={colors.primaryGradientStart} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialDesignIcons name="forum-remove-outline" size={56} color={colors.grayLight} />
              <Text style={styles.emptyText}>
                {search.length > 0 || categoriaActiva
                  ? 'No se encontraron foros'
                  : 'No hay foros públicos disponibles'}
              </Text>
            </View>
          }
        />
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderColor,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chips: { maxHeight: 44, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  chipActivo: {
    backgroundColor: colors.primaryGradientStart,
    borderColor: colors.primaryGradientStart,
  },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  chipTextActivo: { color: colors.white },
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
  portada: { width: '100%', height: 90 },
  portadaPlaceholder: { backgroundColor: colors.backgroundSoft, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titulo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  codigo: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  descripcion: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgePrivado: { backgroundColor: '#FEF3C7' },
  badgeUnido: { backgroundColor: colors.successGreen + '22' },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.textPrimary },
  members: { fontSize: 12, color: colors.textMuted, marginLeft: 'auto' },
  categorias: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  emptyContainer: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
});

export default ExploreForumsScreen;
