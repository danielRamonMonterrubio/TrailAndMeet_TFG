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
import { excursionRequestService, PendingRequest } from '../services/excursionRequestService';
import { RootStackParamList } from '../navigation/AppNavigation';

interface RouteParams {
  excursionId: string;
  excursionTitle: string;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PendingRequests'>;
};

const PendingRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { excursionId, excursionTitle } = route.params as RouteParams;

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await excursionRequestService.getPendingRequests(excursionId);
      setRequests(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [excursionId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRespond = async (applicantId: string, action: 'accept' | 'reject') => {
    setProcessingId(applicantId);
    try {
      await excursionRequestService.respondJoinRequest(excursionId, applicantId, action);
      setRequests(prev => prev.filter(r => r.usuarioId !== applicantId));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmAction = (applicantId: string, action: 'accept' | 'reject', name: string) => {
    const label = action === 'accept' ? 'aceptar' : 'rechazar';
    Alert.alert(
      action === 'accept' ? 'Aceptar solicitud' : 'Rechazar solicitud',
      `¿${action === 'accept' ? 'Aceptar' : 'Rechazar'} la solicitud de ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: action === 'accept' ? 'Aceptar' : 'Rechazar', onPress: () => handleRespond(applicantId, action), style: action === 'reject' ? 'destructive' : 'default' },
      ]
    );
  };

  return (
    <View style={shared.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Solicitudes</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle} numberOfLines={2}>{excursionTitle}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay solicitudes pendientes</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.count}>{requests.length} solicitud{requests.length !== 1 ? 'es' : ''} pendiente{requests.length !== 1 ? 's' : ''}</Text>
          {requests.map(req => {
            const name = req.usuario?.nombreUsuario ?? req.usuario?.correo ?? req.usuarioId;
            const isProcessing = processingId === req.usuarioId;
            return (
              <View key={req.usuarioId} style={styles.requestCard}>
                <TouchableOpacity
                  style={styles.requestInfo}
                  onPress={() => navigation.navigate('UserProfile', { userId: req.usuarioId, username: name })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.requestName}>{name}</Text>
                  {req.usuario?.correo && req.usuario.nombreUsuario && (
                    <Text style={styles.requestEmail}>{req.usuario.correo}</Text>
                  )}
                  <Text style={styles.requestDate}>
                    Solicitado: {new Date(req.fechaSolicitud).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.viewProfileHint}>Ver perfil →</Text>
                </TouchableOpacity>
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.primaryGradientStart} />
                ) : (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => confirmAction(req.usuarioId, 'accept', name)}
                    >
                      <Text style={styles.acceptButtonText}>Aceptar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => confirmAction(req.usuarioId, 'reject', name)}
                    >
                      <Text style={styles.rejectButtonText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default PendingRequestsScreen;

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
  list: { padding: 16, gap: 12 },
  count: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestInfo: { flex: 1, marginRight: 12 },
  requestName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  requestEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  requestDate: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  viewProfileHint: { fontSize: 11, color: colors.primaryGradientStart, marginTop: 4, fontWeight: '600' },
  requestActions: { gap: 8 },
  acceptButton: { backgroundColor: colors.primaryGradientStart, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  acceptButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  rejectButton: { borderWidth: 1.5, borderColor: colors.hardText, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  rejectButtonText: { color: colors.hardText, fontSize: 13, fontWeight: '700' },
});
