import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList } from '../navigation/AppNavigation';
import { forumService, ForumMember } from '../services/forumService';
import { shared } from '../theme/styles';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ForumMembers'>;

type MemberItem = ForumMember & { esModerador: boolean };

const ForumMembersScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { foroId } = route.params;

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isModerador, setIsModerador] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kicking, setKicking] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await forumService.getForumMembers(foroId);
      setMembers(data.members);
      setIsModerador(data.isModerador);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [foroId]);

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, [cargar]));

  const expulsar = (miembro: MemberItem) => {
    Alert.alert(
      'Expulsar miembro',
      `¿Expulsar a @${miembro.nombreUsuario} del foro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expulsar', style: 'destructive', onPress: async () => {
            setKicking(miembro.usuarioId);
            try {
              await forumService.kickMember(foroId, miembro.usuarioId);
              setMembers(prev => prev.filter(m => m.usuarioId !== miembro.usuarioId));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setKicking(null);
            }
          },
        },
      ]
    );
  };

  const renderMiembro = ({ item }: { item: MemberItem }) => (
    <TouchableOpacity style={styles.memberCard} onPress={() => navigation.navigate('UserProfile', { userId: item.usuarioId, username: item.nombreUsuario })} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.nombreUsuario[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.username}>@{item.nombreUsuario}</Text>
          {item.esModerador && (
            <View style={styles.modBadge}>
              <Text style={styles.modBadgeText}>Moderador</Text>
            </View>
          )}
        </View>
        <Text style={styles.fecha}>Unido el {new Date(item.fechaUnion).toLocaleDateString('es-ES')}</Text>
      </View>
      {isModerador && !item.esModerador && (
        <TouchableOpacity
          style={[styles.kickBtn, kicking === item.usuarioId && { opacity: 0.5 }]}
          onPress={(e) => { e.stopPropagation?.(); expulsar(item); }}
          disabled={kicking === item.usuarioId}
        >
          {kicking === item.usuarioId
            ? <ActivityIndicator size="small" color={colors.errorRed} />
            : <MaterialDesignIcons name="account-remove" size={20} color={colors.errorRed} />
          }
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={shared.screenTitle}>Miembros ({members.length})</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryGradientStart} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.usuarioId}
          renderItem={renderMiembro}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[colors.primaryGradientStart]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialDesignIcons name="account-group-outline" size={56} color={colors.grayLight} />
              <Text style={styles.emptyText}>Sin miembros todavía</Text>
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
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primaryGradientStart },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  modBadge: {
    backgroundColor: colors.successGreen + '22',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modBadgeText: { fontSize: 10, fontWeight: '600', color: colors.textPrimary },
  fecha: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  kickBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
});

export default ForumMembersScreen;
