import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import { colors } from "../../theme/colors";

type Props = {
  rightIconName?: React.ComponentProps<typeof MaterialDesignIcons>["name"];
  onRightIconPress?: () => void;
};

const BrandHeader: React.FC<Props> = ({
  rightIconName,
  onRightIconPress,
}) => {
  return (
    <LinearGradient
      colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <MaterialDesignIcons
          name="image-filter-hdr"
          size={32}
          color={colors.white}
        />

        <View style={styles.textContent}>
          <Text style={styles.appTitle}>TrailAndMeet</Text>
          <Text style={styles.subtitle}>Conecta con la naturaleza</Text>
        </View>

        {rightIconName ? (
          <Pressable
            hitSlop={10}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <MaterialDesignIcons
              name={rightIconName}
              size={26}
              color={colors.white}
            />
          </Pressable>
        ) : (
          <View style={styles.iconSpacer} />
        )}
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
  iconSpacer: {
    width: 26,
  },
});
