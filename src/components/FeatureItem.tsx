import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function FeatureItem({ title, description }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.icon} />

      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)"
  },

  title: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16
  },

  description: {
    color: colors.white,
    opacity: 0.85,
    fontSize: 14
  }
});