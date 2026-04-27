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
import { RouteProp } from "@react-navigation/native";

import { colors } from "../theme/colors";
import { shared } from "../theme/styles";
import { RootStackParamList } from "../navigation/AppNavigation";
import { checkUsernameExists, completeRegistration } from "../services/authService";
import { supabase } from "../services/supabaseClient";
import { AuthContext } from "../context/AuthContext";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "RegisterStep2">;
  route: RouteProp<RootStackParamList, "RegisterStep2">;
};

const RegisterStep2Screen: React.FC<Props> = ({ navigation, route }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { email, password } = route.params;
  const { setSession } = useContext(AuthContext);

  const validate = () => {
    setError("");

    if (username.length < 3 || username.length > 20) {
      setError("El nombre debe tener entre 3 y 20 caracteres");
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Solo letras, números y guiones bajos (_)");
      return false;
    }

    return true;
  };

  const handleCreateAccount = async () => {
    if (!validate()) return;

    try {
      const exists = await checkUsernameExists(username);

      if (exists) {
        setError("Este nombre de usuario ya está en uso");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const token = data?.session?.access_token;
      if (!token) {
        setError("Error obteniendo token de sesión");
        return;
      }

      await completeRegistration(username, token);

      if (data.session) {
        setSession(data.session);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "ExcursionList" }],
      });
    } catch (err) {
      console.error(err);
      setError("Error creando la cuenta");
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
          <Text style={shared.headerSubtitle}>Paso 2 de 2</Text>
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

            <View style={shared.iconCircle}>
              <MaterialDesignIcons name="account-outline" size={32} color={colors.white} />
            </View>

            <Text style={[shared.screenTitle, styles.titleCentered]}>
              Elige tu nombre de usuario
            </Text>

            <Text style={styles.subtitle}>Será tu identidad en la comunidad</Text>

            {/* INPUT */}
            <View style={[shared.card, { marginBottom: 20 }]}>
              <Text style={shared.label}>Nombre de usuario</Text>
              <TextInput
                style={shared.input}
                placeholder="tu_usuario"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
              {error !== "" && <Text style={shared.errorText}>{error}</Text>}
              <View style={styles.rules}>
                <Text style={styles.rule}>✓ Entre 3 y 20 caracteres</Text>
                <Text style={styles.rule}>✓ Solo letras, números y guiones bajos (_)</Text>
                <Text style={styles.rule}>✓ Sin espacios ni caracteres especiales</Text>
              </View>
            </View>

            {/* INFO BOX */}
            <View style={styles.infoBox}>
              <MaterialDesignIcons
                name="check-circle-outline"
                size={20}
                color={colors.primaryGradientStart}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>¿Por qué un nombre de usuario?</Text>
                <Text style={styles.infoText}>
                  Tu nombre de usuario será visible para otros senderistas.
                  Elige uno que te represente y sea fácil de recordar.
                </Text>
              </View>
            </View>

            {/* BOTÓN */}
            <Pressable style={shared.primaryButton} onPress={handleCreateAccount}>
              <MaterialDesignIcons name="check" size={20} color={colors.white} />
              <Text style={shared.primaryButtonText}>Crear Cuenta</Text>
            </Pressable>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RegisterStep2Screen;

const styles = StyleSheet.create({
  titleCentered: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: colors.textSecondary,
    marginBottom: 24,
  },
  rules: {
    marginTop: 12,
  },
  rule: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.infoBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
