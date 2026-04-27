import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import excursionDetailService, { ExcursionDetail } from '../services/excursionDetailService';
import PrimaryButton from '../components/buttons/PrimaryButton';

interface RouteParams {
  id: string;
}

interface GpxCoordinate {
  latitude: number;
  longitude: number;
}

const ExcursionDetailScreen = () => {
  const route = useRoute();
  const { id } = route.params as RouteParams;

  const [excursion, setExcursion] = useState<ExcursionDetail | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<GpxCoordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpxStatus, setGpxStatus] = useState<string>('pendiente');

  useEffect(() => {
    loadExcursionDetails();
  }, [id]);

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
        <Text style={styles.errorText}>⚠️ {error || 'Error cargando excursión'}</Text>
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
    <ScrollView style={shared.container}>
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
              value={`${excursion.distanciaTotal} km`}
              icon="📏"
            />
            <StatCard
              label="Elevación Máx"
              value={`${excursion.elevacionMaxima} m`}
              icon="⬆️"
            />
            <StatCard
              label="Elevación Mín"
              value={`${excursion.elevacionMinima} m`}
              icon="⬇️"
            />
            <StatCard
              label="Desnivel Positivo"
              value={`${excursion.desnivelPositivo} m`}
              icon="📈"
            />
          </View>
        </View>

        {/* Mapa — siempre visible para diagnosticar */}
        <View style={styles.mapSection}>
          <Text style={shared.sectionTitle}>Ruta</Text>
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

          {/* Debug temporal — eliminar tras diagnosticar */}
          <Text style={styles.debugText}>
            {`Mapa: ${mapReady ? '✅ listo' : '⏳ cargando'} | GPX: ${gpxStatus}`}
          </Text>
        </View>

        {/* Botón de unirse */}
        <PrimaryButton
          title="Unirse a la Excursión"
          onPress={() => Alert.alert('Pronto', 'Funcionalidad de unirse próximamente')}
        />
      </View>
    </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
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
  debugText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
