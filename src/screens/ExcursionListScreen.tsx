import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { excursionService, ExcursionListItem } from "../services/excursionService";
import { EXCURSION_DIFFICULTIES, EXCURSION_TYPES, ExcursionDifficulty, ExcursionType } from "../models/Excursion";
import ExcursionCard from "../components/cards/ExcursionCard";
import BrandHeader from "../components/headers/BrandHeader";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { RootStackParamList } from "../navigation/AppNavigation";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "ExcursionList">;
};

const ExcursionListScreen: React.FC<Props> = ({ navigation }) => {
  const [excursions, setExcursions] = useState<ExcursionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExcursionDifficulty | undefined>();
  const [selectedType, setSelectedType] = useState<ExcursionType | undefined>();

  // Guardar los filtros aplicados (los pendientes son los del modal antes de pulsar Aplicar)
  const [appliedDifficulty, setAppliedDifficulty] = useState<ExcursionDifficulty | undefined>();
  const [appliedType, setAppliedType] = useState<ExcursionType | undefined>();

  const offsetRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const loadExcursions = useCallback(async (
    difficulty?: ExcursionDifficulty,
    type?: ExcursionType,
    reset = true
  ) => {
    if (reset) {
      setLoading(true);
      offsetRef.current = 0;
    }
    try {
      const result = await excursionService.getFilteredExcursions({
        difficulty,
        type,
        offset: offsetRef.current,
      });
      if (reset) {
        setExcursions(result.excursions);
      } else {
        setExcursions(prev => [...prev, ...result.excursions]);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
      offsetRef.current = offsetRef.current + result.excursions.length;
    } catch (e) {
      console.error('Error cargando excursiones:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExcursions(appliedDifficulty, appliedType, true);
    }, [appliedDifficulty, appliedType])
  );

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMoreRef.current || loading) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    loadExcursions(appliedDifficulty, appliedType, false);
  };

  const applyFilters = () => {
    setAppliedDifficulty(selectedDifficulty);
    setAppliedType(selectedType);
    setShowFilters(false);
    loadExcursions(selectedDifficulty, selectedType, true);
  };

  const resetFilters = () => {
    setSelectedDifficulty(undefined);
    setSelectedType(undefined);
  };

  const openFilters = () => {
    setSelectedDifficulty(appliedDifficulty);
    setSelectedType(appliedType);
    setShowFilters(true);
  };

  const hasActiveFilters = !!appliedDifficulty || !!appliedType;

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primaryGradientStart} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <MaterialDesignIcons name="image-filter-hdr" size={64} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {hasActiveFilters
            ? "No hay excursiones que coincidan con tus filtros"
            : "No hay excursiones disponibles"}
        </Text>
        <Text style={styles.emptySubText}>¡Sé el primero en crear una!</Text>
      </View>
    );
  };

  return (
    <View style={shared.container}>
      <BrandHeader />

      <FlatList
        data={excursions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <ExcursionCard
            excursion={item as any}
            onPress={() => navigation.navigate("ExcursionDetail", { id: item.id })}
          />
        )}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.sectionTitle}>Excursiones Disponibles</Text>
              <TouchableOpacity style={styles.filterButton} activeOpacity={0.7} onPress={openFilters}>
                <View style={[styles.filterIconCircle, hasActiveFilters && styles.filterIconCircleActive]}>
                  <MaterialDesignIcons
                    name={hasActiveFilters ? "filter-check" : "filter"}
                    size={20}
                    color={colors.white}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>{total} excursiones disponibles</Text>
            {loading && (
              <ActivityIndicator
                size="small"
                color={colors.primaryGradientStart}
                style={{ marginTop: 12 }}
              />
            )}
          </View>
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateExcursion")}
      >
        <MaterialDesignIcons name="plus" size={28} color={colors.white} />
      </TouchableOpacity>

      {showFilters && (
        <Modal
          visible={showFilters}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtros</Text>
                <TouchableOpacity
                  onPress={() => setShowFilters(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialDesignIcons name="close" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={[]}
                renderItem={null}
                style={styles.modalBody}
                ListHeaderComponent={
                  <>
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterGroupTitle}>Dificultad</Text>
                      {EXCURSION_DIFFICULTIES.map(difficulty => (
                        <TouchableOpacity
                          key={difficulty}
                          style={styles.filterItem}
                          onPress={() => setSelectedDifficulty(
                            selectedDifficulty === difficulty ? undefined : difficulty
                          )}
                        >
                          <View style={[
                            styles.checkbox,
                            selectedDifficulty === difficulty && styles.checkboxActive
                          ]}>
                            {selectedDifficulty === difficulty && (
                              <MaterialDesignIcons name="check" size={14} color={colors.white} />
                            )}
                          </View>
                          <Text style={styles.filterItemText}>{difficulty}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.filterGroup}>
                      <Text style={styles.filterGroupTitle}>Tipo de Excursión</Text>
                      {EXCURSION_TYPES.map(type => (
                        <TouchableOpacity
                          key={type}
                          style={styles.filterItem}
                          onPress={() => setSelectedType(
                            selectedType === type ? undefined : type
                          )}
                        >
                          <View style={[
                            styles.checkbox,
                            selectedType === type && styles.checkboxActive
                          ]}>
                            {selectedType === type && (
                              <MaterialDesignIcons name="check" size={14} color={colors.white} />
                            )}
                          </View>
                          <Text style={styles.filterItemText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                }
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnSecondary} onPress={resetFilters}>
                  <Text style={styles.btnSecondaryText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={applyFilters}>
                  <Text style={styles.btnPrimaryText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default ExcursionListScreen;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 80,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  filterButton: {
    padding: 8,
  },
  filterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGradientStart,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  filterIconCircleActive: {
    backgroundColor: colors.primaryGradientEnd,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryGradientStart,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: "100%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    backgroundColor: colors.backgroundSoft,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  filterGroup: {
    marginBottom: 28,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.borderColor,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  checkboxActive: {
    backgroundColor: colors.primaryGradientStart,
    borderColor: colors.primaryGradientStart,
  },
  filterItemText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    backgroundColor: colors.backgroundSoft,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primaryGradientStart,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.borderColor,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
});
