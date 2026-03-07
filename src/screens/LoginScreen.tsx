import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/AppNavigation";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <LinearGradient
        colors={[
          colors.primaryGradientStart,
          colors.primaryGradientEnd,
        ]}
        style={styles.header}
      >
        <Pressable
          onPress={() => navigation.navigate("Welcome")}
        >
          <MaterialDesignIcons
            name="arrow-left"
            size={24}
            color={colors.white}
          />
        </Pressable>

        <View>
          <Text style={styles.headerTitle}>Iniciar Sesión</Text>
          <Text style={styles.headerSubtitle}>
            Accede a tu cuenta
          </Text>
        </View>
      </LinearGradient>

      {/* CONTENT */}
      <View style={styles.content}>

        {/* ICON */}
        <View style={styles.iconCircle}>
          <MaterialDesignIcons
            name="login"
            size={32}
            color={colors.white}
          />
        </View>

        <Text style={styles.title}>¡Hola de nuevo!</Text>
        <Text style={styles.subtitle}>
          Inicia sesión para continuar
        </Text>

        {/* USER INPUT */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <MaterialDesignIcons
              name="account-outline"
              size={18}
              color={colors.primaryGradientStart}
            />
            <Text style={styles.inputLabel}>
              Correo electrónico
            </Text>
          </View>

          <TextInput
            placeholder="correo@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* PASSWORD INPUT */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <MaterialDesignIcons
              name="lock-outline"
              size={18}
              color={colors.primaryGradientStart}
            />
            <Text style={styles.inputLabel}>
              Contraseña
            </Text>
          </View>

          <View style={styles.passwordRow}>
            <TextInput
              secureTextEntry
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
            />

            <MaterialDesignIcons
              name="eye-outline"
              size={20}
              color={colors.textMuted}
            />
          </View>
        </View>

        {/* FORGOT PASSWORD */}
        <Pressable style={styles.forgot}>
          <Text style={styles.forgotText}>
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>

        {/* LOGIN BUTTON */}
        <Pressable style={styles.loginButton}>
          <MaterialDesignIcons
            name="login"
            size={20}
            color={colors.white}
          />
          <Text style={styles.loginText}>
            Iniciar Sesión
          </Text>
        </Pressable>

        {/* REGISTER */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>
            ¿No tienes cuenta?
          </Text>

          <Pressable
            onPress={() =>
              navigation.navigate("RegisterStep1")
            }
          >
            <Text style={styles.registerLink}>
              Regístrate aquí
            </Text>
          </Pressable>
        </View>

      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
  },

  headerSubtitle: {
    color: "#D1FAE5",
    fontSize: 12,
  },

  content: {
    padding: 24,
    alignItems: "center",
  },

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryGradientStart,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 30,
  },

  inputCard: {
    width: "100%",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },

  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  inputLabel: {
    fontWeight: "600",
    color: colors.textPrimary,
  },

  input: {
    backgroundColor: colors.grayLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  forgot: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },

  forgotText: {
    color: colors.primaryGradientStart,
    fontSize: 13,
  },

  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryGradientStart,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 30,
  },

  loginText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },

  registerRow: {
    flexDirection: "row",
    gap: 6,
  },

  registerText: {
    color: colors.textSecondary,
  },

  registerLink: {
    color: colors.primaryGradientStart,
    fontWeight: "600",
  },
});