import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { profileService, UserProfile, calcularEdad } from '../services/profileService';
import { RootStackParamList } from '../navigation/AppNavigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
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

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getOwnProfile();
      setProfile(data);
    } catch (err) {
      console.error('Error cargando perfil propio:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primaryGradientStart} />
      </View>
    );
  }

  const avatarLetter = profile?.nombreUsuario?.charAt(0).toUpperCase() ?? '?';
  const fullName = [profile?.nombre, profile?.apellido].filter(Boolean).join(' ');
  const edad = profile?.mostrarEdad && profile.fechaNacimiento
    ? calcularEdad(profile.fechaNacimiento)
    : null;

  return (
    <View style={shared.container}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={shared.headerTitle}>Mi Perfil</Text>
        <Text style={shared.headerSubtitle}>Tu presencia en la comunidad</Text>
      </LinearGradient>

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
          <Text style={styles.username}>@{profile?.nombreUsuario}</Text>
          {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
          {edad !== null ? (
            <View style={styles.edadBadge}>
              <Text style={styles.edadText}>{edad} años</Text>
            </View>
          ) : null}
        </View>

        {/* ── Sobre mí ── */}
        <View style={shared.card}>
          <Text style={styles.sectionLabel}>Sobre mí</Text>
          {profile?.descripcion ? (
            <Text style={styles.bodyText}>{profile.descripcion}</Text>
          ) : (
            <Text style={styles.placeholderText}>
              ¡Hey, me encanta TrailAndMeet! ⛰️
            </Text>
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

        {/* ── Botones ── */}
        <TouchableOpacity
          style={shared.primaryButton}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.85}
        >
          <MaterialDesignIcons name="pencil-outline" size={18} color={colors.white} />
          <Text style={shared.primaryButtonText}>Editar perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => navigation.navigate('UserSearch')}
          activeOpacity={0.85}
        >
          <MaterialDesignIcons name="account-search-outline" size={18} color={colors.primaryGradientStart} />
          <Text style={styles.outlineButtonText}>Buscar usuarios</Text>
        </TouchableOpacity>

        {/* ── Valoraciones (al final) ── */}
        <View style={[shared.card, styles.proximamenteCard]}>
          <View style={styles.proximamenteHeader}>
            <MaterialDesignIcons name="star-outline" size={20} color={colors.textMuted} />
            <Text style={styles.sectionLabel}>Valoraciones</Text>
            <View style={styles.proximamenteBadge}>
              <Text style={styles.proximamenteTag}>Próximamente</Text>
            </View>
          </View>
          <Text style={styles.proximamenteDesc}>
            Pronto podrás ver valoraciones de puntualidad, seguridad, trato y preparación
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
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
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 4,
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.white,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fullName: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  edadBadge: {
    marginTop: 4,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  edadText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  gap10: { gap: 10 },
  especialidadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  especialidadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  especialidadTipo: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  nivelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nivelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyRowText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primaryGradientStart,
    borderRadius: 12,
    paddingVertical: 14,
  },
  outlineButtonText: {
    color: colors.primaryGradientStart,
    fontWeight: '700',
    fontSize: 15,
  },
  proximamenteCard: {
    gap: 10,
  },
  proximamenteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proximamenteBadge: {
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryGradientStart,
    marginLeft: 'auto',
  },
  proximamenteTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGradientStart,
  },
  proximamenteDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
