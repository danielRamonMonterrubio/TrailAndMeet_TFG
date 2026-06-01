import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { colors } from "../../theme/colors";
import { NotificationContext } from "../../context/NotificationContext";

type Props = {
  onLogout?: () => void;
  onNotifications?: () => void;
};

const BrandHeader: React.FC<Props> = ({ onLogout, onNotifications }) => {
  const { unreadCount } = useContext(NotificationContext);

  return (
    <LinearGradient
      colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <MaterialDesignIcons name="image-filter-hdr" size={32} color={colors.white} />

        <View style={styles.textContent}>
          <Text style={styles.appTitle}>TrailAndMeet</Text>
          <Text style={styles.subtitle}>Conecta con la naturaleza</Text>
        </View>

        <View style={styles.actions}>
          {onNotifications && (
            <Pressable hitSlop={10} onPress={onNotifications} style={styles.bellWrap}>
              <MaterialDesignIcons name="bell-outline" size={26} color={colors.white} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {onLogout ? (
            <Pressable hitSlop={10} onPress={onLogout}>
              <MaterialDesignIcons name="logout" size={26} color={colors.white} />
            </Pressable>
          ) : (
            <View style={styles.iconSpacer} />
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

export default BrandHeader;

const styles = StyleSheet.create({
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
  textContent: {
    flex: 1,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  bellWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: colors.errorRed,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  iconSpacer: {
    width: 26,
  },
});
