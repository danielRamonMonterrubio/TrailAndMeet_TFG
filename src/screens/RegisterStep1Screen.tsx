import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { RootStackParamList } from "../navigation/AppNavigation";
import { checkEmailExists } from "../services/authService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "RegisterStep1">;
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

      navigation.navigate("RegisterStep2", { email, password });
    } catch (error) {
      console.error(error);
      setEmailError("Error comprobando el correo");
    }
  };

  return (
    <View style={shared.container}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={shared.header}
      >
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.white} />
        </Pressable>

        <View>
          <Text style={shared.headerTitle}>Crear Cuenta</Text>
          <Text style={shared.headerSubtitle}>Paso 1 de 2</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={shared.content}>
            <Text style={shared.screenTitle}>Bienvenido a TAM</Text>
            <Text style={styles.subtitle}>Comencemos con tu correo y contraseña</Text>

            {/* EMAIL */}
            <View style={shared.card}>
              <Text style={shared.label}>Correo electrónico</Text>
              <TextInput
                style={shared.input}
                placeholder="tu@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              {emailError !== "" && <Text style={shared.errorText}>{emailError}</Text>}
            </View>

            {/* CONTRASEÑA */}
            <View style={shared.card}>
              <Text style={shared.label}>Contraseña</Text>
              <View style={shared.passwordRow}>
                <TextInput
                  secureTextEntry={!showPassword}
                  style={[shared.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <MaterialDesignIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
              {passwordError !== "" && <Text style={shared.errorText}>{passwordError}</Text>}
              <View style={styles.rules}>
                <Text style={styles.rule}>• Mínimo 8 caracteres</Text>
                <Text style={styles.rule}>• Al menos una mayúscula</Text>
                <Text style={styles.rule}>• Al menos un número</Text>
                <Text style={styles.rule}>• Al menos un símbolo (. - _ @)</Text>
              </View>
            </View>

            {/* REPETIR CONTRASEÑA */}
            <View style={shared.card}>
              <Text style={shared.label}>Repetir contraseña</Text>
              <View style={shared.passwordRow}>
                <TextInput
                  secureTextEntry={!showRepeatPassword}
                  style={[shared.input, { flex: 1 }]}
                  value={repeatPassword}
                  onChangeText={setRepeatPassword}
                />
                <Pressable onPress={() => setShowRepeatPassword(!showRepeatPassword)}>
                  <MaterialDesignIcons
                    name={showRepeatPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
              {repeatError !== "" && <Text style={shared.errorText}>{repeatError}</Text>}
            </View>

            <Pressable
              style={[shared.primaryButton, styles.button]}
              onPress={handleContinue}
            >
              <Text style={shared.primaryButtonText}>Continuar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RegisterStep1Screen;

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 20,
  },
  rules: {
    marginTop: 8,
  },
  rule: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  button: {
    marginTop: 10,
  },
});
