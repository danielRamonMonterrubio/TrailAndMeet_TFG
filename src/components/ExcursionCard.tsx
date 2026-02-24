import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import type { ComponentProps } from "react";
import { Excursion } from "../models/Excursion";
import { colors } from "../theme/colors";

interface Props {
  excursion: Excursion;
  onPress: () => void;
}

const ExcursionCard: React.FC<Props> = ({ excursion, onPress }) => {
  const chipStyle = getDifficultyChipStyles(excursion.difficulty);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* top row */}
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {excursion.title}
        </Text>

        <View style={[styles.chip, { backgroundColor: chipStyle.bg }]}>
          <Text style={[styles.chipText, { color: chipStyle.text }]}>
            {excursion.difficulty}
          </Text>
        </View>
      </View>

      {/* details */}
      <View style={styles.rows}>
        <InfoRow
          icon="calendar"
          text={`${formatDateEs(excursion.date)} • ${excursion.time}`}
        />
        <InfoRow icon="map-marker" text={excursion.meetingPoint} />
        <InfoRow icon="account" text={`${excursion.availableSpots} plazas disponibles`} />
      </View>

      <View style={styles.divider} />

      {/* bottom row */}
      <View style={styles.bottomRow}>
        <View style={styles.organizerRow}>
          <MaterialDesignIcons name="trending-up" size={16} color={colors.textMuted} />
          <Text style={styles.organizerText}>
            Organiza: {excursion.organizerName}
          </Text>
        </View>

        <View style={styles.detailsLink}>
          <Text style={styles.detailsText}>Ver detalles</Text>
          <Text style={styles.arrow}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ExcursionCard;
type MaterialDesignIconName = ComponentProps<typeof MaterialDesignIcons>["name"];
const InfoRow = ({ icon, text }: { icon: MaterialDesignIconName; text: string }) => {
  return (
    <View style={styles.infoRow}>
      <MaterialDesignIcons name={icon} size={18} color={colors.primaryGradientStart} />
      <Text style={styles.infoText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
};

const getDifficultyChipStyles = (d: Excursion["difficulty"]) => {
  if (d === "Facil") return { bg: colors.easyBg, text: colors.easyText };
  if (d === "Medio") return { bg: colors.mediumBg, text: colors.mediumText };
  return { bg: colors.hardBg, text: colors.hardText };
};

const formatDateEs = (iso: string) => {
  // "2026-02-26" -> "26 de febrero"
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${d} de ${months[m - 1]}`;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.grayLight,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 22,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rows: {
    marginTop: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.grayLight,
    marginTop: 14,
  },
  bottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  organizerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryGradientStart,
  },
  arrow: {
    fontSize: 16,
    color: colors.primaryGradientStart,
    marginTop: -1,
  },
});