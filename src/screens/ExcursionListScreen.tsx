import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { excursionService } from "../services/excursionService";
import { Excursion } from "../models/Excursion";
import ExcursionCard from "../components/ExcursionCard";
import { colors } from "../theme/colors";

type RootStackParamList = {
  ExcursionList: undefined;
  ExcursionDetail: { id: string };
};

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    "ExcursionList"
  >;
};

const ExcursionListScreen: React.FC<Props> = ({ navigation }) => {
  const [excursions, setExcursions] = useState<Excursion[]>([]);

  useEffect(() => {
    loadExcursions();
  }, []);

  const loadExcursions = async () => {
    const data = await excursionService.getAvailableExcursions();
    setExcursions(data);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient
        colors={[
          colors.primaryGradientStart,
          colors.primaryGradientEnd,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <MaterialDesignIcons name="image-filter-hdr" size={32} color={colors.white} />
          <View>
            <Text style={styles.appTitle}>TrailAndMeet</Text>
            <Text style={styles.subtitle}>
              Conecta con la naturaleza
            </Text>
          </View>
        </View>
      </LinearGradient>

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
    </View>
  );
};

export default ExcursionListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.white,
  },
  subtitle: {
    fontSize: 12,
    color: "#D1FAE5",
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
});