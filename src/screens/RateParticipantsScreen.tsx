import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { ratingService, ParticipanteValorable, RatingValues } from '../services/ratingService';
import { RootStackParamList } from '../navigation/AppNavigation';

interface RouteParams {
  excursionId: string;
  excursionTitle: string;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RateParticipants'>;
};

const RATING_LABELS: Record<keyof RatingValues, string> = {
  puntualidad: 'Puntualidad',
  seguridad: 'Seguridad',
  trato: 'Trato',
  preparacion: 'Preparación',
};

const RATING_ICONS: Record<keyof RatingValues, React.ComponentProps<typeof MaterialDesignIcons>['name']> = {
  puntualidad: 'clock-outline',
  seguridad: 'shield-check-outline',
  trato: 'handshake-outline',
  preparacion: 'bag-personal-outline',
};

const EMPTY_RATINGS: RatingValues = { puntualidad: 0, seguridad: 0, trato: 0, preparacion: 0 };

interface StarRowProps {
  label: string;
  icon: React.ComponentProps<typeof MaterialDesignIcons>['name'];
  value: number;
  onChange: (v: number) => void;
}

const StarRow: React.FC<StarRowProps> = ({ label, icon, value, onChange }) => (
  <View style={styles.starRow}>
    <View style={styles.starRowLabel}>
      <MaterialDesignIcons name={icon} size={16} color={colors.primaryGradientStart} />
      <Text style={styles.starRowLabelText}>{label}</Text>
    </View>
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <MaterialDesignIcons
            name={n <= value ? 'star' : 'star-outline'}
            size={28}
            color={n <= value ? colors.starAmber : colors.grayLight}
          />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const RateParticipantsScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { excursionId, excursionTitle } = route.params as RouteParams;

  const [participants, setParticipants] = useState<ParticipanteValorable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<ParticipanteValorable | null>(null);
  const [ratings, setRatings] = useState<RatingValues>(EMPTY_RATINGS);
  const [submitting, setSubmitting] = useState(false);

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ratingService.getExcursionRatings(excursionId);
      setParticipants(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [excursionId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const openModal = (p: ParticipanteValorable) => {
    setSelected(p);
    setRatings(EMPTY_RATINGS);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const handleSubmit = async () => {
    if (!selected) return;

    const keys = Object.keys(ratings) as (keyof RatingValues)[];
    if (keys.some(k => ratings[k] === 0)) {
      Alert.alert('Incompleto', 'Por favor valora todas las categorías antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      await ratingService.rateParticipant(excursionId, selected.usuarioId, ratings);
      setParticipants(prev =>
        prev.map(p => p.usuarioId === selected.usuarioId ? { ...p, yaValorado: true } : p)
      );
      closeModal();
      Alert.alert('¡Valoración enviada!', `Has valorado a @${selected.nombreUsuario} correctamente.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const pendientes = participants.filter(p => !p.yaValorado);
  const completados = participants.filter(p => p.yaValorado);

  const avatarLetter = (p: ParticipanteValorable) =>
    (p.nombreUsuario ?? '?').charAt(0).toUpperCase();

  const displayName = (p: ParticipanteValorable) => {
    const full = [p.nombre, p.apellido].filter(Boolean).join(' ');
    return full || `@${p.nombreUsuario}`;
  };

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Valorar participantes</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle} numberOfLines={2}>{excursionTitle}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
        </View>
      ) : participants.length === 0 ? (
        <View style={styles.center}>
          <MaterialDesignIcons name="account-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No hay participantes para valorar</Text>
          <Text style={styles.emptySubtext}>
            Solo los participantes que confirmaron asistencia pueden ser valorados
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>

          {pendientes.length > 0 && (
            <>
              <Text style={styles.groupLabel}>Pendientes · {pendientes.length}</Text>
              {pendientes.map(p => (
                <View key={p.usuarioId} style={styles.card}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarLetter(p)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{displayName(p)}</Text>
                    <Text style={styles.cardUsername}>@{p.nombreUsuario}</Text>
                  </View>
                  {p.esOrganizador && (
                    <View style={styles.orgBadge}>
                      <Text style={styles.orgBadgeText}>Org.</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.rateBtn} onPress={() => openModal(p)}>
                    <MaterialDesignIcons name="star-outline" size={16} color={colors.white} />
                    <Text style={styles.rateBtnText}>Valorar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {completados.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { marginTop: pendientes.length > 0 ? 16 : 0 }]}>
                Valorados · {completados.length}
              </Text>
              {completados.map(p => (
                <View key={p.usuarioId} style={[styles.card, styles.cardDone]}>
                  <View style={[styles.avatar, styles.avatarDone]}>
                    <Text style={styles.avatarText}>{avatarLetter(p)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.textMuted }]}>{displayName(p)}</Text>
                    <Text style={styles.cardUsername}>@{p.nombreUsuario}</Text>
                  </View>
                  <MaterialDesignIcons name="check-circle" size={24} color={colors.successGreen} />
                </View>
              ))}
            </>
          )}

        </ScrollView>
      )}

      {/* Modal de valoración */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Valorar a @{selected?.nombreUsuario}</Text>
            <Text style={styles.modalSubtitle}>
              Tu valoración es anónima. Puntúa del 1 al 5 en cada categoría.
            </Text>

            {(Object.keys(RATING_LABELS) as (keyof RatingValues)[]).map(key => (
              <StarRow
                key={key}
                label={RATING_LABELS[key]}
                icon={RATING_ICONS[key]}
                value={ratings[key]}
                onChange={v => setRatings(prev => ({ ...prev, [key]: v }))}
              />
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.submitBtnText}>Enviar valoración</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RateParticipantsScreen;

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
  subtitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: colors.white,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  list: { padding: 16, paddingBottom: 32, gap: 10 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardDone: { opacity: 0.75 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDone: { backgroundColor: colors.grayLight },
  avatarText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cardUsername: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  orgBadge: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primaryGradientStart,
  },
  orgBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryGradientStart },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rateBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalSubtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: -8 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starRowLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starRowLabelText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  starsContainer: { flexDirection: 'row', gap: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.grayLight,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 15 },
  submitBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: colors.primaryGradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
