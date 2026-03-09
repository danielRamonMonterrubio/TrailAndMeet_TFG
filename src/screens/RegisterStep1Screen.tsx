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
import { checkEmailExists } from "../services/authService";

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    "RegisterStep1"
  >;
};

const RegisterStep1Screen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [repeatError, setRepeatError] = useState("");

  const validate = () => {
    let valid = true;

    setEmailError("");
    setPasswordError("");
    setRepeatError("");

    const emailRegex = /\S+@\S+\.\S+/;

    if (!emailRegex.test(email)) {
      setEmailError("Introduce un correo válido");
      valid = false;
    }

    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      valid = false;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError("Debe contener al menos una mayúscula");
      valid = false;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError("Debe contener al menos un número");
      valid = false;
    } else if (!/[_\-\.@]/.test(password)) {
      setPasswordError("Debe contener al menos un símbolo (. - _ @)");
      valid = false;
    }

    if (password !== repeatPassword) {
      setRepeatError("Debes confirmar tu contraseña");
      valid = false;
    }

    return valid;
  };

const handleContinue = async () => {
  if (!validate()) return;

  try {
    const exists = await checkEmailExists(email);

    if (exists) {
      setEmailError("Este correo ya está registrado");
      return;
    }

    navigation.navigate("RegisterStep2", {
      email,
      password,
    });

  } catch (error) {
    console.error(error);
    setEmailError("Error comprobando el correo");
  }
};

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          colors.primaryGradientStart,
          colors.primaryGradientEnd,
        ]}
        style={styles.header}
      >
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialDesignIcons
            name="arrow-left"
            size={24}
            color={colors.white}
          />
        </Pressable>

        <View>
          <Text style={styles.headerTitle}>Crear Cuenta</Text>
          <Text style={styles.headerSubtitle}>Paso 1 de 2</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.title}>Bienvenido a TAM</Text>
        <Text style={styles.subtitle}>
          Comencemos con tu correo y contraseña
        </Text>

        {/* EMAIL */}
        <View style={styles.card}>
          <Text style={styles.label}>Correo electrónico</Text>

          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {emailError !== "" && (
            <Text style={styles.error}>{emailError}</Text>
          )}
        </View>

        {/* PASSWORD */}
        <View style={styles.card}>
          <Text style={styles.label}>Contraseña</Text>

          <View style={styles.passwordRow}>
            <TextInput
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
            />

            <Pressable
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialDesignIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {passwordError !== "" && (
            <Text style={styles.error}>{passwordError}</Text>
          )}

          <View style={styles.rules}>
            <Text style={styles.rule}>• Mínimo 8 caracteres</Text>
            <Text style={styles.rule}>• Al menos una mayúscula</Text>
            <Text style={styles.rule}>• Al menos un número</Text>
            <Text style={styles.rule}>• Al menos un símbolo (. - _ @)</Text>
          </View>
        </View>

        {/* REPEAT PASSWORD */}
        <View style={styles.card}>
          <Text style={styles.label}>Repetir contraseña</Text>

          <View style={styles.passwordRow}>
            <TextInput
              secureTextEntry={!showRepeatPassword}
              style={[styles.input, { flex: 1 }]}
              value={repeatPassword}
              onChangeText={setRepeatPassword}
            />

            <Pressable
              onPress={() =>
                setShowRepeatPassword(!showRepeatPassword)
              }
            >
              <MaterialDesignIcons
                name={
                  showRepeatPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {repeatError !== "" && (
            <Text style={styles.error}>{repeatError}</Text>
          )}
        </View>

        <Pressable style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continuar</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default RegisterStep1Screen;

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
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  subtitle: {
    color: colors.textSecondary,
    marginBottom: 20,
  },

  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },

  label: {
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.grayLight,
    borderRadius: 10,
    padding: 10,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  rules: {
    marginTop: 8,
  },

  rule: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  error: {
    color: "red",
    marginTop: 6,
    fontSize: 12,
  },

  button: {
    backgroundColor: colors.primaryGradientStart,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});