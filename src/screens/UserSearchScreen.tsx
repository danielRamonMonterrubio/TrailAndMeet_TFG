import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { profileService, UserSearchResult } from '../services/profileService';
import { RootStackParamList } from '../navigation/AppNavigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserSearch'>;
};

const UserSearchScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await profileService.searchUsers(text.trim());
        setResults(data);
        setSearched(true);
      } catch (err) {
        console.error('Error buscando usuarios:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const renderItem = ({ item }: { item: UserSearchResult }) => {
    const avatarLetter = item.nombreUsuario.charAt(0).toUpperCase();
    const specialtyCount = item.especialidades?.length ?? 0;
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.nombreUsuario })}
        activeOpacity={0.7}
      >
        {item.fotoUrl ? (
          <Image source={{ uri: item.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultUsername}>@{item.nombreUsuario}</Text>
          {(item.nombre || item.apellido) ? (
            <Text style={styles.resultName}>
              {[item.nombre, item.apellido].filter(Boolean).join(' ')}
            </Text>
          ) : null}
          {specialtyCount > 0 ? (
            <Text style={styles.resultSpecialties}>
              {item.especialidades.slice(0, 2).map(e => e.tipo).join(' · ')}
              {specialtyCount > 2 ? ` +${specialtyCount - 2}` : ''}
            </Text>
          ) : null}
        </View>
        <MaterialDesignIcons name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar usuarios</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialDesignIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre de usuario..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <MaterialDesignIcons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
        </View>
      ) : query.trim().length < 2 ? (
        <View style={styles.centered}>
          <MaterialDesignIcons name="account-search-outline" size={48} color={colors.grayLight} />
          <Text style={styles.hintText}>Escribe al menos 2 caracteres para buscar</Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.centered}>
          <MaterialDesignIcons name="account-off-outline" size={48} color={colors.grayLight} />
          <Text style={styles.hintText}>No se encontraron usuarios con «{query}»</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

export default UserSearchScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
    backgroundColor: colors.white,
  },
  backButton: { width: 70 },
  backText: { color: colors.primaryGradientStart, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderColor,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  hintText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 1, backgroundColor: colors.grayLight, marginHorizontal: 4 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: colors.white },
  resultInfo: { flex: 1 },
  resultUsername: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  resultName: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  resultSpecialties: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
