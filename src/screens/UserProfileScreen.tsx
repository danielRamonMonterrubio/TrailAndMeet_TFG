import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { profileService, UserProfile, ExcursionResumen, Valoraciones, calcularEdad } from '../services/profileService';
import { friendService, FriendshipStatus } from '../services/friendService';
import { RootStackParamList } from '../navigation/AppNavigation';

interface RouteParams {
  userId: string;
  username: string;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  Facil: 'Fácil',
  Medio: 'Medio',
  Dificil: 'Difícil',
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Facil: { bg: colors.easyBg, text: colors.easyText },
  Medio: { bg: colors.mediumBg, text: colors.mediumText },
  Dificil: { bg: colors.hardBg, text: colors.hardText },
};

const ExcursionMiniCard: React.FC<{ excursion: ExcursionResumen }> = ({ excursion }) => {
  const dc = DIFFICULTY_COLORS[excursion.dificultad] ?? { bg: colors.backgroundSoft, text: colors.textSecondary };
  const date = new Date(excursion.fechaInicio).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <View style={miniStyles.card}>
      <View style={miniStyles.info}>
        <Text style={miniStyles.title} numberOfLines={1}>{excursion.titulo}</Text>
        <Text style={miniStyles.meta}>{excursion.tipoExcursion} · {date}</Text>
      </View>
      <View style={[miniStyles.badge, { backgroundColor: dc.bg }]}>
        <Text style={[miniStyles.badgeText, { color: dc.text }]}>
          {DIFFICULTY_LABELS[excursion.dificultad] ?? excursion.dificultad}
        </Text>
      </View>
    </View>
  );
};

const miniStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

const VAL_LABELS: Array<{ key: 'puntualidad' | 'seguridad' | 'trato' | 'preparacion'; label: string; icon: React.ComponentProps<typeof MaterialDesignIcons>['name'] }> = [
  { key: 'puntualidad', label: 'Puntualidad', icon: 'clock-outline' },
  { key: 'seguridad', label: 'Seguridad', icon: 'shield-check-outline' },
  { key: 'trato', label: 'Trato', icon: 'handshake-outline' },
  { key: 'preparacion', label: 'Preparación', icon: 'bag-personal-outline' },
];

const StarDisplay: React.FC<{ value: number }> = ({ value }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <MaterialDesignIcons
        key={n}
        name={n <= Math.round(value) ? 'star' : 'star-outline'}
        size={14}
        color={n <= Math.round(value) ? colors.starAmber : colors.grayLight}
      />
    ))}
  </View>
);

const ValoracionesCard: React.FC<{ valoraciones: Valoraciones | null }> = ({ valoraciones }) => (
  <View style={shared.card}>
    <Text style={valStyles.sectionLabel}>Valoraciones</Text>
    {valoraciones ? (
      <>
        <View style={valStyles.globalRow}>
          <View style={valStyles.globalScore}>
            <Text style={valStyles.globalNum}>{valoraciones.mediaGlobal.toFixed(1)}</Text>
            <MaterialDesignIcons name="star" size={22} color={colors.starAmber} />
          </View>
          <Text style={valStyles.totalText}>{valoraciones.total} valoración{valoraciones.total !== 1 ? 'es' : ''}</Text>
        </View>
        <View style={valStyles.divider} />
        {VAL_LABELS.map(({ key, label, icon }) => (
          <View key={key} style={valStyles.detailRow}>
            <View style={valStyles.detailLeft}>
              <MaterialDesignIcons name={icon} size={15} color={colors.primaryGradientStart} />
              <Text style={valStyles.detailLabel}>{label}</Text>
            </View>
            <View style={valStyles.detailRight}>
              <StarDisplay value={valoraciones[key]} />
              <Text style={valStyles.detailNum}>{valoraciones[key].toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </>
    ) : (
      <View style={valStyles.emptyRow}>
        <MaterialDesignIcons name="star-off-outline" size={20} color={colors.textMuted} />
        <Text style={valStyles.emptyText}>Sin valoraciones todavía</Text>
      </View>
    )}
  </View>
);

const UserProfileScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { userId, username } = route.params as RouteParams;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [asistidas, setAsistidas] = useState<ExcursionResumen[]>([]);
  const [activas, setActivas] = useState<ExcursionResumen[]>([]);
  const [valoraciones, setValoraciones] = useState<Valoraciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>('none');
  const [amistadId, setAmistadId] = useState<string | undefined>(undefined);
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadFriendStatus();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getUserProfile(userId);
      setProfile(data.profile);
      setAsistidas(data.excursionesAsistidas);
      setActivas(data.excursionesActivas);
      setValoraciones(data.valoraciones ?? null);
    } catch (err) {
      console.error('Error cargando perfil de usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendStatus = async () => {
    try {
      const result = await friendService.getFriendshipStatus(userId);
      setFriendStatus(result.status);
      setAmistadId(result.amistadId);
    } catch {
      // si falla, dejamos status 'none' silenciosamente
    }
  };

  const enviarSolicitud = async () => {
    setFriendLoading(true);
    try {
      await friendService.sendFriendRequest(userId);
      setFriendStatus('pending_sent');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFriendLoading(false);
    }
  };

  const responderSolicitud = async (accion: 'accepted' | 'rejected') => {
    if (!amistadId) return;
    setFriendLoading(true);
    try {
      await friendService.respondFriendRequest(amistadId, accion);
      setFriendStatus(accion === 'accepted' ? 'accepted' : 'none');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFriendLoading(false);
    }
  };

  const eliminarAmigo = () => {
    Alert.alert(
      'Eliminar amigo',
      `¿Quieres eliminar a @${profile?.nombreUsuario ?? username} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            setFriendLoading(true);
            try {
              await friendService.removeFriend(userId);
              setFriendStatus('none');
              setAmistadId(undefined);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFriendLoading(false);
            }
          },
        },
      ]
    );
  };

  const avatarLetter = (profile?.nombreUsuario ?? username).charAt(0).toUpperCase();
  const fullName = [profile?.nombre, profile?.apellido].filter(Boolean).join(' ');
  const edad = profile?.mostrarEdad && profile.fechaNacimiento
    ? calcularEdad(profile.fechaNacimiento)
    : null;

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>@{username}</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Identidad ── */}
          <View style={styles.identityCard}>
            {profile?.fotoUrl ? (
              <Image source={{ uri: profile.fotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
            <Text style={styles.username}>@{profile?.nombreUsuario ?? username}</Text>
            {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
            {edad !== null ? (
              <View style={styles.edadBadge}>
                <Text style={styles.edadText}>{edad} años</Text>
              </View>
            ) : null}
          </View>

          {/* ── Botón amistad ── */}
          <View style={styles.friendBtnContainer}>
            {friendLoading ? (
              <ActivityIndicator color={colors.primaryGradientStart} />
            ) : friendStatus === 'none' ? (
              <TouchableOpacity style={styles.friendBtnPrimary} onPress={enviarSolicitud}>
                <MaterialDesignIcons name="account-plus" size={18} color={colors.white} />
                <Text style={styles.friendBtnPrimaryText}>Añadir amigo</Text>
              </TouchableOpacity>
            ) : friendStatus === 'pending_sent' ? (
              <View style={styles.friendBtnDisabled}>
                <MaterialDesignIcons name="account-clock-outline" size={18} color={colors.textMuted} />
                <Text style={styles.friendBtnDisabledText}>Solicitud enviada</Text>
              </View>
            ) : friendStatus === 'pending_received' ? (
              <View style={styles.friendBtnRow}>
                <TouchableOpacity style={[styles.friendBtnPrimary, { flex: 1 }]} onPress={() => responderSolicitud('accepted')}>
                  <MaterialDesignIcons name="check" size={18} color={colors.white} />
                  <Text style={styles.friendBtnPrimaryText}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.friendBtnSecondary, { flex: 1 }]} onPress={() => responderSolicitud('rejected')}>
                  <Text style={styles.friendBtnSecondaryText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.friendBtnSecondary} onPress={eliminarAmigo}>
                <MaterialDesignIcons name="account-check" size={18} color={colors.primaryGradientStart} />
                <Text style={styles.friendBtnSecondaryText}>Amigos · Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Sobre mí ── */}
          <View style={shared.card}>
            <Text style={styles.sectionLabel}>Sobre mí</Text>
            {profile?.descripcion ? (
              <Text style={styles.bodyText}>{profile.descripcion}</Text>
            ) : (
              <Text style={styles.placeholderText}>¡Hey, me encanta TrailAndMeet! ⛰️</Text>
            )}
          </View>

          {/* ── Especialidades ── */}
          <View style={shared.card}>
            <Text style={styles.sectionLabel}>Especialidades</Text>
            {profile?.especialidades && profile.especialidades.length > 0 ? (
              <View style={styles.gap10}>
                {profile.especialidades.map((e, i) => {
                  const dc = DIFFICULTY_COLORS[e.nivel] ?? { bg: colors.backgroundSoft, text: colors.textSecondary };
                  return (
                    <View key={i} style={styles.especialidadRow}>
                      <View style={styles.especialidadLeft}>
                        <MaterialDesignIcons name="hiking" size={16} color={colors.primaryGradientStart} />
                        <Text style={styles.especialidadTipo}>{e.tipo}</Text>
                      </View>
                      <View style={[styles.nivelBadge, { backgroundColor: dc.bg }]}>
                        <Text style={[styles.nivelBadgeText, { color: dc.text }]}>
                          {DIFFICULTY_LABELS[e.nivel] ?? e.nivel}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyRow}>
                <MaterialDesignIcons name="hiking" size={18} color={colors.textMuted} />
                <Text style={styles.emptyRowText}>Sin especialidades añadidas</Text>
              </View>
            )}
          </View>

          {/* ── Material ── */}
          <View style={shared.card}>
            <Text style={styles.sectionLabel}>Material disponible</Text>
            {profile?.materialDisponible ? (
              <Text style={styles.bodyText}>{profile.materialDisponible}</Text>
            ) : (
              <View style={styles.emptyRow}>
                <MaterialDesignIcons name="bag-personal-outline" size={18} color={colors.textMuted} />
                <Text style={styles.emptyRowText}>Sin material indicado</Text>
              </View>
            )}
          </View>

          {/* ── Excursiones activas ── */}
          {activas.length > 0 && (
            <View style={shared.card}>
              <Text style={styles.sectionLabel}>
                Apuntado · {activas.length} excursión{activas.length !== 1 ? 'es' : ''}
              </Text>
              <View style={styles.gap10}>
                {activas.map(exc => <ExcursionMiniCard key={exc.id} excursion={exc} />)}
              </View>
            </View>
          )}

          {/* ── Excursiones asistidas ── */}
          {asistidas.length > 0 && (
            <View style={shared.card}>
              <Text style={styles.sectionLabel}>
                Asistidas · {asistidas.length} excursión{asistidas.length !== 1 ? 'es' : ''}
              </Text>
              <View style={styles.gap10}>
                {asistidas.map(exc => <ExcursionMiniCard key={exc.id} excursion={exc} />)}
              </View>
            </View>
          )}

          {activas.length === 0 && asistidas.length === 0 && (
            <View style={[shared.card, styles.emptyExcCard]}>
              <MaterialDesignIcons name="map-marker-off-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyExcText}>Sin excursiones registradas todavía</Text>
            </View>
          )}

          {/* ── Valoraciones ── */}
          <ValoracionesCard valoraciones={valoraciones} />

        </ScrollView>
      )}
    </View>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  identityCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 6,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 4 },
  avatarLetter: { fontSize: 40, fontWeight: '700', color: colors.white },
  username: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  fullName: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  edadBadge: {
    marginTop: 4,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  edadText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  bodyText: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  placeholderText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', lineHeight: 21 },
  gap10: { gap: 10 },
  especialidadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  especialidadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  especialidadTipo: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  nivelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  nivelBadgeText: { fontSize: 12, fontWeight: '700' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyRowText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  emptyExcCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  emptyExcText: { fontSize: 14, color: colors.textMuted },
  friendBtnContainer: { paddingHorizontal: 16 },
  friendBtnRow: { flexDirection: 'row', gap: 10 },
  friendBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  friendBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  friendBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: colors.primaryGradientStart,
    backgroundColor: colors.white,
  },
  friendBtnSecondaryText: { color: colors.primaryGradientStart, fontWeight: '700', fontSize: 15 },
  friendBtnDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  friendBtnDisabledText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
});

const valStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  globalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  globalScore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  globalNum: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  totalText: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.grayLight, marginVertical: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  detailRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailNum: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, minWidth: 28, textAlign: 'right' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
});
