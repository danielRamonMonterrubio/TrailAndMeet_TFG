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
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';
import excursionDetailService, { ExcursionDetail } from '../services/excursionDetailService';
import gpxParserService from '../services/gpxParserService';
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
  const navigation = useNavigation();
  const { id } = route.params as RouteParams;

  const [excursion, setExcursion] = useState<ExcursionDetail | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<GpxCoordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.log('📥 Descargando GPX...');
        const gpxText = await excursionDetailService.downloadGpxFile(detail.gpxPath);
        console.log('✅ GPX descargado, longitud:', gpxText.length);
        
        // Parsear directamente (es XML text, no base64)
        const parser = new (require('fast-xml-parser')).XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
        });
        
        console.log('🔍 Parseando XML...');
        const gpxData = parser.parse(gpxText);
        console.log('✅ XML parseado');
        
        const trackpoints = extractAllTrackpoints(gpxData);
        console.log('✅ Trackpoints extraídos:', trackpoints.length);
        
        const coordinates = trackpoints.map((point: any) => ({
          latitude: parseFloat(point['@_lat']),
          longitude: parseFloat(point['@_lon']),
        }));
        
        console.log('✅ Coordinates mapeadas:', coordinates.length);
        setRouteCoordinates(coordinates);
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

  // Calcular bounds del mapa
  const mapInitialRegion = routeCoordinates.length > 0
    ? {
        latitude: excursion.meetingLat,
        longitude: excursion.meetingLng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: excursion.meetingLat,
        longitude: excursion.meetingLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.sectionTitle}>Estadísticas de la Ruta</Text>
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

        {/* Mapa */}
        {routeCoordinates.length > 0 && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Ruta</Text>
            <MapView
              style={styles.map}
              initialRegion={mapInitialRegion}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              {/* Polyline de la ruta */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={colors.primaryGradientStart}
                strokeWidth={3}
              />

              {/* Marcador del punto de encuentro */}
              <Marker
                coordinate={{
                  latitude: excursion.meetingLat,
                  longitude: excursion.meetingLng,
                }}
                title={excursion.meetingPoint}
                description="Punto de encuentro"
                pinColor={colors.primaryGradientStart}
              />

              {/* Marcador del inicio de ruta */}
              {routeCoordinates.length > 0 && (
                <Marker
                  coordinate={routeCoordinates[0]}
                  title="Inicio de ruta"
                  pinColor="green"
                />
              )}

              {/* Marcador del final de ruta */}
              {routeCoordinates.length > 1 && (
                <Marker
                  coordinate={routeCoordinates[routeCoordinates.length - 1]}
                  title="Final de ruta"
                  pinColor="red"
                />
              )}
            </MapView>
          </View>
        )}

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
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
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
    overflow: 'hidden',
  },
});
