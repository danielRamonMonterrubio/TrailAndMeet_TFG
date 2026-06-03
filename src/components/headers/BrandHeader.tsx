import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { colors } from "../../theme/colors";
import { NotificationContext } from "../../context/NotificationContext";
import { AuthContext } from "../../context/AuthContext";
import { logout } from "../../services/authService";

const BrandHeader: React.FC = () => {
  const { unreadCount } = useContext(NotificationContext);
  const { session, setSession } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    const token = session?.access_token;
    if (token) {
      try { await logout(token); } catch { }
    }
    setSession(null);
  };

  return (
    <LinearGradient
      colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <MaterialDesignIcons name="image-filter-hdr" size={26} color={colors.white} />

        <View style={styles.textContent}>
          <Text style={styles.appTitle}>TrailAndMeet</Text>
          <Text style={styles.subtitle}>Conecta con la naturaleza</Text>
        </View>

        <View style={styles.actions}>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('Notifications')} style={styles.bellWrap}>
            <MaterialDesignIcons name="bell-outline" size={22} color={colors.white} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable hitSlop={10} onPress={handleLogout}>
            <MaterialDesignIcons name="logout" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

export default BrandHeader;

const styles = StyleSheet.create({
  header: {
    paddingTop: (StatusBar.currentHeight ?? 24) + 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textContent: {
    flex: 1,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
  },
  subtitle: {
    fontSize: 11,
    color: colors.headerSubtitle,
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
});
