import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import excursionDetailService, { ExcursionDetail } from '../services/excursionDetailService';
import { excursionInteractionService } from '../services/excursionInteractionService';
import { excursionManagementService } from '../services/excursionManagementService';
import PrimaryButton from '../components/buttons/PrimaryButton';
import { RootStackParamList } from '../navigation/AppNavigation';

interface RouteParams {
  id: string;
}

interface GpxCoordinate {
  latitude: number;
  longitude: number;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ExcursionDetail'>;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * ONE_HOUR_MS;

const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return '0,00';
  return Number(value).toFixed(2).replace('.', ',');
};

const ExcursionDetailScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { id } = route.params as RouteParams;

  const [excursion, setExcursion] = useState<ExcursionDetail | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<GpxCoordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const mapReadyRef = useRef(false);

  useEffect(() => {
    loadExcursionDetails();
  }, [id]);

  useEffect(() => {
    if (!excursion || loading) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const task = InteractionManager.runAfterInteractions(() => {
      setMapVisible(true);
      timeoutId = setTimeout(() => {
        if (!mapReadyRef.current) setMapError(true);
      }, 5000);
    });
    return () => {
      task.cancel();
      clearTimeout(timeoutId);
    };
  }, [excursion, loading]);

  const loadExcursionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const detail = await excursionDetailService.getExcursionDetail(id);
      setExcursion(detail);

      if (detail.gpxPath) {
        const gpxText = await excursionDetailService.downloadGpxFile(detail.gpxPath);
        const parser = new (require('fast-xml-parser')).XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
        });
        const gpxData = parser.parse(gpxText);
        const trackpoints = extractAllTrackpoints(gpxData);
        const coordinates = trackpoints
          .map((p: any) => ({
            latitude: parseFloat(p['@_lat']),
            longitude: parseFloat(p['@_lon']),
          }))
          .filter(
            (c: GpxCoordinate) =>
              !isNaN(c.latitude) && !isNaN(c.longitude) &&
              c.latitude >= -90 && c.latitude <= 90 &&
              c.longitude >= -180 && c.longitude <= 180
          );
        setRouteCoordinates(coordinates);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const extractAllTrackpoints = (gpxData: any): any[] => {
    const tracks = gpxData?.gpx?.trk;
    if (!tracks) return [];
    const trackArray = Array.isArray(tracks) ? tracks : [tracks];
    let all: any[] = [];
    trackArray.forEach((track: any) => {
      const segs = track.trkseg;
      if (!segs) return;
      (Array.isArray(segs) ? segs : [segs]).forEach((seg: any) => {
        let pts = seg.trkpt;
        if (!pts) return;
        if (!Array.isArray(pts)) pts = [pts];
        all = all.concat(pts);
      });
    });
    return all;
  };

  const reload = async () => {
    if (!excursion) return;
    const updated = await excursionDetailService.getExcursionDetail(excursion.id);
    setExcursion(updated);
  };

  // --- Acciones participante ---

  const handleRequestJoin = async () => {
    if (!excursion) return;
    setActionLoading(true);
    try {
      await excursionInteractionService.requestJoinExcursion(excursion.id);
      Alert.alert('Solicitud enviada', 'El organizador revisará tu solicitud.');
      await reload();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!excursion) return;
    Alert.alert('Cancelar solicitud', '¿Cancelar tu solicitud de unión?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await excursionInteractionService.cancelJoinRequest(excursion.id);
            await reload();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleLeave = async () => {
    if (!excursion) return;
    Alert.alert('Abandonar excursión', '¿Estás seguro de que deseas abandonar esta excursión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Abandonar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await excursionInteractionService.leaveExcursion(excursion.id);
            await reload();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleConfirmAttendance = async () => {
    if (!excursion) return;
    setActionLoading(true);
    try {
      await excursionInteractionService.confirmAttendance(excursion.id);
      Alert.alert('Asistencia confirmada', '¡Tu asistencia ha sido registrada!');
      await reload();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Acciones organizador ---

  const handleFinish = async () => {
    if (!excursion) return;
    Alert.alert('Finalizar excursión', '¿Marcar esta excursión como finalizada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: async () => {
          setActionLoading(true);
          try {
            await excursionManagementService.finishExcursion(excursion.id);
            Alert.alert('Excursión finalizada', 'La excursión ha sido marcada como finalizada.');
            await reload();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (!excursion) return;
    Alert.alert(
      'Eliminar excursión',
      'Esta acción es irreversible. Se eliminarán todos los datos asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await excursionManagementService.deleteExcursion(excursion.id);
              Alert.alert('Excursión eliminada', 'La excursión ha sido eliminada correctamente.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Error desconocido');
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryGradientStart} />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (error || !excursion) {
    return (
      <View style={styles.centerContainer}>
        <MaterialDesignIcons name="alert-circle-outline" size={48} color={colors.errorRed} />
        <Text style={styles.errorText}>{error || 'Error cargando excursión'}</Text>
      </View>
    );
  }

  const mapInitialRegion = (() => {
    if (routeCoordinates.length > 0) {
      const lats = routeCoordinates.map(c => c.latitude);
      const lons = routeCoordinates.map(c => c.longitude);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLon + maxLon) / 2,
        latitudeDelta: (maxLat - minLat) * 1.4 || 0.05,
        longitudeDelta: (maxLon - minLon) * 1.4 || 0.05,
      };
    }
    return {
      latitude: excursion.meetingLat,
      longitude: excursion.meetingLng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  })();

  // Calcular estado de botones para participante aceptado
  const nowMs = Date.now();
  const startMs = excursion.fechaInicio.getTime();
  const inAttendanceWindow = nowMs >= startMs - ONE_HOUR_MS && nowMs <= startMs + TWO_HOURS_MS;
  const canLeave = nowMs < startMs - ONE_HOUR_MS;
  const canFinish = excursion.isOrganizer && excursion.status === 'published' && nowMs >= startMs;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {excursion.imageUrl && (
          <Image source={{ uri: excursion.imageUrl }} style={styles.headerImage} />
        )}

        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.title}>{excursion.title}</Text>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{excursion.difficulty}</Text>
          </View>
        </LinearGradient>

        {excursion.status === 'finished' && (
          <View style={styles.statusBanner}>
            <MaterialDesignIcons name="flag-checkered" size={15} color={colors.mediumText} />
            <Text style={styles.statusBannerText}>Excursión finalizada</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.infoSection}>
            <InfoRow icon="calendar-clock" label="Fecha y hora de inicio" value={excursion.date + ' · ' + excursion.time} />
            <InfoRow icon="map-marker" label="Lugar de encuentro" value={excursion.meetingPoint} />
            <InfoRow icon="account-circle" label="Organizador" value={excursion.organizerName} />
            <InfoRow icon="seat" label="Plazas disponibles" value={String(excursion.availableSpots)} />
            <InfoRow icon="account-group" label="Participantes" value={String(excursion.acceptedCount)} />
          </View>

          <View style={styles.statsSection}>
            <Text style={shared.sectionTitle}>Estadísticas de la Ruta</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Distancia" value={`${formatNumber(excursion.distanciaTotal)} km`} icon="ruler" />
              <StatCard label="Elevación Máx" value={`${formatNumber(excursion.elevacionMaxima)} m`} icon="arrow-up-bold" />
              <StatCard label="Elevación Mín" value={`${formatNumber(excursion.elevacionMinima)} m`} icon="arrow-down-bold" />
              <StatCard label="Desnivel Positivo" value={`${formatNumber(excursion.desnivelPositivo)} m`} icon="trending-up" />
            </View>
          </View>

          <View style={styles.mapSection}>
            <Text style={shared.sectionTitle}>Ruta</Text>
            {mapVisible && !mapError ? (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={mapInitialRegion}
                scrollEnabled={false}
                zoomEnabled={true}
                onMapReady={() => { mapReadyRef.current = true; }}
              >
                {routeCoordinates.length > 0 && (
                  <Polyline coordinates={routeCoordinates} strokeColor={colors.primaryGradientStart} strokeWidth={3} />
                )}
                <Marker
                  coordinate={{ latitude: excursion.meetingLat, longitude: excursion.meetingLng }}
                  title={excursion.meetingPoint}
                  description="Punto de encuentro"
                  pinColor={colors.primaryGradientStart}
                />
                {routeCoordinates.length > 0 && (
                  <Marker coordinate={routeCoordinates[0]} title="Inicio de ruta" pinColor="green" />
                )}
                {routeCoordinates.length > 1 && (
                  <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="Final de ruta" pinColor="red" />
                )}
              </MapView>
            ) : mapError ? (
              <View style={[styles.map, styles.mapPlaceholder]}>
                <MaterialDesignIcons name="close-circle-outline" size={36} color={colors.errorRed} />
                <Text style={styles.mapLoadingText}>No se pudo cargar el mapa</Text>
              </View>
            ) : (
              <View style={[styles.map, styles.mapPlaceholder]}>
                <ActivityIndicator size="large" color={colors.primaryGradientStart} />
                <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
              </View>
            )}
          </View>

          {/* Sección de acciones */}
          <View style={styles.actionsSection}>
            <View style={styles.actionsCard}>
              {actionLoading && <ActivityIndicator size="small" color={colors.primaryGradientStart} style={styles.actionSpinner} />}

              {excursion.isOrganizer ? (
                <OrganizerActions
                excursion={excursion}
                canFinish={canFinish}
                disabled={actionLoading}
                onFinish={handleFinish}
                onEdit={() => navigation.navigate('EditExcursion', { excursionId: excursion.id })}
                onDelete={handleDelete}
                onPendingRequests={() => navigation.navigate('PendingRequests', { excursionId: excursion.id, excursionTitle: excursion.title })}
                onParticipants={() => navigation.navigate('ExcursionParticipants', { excursionId: excursion.id, excursionTitle: excursion.title, organizerId: excursion.organizerId })}
                onChat={() => navigation.navigate('Chat', { excursionId: excursion.id, excursionTitle: excursion.title, excursionStatus: excursion.status })}
                onRateParticipants={() => navigation.navigate('RateParticipants', { excursionId: excursion.id, excursionTitle: excursion.title })}
              />
            ) : (
              <ParticipantActions
                excursion={excursion}
                canLeave={canLeave}
                inAttendanceWindow={inAttendanceWindow}
                disabled={actionLoading}
                onRequestJoin={handleRequestJoin}
                onCancelRequest={handleCancelRequest}
                onLeave={handleLeave}
                onConfirmAttendance={handleConfirmAttendance}
                onParticipants={() => navigation.navigate('ExcursionParticipants', { excursionId: excursion.id, excursionTitle: excursion.title, organizerId: excursion.organizerId })}
                onChat={() => navigation.navigate('Chat', { excursionId: excursion.id, excursionTitle: excursion.title, excursionStatus: excursion.status })}
                onRateParticipants={() => navigation.navigate('RateParticipants', { excursionId: excursion.id, excursionTitle: excursion.title })}
              />
            )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// --- Acciones para el organizador ---
interface OrganizerActionsProps {
  excursion: ExcursionDetail;
  canFinish: boolean;
  disabled: boolean;
  onFinish: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPendingRequests: () => void;
  onParticipants: () => void;
  onChat: () => void;
  onRateParticipants: () => void;
}

const OrganizerActions: React.FC<OrganizerActionsProps> = ({
  excursion, canFinish, disabled, onFinish, onEdit, onDelete, onPendingRequests, onParticipants, onChat, onRateParticipants,
}) => (
  <View style={styles.organizerContainer}>
    <View style={styles.organizerBadge}>
      <Text style={styles.organizerText}>Eres el organizador</Text>
    </View>

    <TouchableOpacity style={styles.secondaryButton} onPress={onParticipants} disabled={disabled}>
      <MaterialDesignIcons name="account-group" size={16} color={colors.primaryGradientStart} />
      <Text style={styles.secondaryButtonText}>Ver participantes ({excursion.acceptedCount})</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.chatButton} onPress={onChat} disabled={disabled}>
      <MaterialDesignIcons name="message" size={16} color={colors.primaryGradientEnd} />
      <Text style={styles.chatButtonText}>Chat del grupo</Text>
    </TouchableOpacity>

    {excursion.status === 'published' && (
      <TouchableOpacity style={styles.secondaryButton} onPress={onPendingRequests} disabled={disabled}>
        <MaterialDesignIcons name="clipboard-list" size={16} color={colors.primaryGradientStart} />
        <Text style={styles.secondaryButtonText}>Gestionar solicitudes ({excursion.pendingCount})</Text>
      </TouchableOpacity>
    )}

    {excursion.status === 'published' && !canFinish && (
      <TouchableOpacity style={styles.secondaryButton} onPress={onEdit} disabled={disabled}>
        <MaterialDesignIcons name="pencil" size={16} color={colors.primaryGradientStart} />
        <Text style={styles.secondaryButtonText}>Editar excursión</Text>
      </TouchableOpacity>
    )}

    {canFinish && (
      <PrimaryButton title="Finalizar excursión" onPress={onFinish} />
    )}

    {excursion.status === 'finished' && (
      <TouchableOpacity style={styles.secondaryButton} onPress={onRateParticipants} disabled={disabled}>
        <MaterialDesignIcons name="star" size={16} color={colors.primaryGradientStart} />
        <Text style={styles.secondaryButtonText}>Valorar participantes</Text>
      </TouchableOpacity>
    )}

    {!canFinish && excursion.status !== 'finished' && (
      <TouchableOpacity style={styles.dangerButton} onPress={onDelete} disabled={disabled}>
        <MaterialDesignIcons name="delete" size={16} color={colors.hardText} />
        <Text style={styles.dangerButtonText}>Eliminar excursión</Text>
      </TouchableOpacity>
    )}
  </View>
);

// --- Acciones para el participante ---
interface ParticipantActionsProps {
  excursion: ExcursionDetail;
  canLeave: boolean;
  inAttendanceWindow: boolean;
  disabled: boolean;
  onRequestJoin: () => void;
  onCancelRequest: () => void;
  onLeave: () => void;
  onConfirmAttendance: () => void;
  onParticipants: () => void;
  onChat: () => void;
  onRateParticipants: () => void;
}

const ParticipantActions: React.FC<ParticipantActionsProps> = ({
  excursion, canLeave, inAttendanceWindow, disabled,
  onRequestJoin, onCancelRequest, onLeave, onConfirmAttendance, onParticipants, onChat, onRateParticipants,
}) => {
  const { myParticipationStatus, attendanceConfirmed, availableSpots, status } = excursion;

  return (
    <View style={styles.participantContainer}>
      <TouchableOpacity style={styles.secondaryButton} onPress={onParticipants} disabled={disabled}>
        <MaterialDesignIcons name="account-group" size={16} color={colors.primaryGradientStart} />
        <Text style={styles.secondaryButtonText}>Ver participantes ({excursion.acceptedCount})</Text>
      </TouchableOpacity>

      {myParticipationStatus === 'accepted' && (
        <TouchableOpacity style={styles.chatButton} onPress={onChat} disabled={disabled}>
          <MaterialDesignIcons name="message" size={16} color={colors.primaryGradientEnd} />
          <Text style={styles.chatButtonText}>Chat del grupo</Text>
        </TouchableOpacity>
      )}

      {myParticipationStatus === null && status === 'published' && (
        availableSpots > 0 ? (
          <PrimaryButton title="Solicitar unirse" onPress={onRequestJoin} />
        ) : (
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>Sin plazas disponibles</Text>
          </View>
        )
      )}

      {myParticipationStatus === 'pending' && (
        <>
          <View style={styles.pendingBadge}>
            <MaterialDesignIcons name="clock-outline" size={16} color={colors.mediumText} />
            <Text style={styles.pendingBadgeText}>Solicitud pendiente de aprobación</Text>
          </View>
          <TouchableOpacity style={styles.dangerButton} onPress={onCancelRequest} disabled={disabled}>
            <Text style={styles.dangerButtonText}>Cancelar solicitud</Text>
          </TouchableOpacity>
        </>
      )}

      {myParticipationStatus === 'accepted' && (
        <>
          <View style={styles.acceptedBadge}>
            <MaterialDesignIcons name="check-circle" size={16} color={colors.easyText} />
            <Text style={styles.acceptedBadgeText}>Estás en esta excursión</Text>
          </View>
          {canLeave && (
            <TouchableOpacity style={styles.dangerButton} onPress={onLeave} disabled={disabled}>
              <Text style={styles.dangerButtonText}>Abandonar excursión</Text>
            </TouchableOpacity>
          )}
          {inAttendanceWindow && !attendanceConfirmed && status !== 'finished' && (
            <PrimaryButton title="Confirmar asistencia" onPress={onConfirmAttendance} />
          )}
          {attendanceConfirmed && (
            <View style={styles.confirmedBadge}>
              <MaterialDesignIcons name="check-circle" size={16} color={colors.easyText} />
              <Text style={styles.confirmedBadgeText}>Asistencia confirmada</Text>
            </View>
          )}
          {status === 'finished' && attendanceConfirmed && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onRateParticipants} disabled={disabled}>
              <MaterialDesignIcons name="star" size={16} color={colors.primaryGradientStart} />
              <Text style={styles.secondaryButtonText}>Valorar participantes</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {status === 'finished' && myParticipationStatus === null && (
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>Excursión finalizada</Text>
        </View>
      )}
    </View>
  );
};

const InfoRow: React.FC<{
  icon: React.ComponentProps<typeof MaterialDesignIcons>['name'];
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLabelRow}>
      <MaterialDesignIcons name={icon} size={15} color={colors.primaryGradientStart} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StatCard: React.FC<{ label: string; value: string; icon: React.ComponentProps<typeof MaterialDesignIcons>['name'] }> = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <MaterialDesignIcons name={icon} size={26} color={colors.primaryGradientStart} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default ExcursionDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSoft },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundSoft },
  scrollContainer: { flex: 1 },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 16 },
  errorText: { color: colors.hardText, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  headerImage: { width: '100%', height: 250, backgroundColor: colors.grayLight },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.white, fontSize: 24, fontWeight: '700', flex: 1 },
  difficultyBadge: { backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  difficultyText: { color: colors.primaryGradientStart, fontWeight: '600', fontSize: 12 },
  statusBanner: { backgroundColor: colors.mediumBg, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusBannerText: { color: colors.mediumText, fontWeight: '700', fontSize: 14 },
  content: { padding: 16 },
  infoSection: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, marginRight: 8 },
  infoLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '500', flex: 1 },
  infoValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  statsSection: { marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  mapSection: { marginBottom: 16 },
  map: { width: '100%', height: 400, borderRadius: 12 },
  mapPlaceholder: { backgroundColor: colors.backgroundSoft, justifyContent: 'center', alignItems: 'center' },
  mapLoadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  actionsSection: { marginTop: 8, marginBottom: 32 },
  actionsCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, gap: 14 },
  actionSpinner: { alignSelf: 'center' },
  organizerContainer: { gap: 14 },
  participantContainer: { gap: 14 },
  organizerBadge: { backgroundColor: colors.primaryGradientStart, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  organizerText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  secondaryButton: { borderWidth: 1.5, borderColor: colors.primaryGradientStart, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: colors.primaryGradientStart, fontSize: 14, fontWeight: '600' },
  dangerButton: { borderWidth: 1.5, borderColor: colors.hardText, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dangerButtonText: { color: colors.hardText, fontSize: 14, fontWeight: '600' },
  pendingBadge: { backgroundColor: colors.mediumBg, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pendingBadgeText: { color: colors.mediumText, fontSize: 13, fontWeight: '600' },
  acceptedBadge: { backgroundColor: colors.easyBg, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  acceptedBadgeText: { color: colors.easyText, fontSize: 13, fontWeight: '600' },
  confirmedBadge: { backgroundColor: colors.easyBg, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  confirmedBadgeText: { color: colors.easyText, fontSize: 14, fontWeight: '700' },
  infoBadge: { backgroundColor: colors.backgroundSoft, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.grayLight },
  infoBadgeText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chatButton: { borderWidth: 1.5, borderColor: colors.primaryGradientEnd, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.infoBg },
  chatButtonText: { color: colors.primaryGradientEnd, fontSize: 14, fontWeight: '600' },
});
