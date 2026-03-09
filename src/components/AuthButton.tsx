import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function AuthButton({ title, variant, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        variant === "primary" ? styles.primary : styles.secondary
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "primary" ? styles.primaryText : styles.secondaryText
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center"
  },

  primary: {
    backgroundColor: colors.white
  },

  secondary: {
    borderWidth: 1,
    borderColor: colors.white
  },

  text: {
    fontSize: 16,
    fontWeight: "600"
  },

  primaryText: {
    color: colors.primaryGradientStart
  },

  secondaryText: {
    color: colors.white
  }
});