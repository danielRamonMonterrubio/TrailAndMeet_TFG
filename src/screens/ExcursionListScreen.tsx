import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { excursionService } from "../services/excursionService";
import { Excursion, EXCURSION_DIFFICULTIES, EXCURSION_TYPES, ExcursionDifficulty, ExcursionType } from "../models/Excursion";
import ExcursionCard from "../components/cards/ExcursionCard";
import BrandHeader from "../components/headers/BrandHeader";
import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { RootStackParamList } from "../navigation/AppNavigation";
import { AuthContext } from "../context/AuthContext";

import { logout } from "../services/authService";
type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    "ExcursionList"
  >;
};

const ExcursionListScreen: React.FC<Props> = ({ navigation }) => {
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<ExcursionDifficulty[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<ExcursionType[]>([]);
  const { session, setSession } = useContext(AuthContext);

  useEffect(() => {
    loadExcursions();
  }, []);

  // Recargar excursiones cuando la pantalla recibe el foco
  useFocusEffect(
    React.useCallback(() => {
      loadExcursions();
    }, [])
  );

  const loadExcursions = async () => {
    const data = await excursionService.getAvailableExcursions();
    setExcursions(data);
  };

  // Filtrar excursiones basado en selecciones
  const filteredExcursions = useMemo(() => {
    return excursions.filter((excursion) => {
      const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(excursion.difficulty);
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(excursion.type);
      return matchesDifficulty && matchesType;
    });
  }, [excursions, selectedDifficulties, selectedTypes]);

  const toggleDifficulty = (difficulty: ExcursionDifficulty) => {
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty)
        ? prev.filter((d) => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const toggleType = (type: ExcursionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const resetFilters = () => {
    setSelectedDifficulties([]);
    setSelectedTypes([]);
  };

  const handleOpenFilters = () => {
    setShowFilters(true);
  };

  const handleLogout = async () => {
    try {
      const token = session?.access_token;
      
      // Solo llamar logout al backend si hay token válido
      if (token) {
        try {
          await logout(token);
        } catch (error) {
          // Si falla el logout en backend, igual limpiar localmente
          console.error("Logout remoto falló:", error);
        }
      }

      // Limpiar sesión del contexto (que también limpia AsyncStorage y Supabase)
      setSession(null);

      navigation.reset({
        index: 0,
        routes: [{ name: "Welcome" }],
      });

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={shared.container}>
      <BrandHeader onLogout={handleLogout} onNotifications={() => navigation.navigate('Notifications')} />

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.sectionTitle}>
              Excursiones Disponibles
            </Text>
            <TouchableOpacity 
              style={styles.filterButton}
              activeOpacity={0.7}
              onPress={handleOpenFilters}
            >
              <View style={[
                styles.filterIconCircle,
                (selectedDifficulties.length > 0 || selectedTypes.length > 0) && styles.filterIconCircleActive
              ]}>
                <MaterialDesignIcons 
                  name={selectedDifficulties.length > 0 || selectedTypes.length > 0 ? "filter-check" : "filter"}
                  size={20}
                  color={colors.white}
                />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            {filteredExcursions.length} excursiones con plazas libres
          </Text>
        </View>

        {filteredExcursions.length > 0 &&
          filteredExcursions.map((excursion) => (
            <ExcursionCard
              key={excursion.id}
              excursion={excursion}
              onPress={() =>
                navigation.navigate("ExcursionDetail", {
                  id: excursion.id,
                })
              }
            />
          ))}

        {filteredExcursions.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialDesignIcons name="image-filter-hdr" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {selectedDifficulties.length > 0 || selectedTypes.length > 0 
                ? "No hay excursiones que coincidan con tus filtros"
                : "No hay excursiones disponibles"
              }
            </Text>
            <Text style={styles.emptySubText}>
              ¡Sé el primero en crear una!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateExcursion")}
      >
        <MaterialDesignIcons
          name="plus"
          size={28}
          color={colors.white}
        />
      </TouchableOpacity>

      {/* FILTER MODAL */}
      {showFilters && (
        <Modal
          visible={showFilters}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtros</Text>
                <TouchableOpacity 
                  onPress={() => setShowFilters(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialDesignIcons name="close" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Dificultad */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupTitle}>Dificultad</Text>
                  {EXCURSION_DIFFICULTIES.map((difficulty) => (
                    <TouchableOpacity
                      key={difficulty}
                      style={styles.filterItem}
                      onPress={() => toggleDifficulty(difficulty)}
                    >
                      <View style={[
                        styles.checkbox,
                        selectedDifficulties.includes(difficulty) && styles.checkboxActive
                      ]}>
                        {selectedDifficulties.includes(difficulty) && (
                          <MaterialDesignIcons name="check" size={14} color={colors.white} />
                        )}
                      </View>
                      <Text style={styles.filterItemText}>{difficulty}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tipo de Excursión */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupTitle}>Tipo de Excursión</Text>
                  {EXCURSION_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.filterItem}
                      onPress={() => toggleType(type)}
                    >
                      <View style={[
                        styles.checkbox,
                        selectedTypes.includes(type) && styles.checkboxActive
                      ]}>
                        {selectedTypes.includes(type) && (
                          <MaterialDesignIcons name="check" size={14} color={colors.white} />
                        )}
                      </View>
                      <Text style={styles.filterItemText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.btnSecondary}
                  onPress={() => {
                    resetFilters();
                  }}
                >
                  <Text style={styles.btnSecondaryText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.btnPrimary}
                  onPress={() => setShowFilters(false)}
                >
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
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
    paddingHorizontal: 0,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    backgroundColor: colors.primary,
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