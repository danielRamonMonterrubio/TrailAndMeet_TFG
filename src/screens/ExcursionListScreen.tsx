import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { excursionService } from "../services/excursionService";
import { Excursion } from "../models/Excursion";
import ExcursionCard from "../components/cards/ExcursionCard";
import BrandHeader from "../components/headers/BrandHeader";
import { colors } from "../theme/colors";
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

      // Limpiar sesión del contexto y AsyncStorage siempre
      setSession(null);
      await AsyncStorage.removeItem('auth_session');

      navigation.reset({
        index: 0,
        routes: [{ name: "Welcome" }],
      });

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <BrandHeader
        rightIconName="logout"
        onRightIconPress={handleLogout}
      />

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Excursiones Disponibles
          </Text>
          <Text style={styles.sectionSubtitle}>
            {excursions.length} excursiones con plazas libres
          </Text>
        </View>

        {excursions.length > 0 &&
          excursions.map((excursion) => (
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

        {excursions.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialDesignIcons name="image-filter-hdr" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              No hay excursiones disponibles
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
    </View>
  );
};

export default ExcursionListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
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
});