import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { excursionRequestService, Participant } from '../services/excursionRequestService';
import { RootStackParamList } from '../navigation/AppNavigation';

interface RouteParams {
  excursionId: string;
  excursionTitle: string;
  organizerId: string;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ExcursionParticipants'>;
};

const ExcursionParticipantsScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { excursionId, excursionTitle, organizerId } = route.params as RouteParams;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await excursionRequestService.getExcursionParticipants(excursionId);
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

  return (
    <View style={shared.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Participantes</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle} numberOfLines={2}>{excursionTitle}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
        </View>
      ) : participants.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay participantes aceptados aún</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{participants.length} participante{participants.length !== 1 ? 's' : ''}</Text>
          </View>
          {participants.map(p => {
            const name = p.nombreUsuario ?? p.usuarioId;
            const isOwner = p.usuarioId === organizerId;
            return (
              <TouchableOpacity
                key={p.usuarioId}
                style={styles.participantCard}
                onPress={() => navigation.navigate('UserProfile', { userId: p.usuarioId, username: name })}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{name}</Text>
                  {p.fechaUnion && (
                    <Text style={styles.participantDate}>
                      Unido: {new Date(p.fechaUnion).toLocaleDateString('es-ES')}
                    </Text>
                  )}
                </View>
                {isOwner ? (
                  <View style={styles.ownerTag}>
                    <Text style={styles.ownerTagText}>Dueño</Text>
                  </View>
                ) : p.attendanceConfirmed ? (
                  <View style={styles.confirmedTag}>
                    <Text style={styles.confirmedTagText}>Confirmado</Text>
                  </View>
                ) : (
                  <View style={styles.acceptedTag}>
                    <Text style={styles.acceptedTagText}>Aceptado</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default ExcursionParticipantsScreen;

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
  subtitle: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, color: colors.textSecondary, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  list: { padding: 16, gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  summaryText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  participantCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGradientStart,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  participantDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  ownerTag: { backgroundColor: colors.primaryGradientStart, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ownerTagText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  confirmedTag: { backgroundColor: colors.easyBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  confirmedTagText: { color: colors.easyText, fontSize: 11, fontWeight: '700' },
  acceptedTag: { backgroundColor: colors.backgroundSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.grayLight },
  acceptedTagText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});
