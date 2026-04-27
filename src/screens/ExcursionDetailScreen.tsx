import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import excursionDetailService, { ExcursionDetail } from '../services/excursionDetailService';
import { excursionInteractionService } from '../services/excursionInteractionService';
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

// Función auxiliar para formatear números españoles (2 decimales, coma como separador)
const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return '0,00';
  const formatted = Number(value).toFixed(2);
  return formatted.replace('.', ',');
};

const ExcursionDetailScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute();
  const { id } = route.params as RouteParams;

  const [excursion, setExcursion] = useState<ExcursionDetail | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<GpxCoordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpxStatus, setGpxStatus] = useState<string>('pendiente');
  const [joiningOrLeaving, setJoiningOrLeaving] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapError, setMapError] = useState<boolean>(false);

  useEffect(() => {
    loadExcursionDetails();
  }, [id]);

  // Renderizar el mapa después de que los datos estén listos (lazy loading)
  useEffect(() => {
    if (excursion && !loading) {
      // Esperar a que terminen interacciones (animaciones, gestos) antes de intentar cargar el mapa
      const task = InteractionManager.runAfterInteractions(() => {
        setMapVisible(true);
        
        // Timeout de 5 segundos - si el mapa no carga, mostrar error
        const timeoutId = setTimeout(() => {
          if (!mapReady) {
            console.error('❌ [MAP] Timeout: El mapa no se cargó en 5 segundos');
            setMapError(true);
          }
        }, 5000);
        
        return () => clearTimeout(timeoutId);
      });
      return () => task.cancel();
    }
  }, [excursion, loading, mapReady]);

  const loadExcursionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 loadExcursionDetails START para id:', id);

      // Obtener detalles de la excursión
      console.log('📍 Llamando getExcursionDetail...');
      const detail = await excursionDetailService.getExcursionDetail(id);
      console.log('✅ Detail obtenido:', { id: detail.id, gpxPath: detail.gpxPath });
      setExcursion(detail);

      // Descargar y parsear GPX
      if (detail.gpxPath) {
        setGpxStatus('descargando');
        console.log('📥 [GPX] Descargando archivo desde:', detail.gpxPath);
        let gpxText: string;
        try {
          gpxText = await excursionDetailService.downloadGpxFile(detail.gpxPath);
          console.log('✅ [GPX] Descargado OK, longitud:', gpxText.length, 'chars');
        } catch (downloadErr) {
          console.error('❌ [GPX] Error en descarga:', downloadErr);
          setGpxStatus('error-descarga');
          throw downloadErr;
        }

        setGpxStatus('parseando');
        const parser = new (require('fast-xml-parser')).XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
        });
        const gpxData = parser.parse(gpxText);
        const trackpoints = extractAllTrackpoints(gpxData);
        console.log('✅ [GPX] Trackpoints encontrados:', trackpoints.length);
        if (trackpoints.length > 0) {
          console.log('🔎 [GPX] Primer punto raw:', JSON.stringify(trackpoints[0]));
        }

        const coordinates = trackpoints.map((point: any) => ({
          latitude: parseFloat(point['@_lat']),
          longitude: parseFloat(point['@_lon']),
        }));

        const validCoordinates = coordinates.filter(coord =>
          !isNaN(coord.latitude) && !isNaN(coord.longitude) &&
          coord.latitude >= -90 && coord.latitude <= 90 &&
          coord.longitude >= -180 && coord.longitude <= 180
        );

        console.log('✅ [GPX] Coords totales:', coordinates.length, '| válidas:', validCoordinates.length, '| inválidas:', coordinates.length - validCoordinates.length);
        if (validCoordinates.length > 0) {
          console.log('📍 [GPX] Primera coord válida:', validCoordinates[0]);
          console.log('📍 [GPX] Última coord válida:', validCoordinates[validCoordinates.length - 1]);
        }

        setGpxStatus(`ok-${validCoordinates.length}pts`);
        setRouteCoordinates(validCoordinates);
      } else {
        console.warn('⚠️ [GPX] La excursión no tiene gpxPath, no se cargará ruta');
        setGpxStatus('sin-gpx');
      }

      console.log('✅ loadExcursionDetails COMPLETE');
    } catch (err) {
      console.error('❌ Error en loadExcursionDetails:', err);
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
    let allTrackpoints: any[] = [];

    trackArray.forEach((track: any) => {
      const segments = track.trkseg;
      if (!segments) return;

      const segmentArray = Array.isArray(segments) ? segments : [segments];
      segmentArray.forEach((segment: any) => {
        let trackpoints = segment.trkpt;
        if (!trackpoints) return;

        if (!Array.isArray(trackpoints)) {
          trackpoints = [trackpoints];
        }

        allTrackpoints = allTrackpoints.concat(trackpoints);
      });
    });

    return allTrackpoints;
  };

  const handleJoinExcursion = async () => {
    if (!excursion) return;

    setJoiningOrLeaving(true);
    try {
      await excursionInteractionService.joinExcursion(excursion.id);
      Alert.alert('Éxito', '¡Te has unido a la excursión!');
      // Recargar los detalles para actualizar isJoined y availableSpots
      const updatedDetail = await excursionDetailService.getExcursionDetail(excursion.id);
      setExcursion(updatedDetail);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      Alert.alert('Error', message);
    } finally {
      setJoiningOrLeaving(false);
    }
  };

  const handleLeaveExcursion = async () => {
    if (!excursion) return;

    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que deseas abandonar esta excursión?',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Abandonar',
          onPress: async () => {
            setJoiningOrLeaving(true);
            try {
              await excursionInteractionService.leaveExcursion(excursion.id);
              Alert.alert('Éxito', 'Has abandonado la excursión');
              // Recargar los detalles para actualizar isJoined y availableSpots
              const updatedDetail = await excursionDetailService.getExcursionDetail(excursion.id);
              setExcursion(updatedDetail);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Error desconocido';
              Alert.alert('Error', message);
            } finally {
              setJoiningOrLeaving(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
      </View>
    );
  }

  if (error || !excursion) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>⚠️ {error || 'Error cargando excursión'}</Text>
        </View>
      </View>
    );
  }

  // Centrar el mapa en la ruta GPX; si no hay ruta, usar el punto de encuentro
  const mapInitialRegion = (() => {
    if (routeCoordinates.length > 0) {
      const lats = routeCoordinates.map(c => c.latitude);
      const lons = routeCoordinates.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
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

  return (
    <View style={styles.centerContainer}>
      <ScrollView style={styles.scrollContainer}>
        {/* Imagen */}
        {excursion.imageUrl && (
          <Image source={{ uri: excursion.imageUrl }} style={styles.headerImage} />
        )}

      {/* Header con título */}
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.title}>{excursion.title}</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{excursion.difficulty}</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Información básica */}
        <View style={styles.infoSection}>
          <InfoRow label="Fecha" value={excursion.date} />
          <InfoRow label="Hora" value={excursion.time} />
          <InfoRow label="Punto de encuentro" value={excursion.meetingPoint} />
          <InfoRow label="Organizador" value={excursion.organizerName} />
          <InfoRow label="Plazas disponibles" value={String(excursion.availableSpots)} />
        </View>

        {/* Estadísticas de la ruta */}
        <View style={styles.statsSection}>
          <Text style={shared.sectionTitle}>Estadísticas de la Ruta</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Distancia"
              value={`${formatNumber(excursion.distanciaTotal)} km`}
              icon="📏"
            />
            <StatCard
              label="Elevación Máx"
              value={`${formatNumber(excursion.elevacionMaxima)} m`}
              icon="⬆️"
            />
            <StatCard
              label="Elevación Mín"
              value={`${formatNumber(excursion.elevacionMinima)} m`}
              icon="⬇️"
            />
            <StatCard
              label="Desnivel Positivo"
              value={`${formatNumber(excursion.desnivelPositivo)} m`}
              icon="📈"
            />
          </View>
        </View>

        {/* Mapa — solo se renderiza cuando está completamente listo */}
        <View style={styles.mapSection}>
          <Text style={shared.sectionTitle}>Ruta</Text>
          {mapReady ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={mapInitialRegion}
              scrollEnabled={false}
              zoomEnabled={true}
              onMapReady={() => {
                console.log('✅ [MAP] onMapReady — Google Maps inicializado correctamente');
                setMapReady(true);
              }}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                console.log(`📐 [MAP] onLayout — dimensiones: ${width}x${height}px`);
              }}
            >
              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={colors.primaryGradientStart}
                  strokeWidth={3}
                />
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
              <Text style={styles.mapLoadingText}>❌ No se pudo cargar el mapa</Text>
              <Text style={[styles.mapLoadingText, { fontSize: 12, marginTop: 8 }]}>
                Los Servicios de Google Play no están actualizados o ha habido un error al consultar google maps
              </Text>
            </View>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <ActivityIndicator size="large" color={colors.primaryGradientStart} />
              <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
            </View>
          )}

          {/* Debug temporal — eliminar tras diagnosticar */}
          <Text style={styles.debugText}>
            {`Mapa: ${mapReady ? '✅ listo' : mapError ? '❌ error' : '⏳ cargando'} | GPX: ${gpxStatus}`}
          </Text>
        </View>

        {/* Sección de acciones */}
        <View style={styles.actionsSection}>
          {excursion.isOrganizer ? (
            <View style={styles.organizerBadge}>
              <Text style={styles.organizerText}>👤 Organizador de esta excursión</Text>
            </View>
          ) : excursion.isJoined ? (
            <>
              <PrimaryButton
                title={joiningOrLeaving ? 'Procesando...' : 'Abandonar Excursión'}
                onPress={handleLeaveExcursion}
              />
              {joiningOrLeaving && <ActivityIndicator size="small" color={colors.primaryGradientStart} />}
            </>
          ) : excursion.availableSpots > 0 ? (
            <>
              <PrimaryButton
                title={joiningOrLeaving ? 'Uniéndose...' : 'Unirse a la Excursión'}
                onPress={handleJoinExcursion}
              />
              {joiningOrLeaving && <ActivityIndicator size="small" color={colors.primaryGradientStart} />}
            </>
          ) : (
            <View style={styles.noSpacesBadge}>
              <Text style={styles.noSpacesText}>❌ No hay plazas disponibles</Text>
            </View>
          )}
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

// Componente auxiliar para mostrar info
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// Componente auxiliar para estadísticas
const StatCard: React.FC<{ label: string; value: string; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default ExcursionDetailScreen;

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: colors.hardText,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  headerImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.grayLight,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  difficultyBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    color: colors.primaryGradientStart,
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    padding: 16,
  },
  infoSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  mapSection: {
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  mapPlaceholder: {
    backgroundColor: colors.backgroundSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  debugText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  actionsSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  organizerBadge: {
    backgroundColor: colors.primaryGradientStart,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  organizerText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  noSpacesBadge: {
    backgroundColor: colors.backgroundSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  noSpacesText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
