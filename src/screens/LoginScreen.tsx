import React, { useState, useContext } from "react";
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
import { login } from "../services/authService";
import { AuthContext } from "../context/AuthContext";
import { registerPushToken } from "../services/notificationService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setSession } = useContext(AuthContext);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Introduce correo y contraseña");
      return;
    }

    try {
      const data = await login(email, password);

      if (data.session) {
        setSession(data.session);
        registerPushToken();
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "ExcursionList" }],
      });
    } catch (err: any) {
      if (err.message.includes("Invalid login credentials")) {
        setError("Correo o contraseña incorrectos");
      } else {
        setError("Error iniciando sesión");
      }
    }
  };

  return (
    <View style={shared.container}>

      {/* HEADER */}
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={shared.header}
      >
        <Pressable onPress={() => navigation.navigate("Welcome")}>
          <MaterialDesignIcons name="arrow-left" size={24} color={colors.white} />
        </Pressable>

        <View>
          <Text style={shared.headerTitle}>Iniciar Sesión</Text>
          <Text style={shared.headerSubtitle}>Accede a tu cuenta</Text>
        </View>
      </LinearGradient>

      {/* CONTENT */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={shared.content}>

            {/* ICON */}
            <View style={shared.iconCircle}>
              <MaterialDesignIcons name="login" size={32} color={colors.white} />
            </View>

            <Text style={[shared.screenTitle, { textAlign: "center" }]}>¡Hola de nuevo!</Text>
            <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

            {/* EMAIL */}
            <View style={shared.card}>
              <Text style={shared.label}>Correo electrónico</Text>
              <TextInput
                placeholder="correo@example.com"
                placeholderTextColor={colors.textMuted}
                style={shared.input}
                value={email}
                onChangeText={setEmail}
              />
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

              {error !== "" && <Text style={shared.errorText}>{error}</Text>}
            </View>

            {/* BOTÓN */}
            <Pressable style={styles.loginButton} onPress={handleLogin}>
              <MaterialDesignIcons name="login" size={20} color={colors.white} />
              <Text style={shared.primaryButtonText}>Iniciar Sesión</Text>
            </Pressable>

            {/* REGISTRO */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿No tienes cuenta?</Text>
              <Pressable onPress={() => navigation.navigate("RegisterStep1")}>
                <Text style={styles.registerLink}>Regístrate aquí</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 30,
    textAlign: "center",
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
