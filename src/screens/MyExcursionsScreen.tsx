import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { excursionInteractionService } from '../services/excursionInteractionService';
import { Excursion } from '../models/Excursion';
import ExcursionCard from '../components/cards/ExcursionCard';
import BrandHeader from '../components/headers/BrandHeader';
import { colors } from '../theme/colors';
import { shared } from '../theme/styles';
import { RootStackParamList } from '../navigation/AppNavigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyExcursions'>;
};

type FilterType = 'todas' | 'organizadas' | 'unidas';

const MyExcursionsScreen: React.FC<Props> = ({ navigation }) => {
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('todas');
  useEffect(() => {
    loadExcursions();
  }, []);

  // Recargar cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      loadExcursions();
    }, [])
  );

  const loadExcursions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 loadExcursions START:', filterType);

      const data = await excursionInteractionService.getMyExcursions(filterType);
      setExcursions(data);
      console.log('✅ loadExcursions COMPLETE:', data.length, 'excursiones');
    } catch (err) {
      console.error('❌ Error loading excursions:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      Alert.alert('Error', message);
      setExcursions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (newFilter: FilterType) => {
    setFilterType(newFilter);
    try {
      setLoading(true);
      setError(null);
      const data = await excursionInteractionService.getMyExcursions(newFilter);
      setExcursions(data);
    } catch (err) {
      console.error('❌ Error changing filter:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderFilterButton = (type: FilterType, label: string) => {
    const isActive = filterType === type;
    return (
      <TouchableOpacity
        key={type}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => handleFilterChange(type)}
      >
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };


  if (loading && excursions.length === 0) {
    return (
      <View style={shared.container}>
        <BrandHeader />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryGradientStart} />
          <Text style={styles.loadingText}>Cargando excursiones...</Text>
        </View>
      </View>
    );
  }

  if (error && excursions.length === 0) {
    return (
      <View style={shared.container}>
        <BrandHeader />
        <View style={styles.centerContainer}>
          <MaterialDesignIcons name="alert-circle" size={48} color={colors.hardText} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadExcursions}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={shared.container}>
      <BrandHeader />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterButton('todas', 'Todas')}
        {renderFilterButton('organizadas', 'Organizadas')}
        {renderFilterButton('unidas', 'Unidas')}
      </View>

      {/* Loading indicator cuando cambia filtro */}
      {loading && <ActivityIndicator size="small" color={colors.primaryGradientStart} />}

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {(() => {
          const displayed = filterType === 'unidas'
            ? excursions.filter(e => !e.isOrganizer)
            : excursions;
          return displayed.length > 0 ? (
          <>
            <Text style={styles.resultCount}>
              {displayed.length} {displayed.length === 1 ? 'excursión' : 'excursiones'}
            </Text>
            {displayed.map((excursion) => (
              <View key={excursion.id}>
                {excursion.status === 'finished' && (
                  <View style={styles.finishedTab}>
                    <MaterialDesignIcons name="flag-checkered" size={11} color={colors.white} />
                    <Text style={styles.finishedTabText}>Finalizada</Text>
                  </View>
                )}
                <ExcursionCard
                  excursion={excursion}
                  onPress={() =>
                    navigation.navigate('ExcursionDetail', {
                      id: excursion.id,
                    })
                  }
                />
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialDesignIcons name="hiking" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {filterType === 'todas'
                ? 'No hay excursiones aún'
                : filterType === 'organizadas'
                  ? 'No has organizado excursiones'
                  : 'No te has unido a ninguna excursión'}
            </Text>
            <Text style={styles.emptySubText}>
              {filterType === 'todas' || filterType === 'unidas'
                ? 'Descubre excursiones disponibles'
                : 'Crea una excursión para empezar'}
            </Text>
          </View>
        );
        })()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 12,
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLight,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primaryGradientStart,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  resultCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  finishedTab: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  finishedTabText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MyExcursionsScreen;
