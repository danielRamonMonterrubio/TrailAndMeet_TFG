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
import { RouteProp } from "@react-navigation/native";
import { checkUsernameExists, completeRegistration } from "../services/authService";
import { supabase } from "../services/supabaseClient";

type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    "RegisterStep2"
  >;
  route: RouteProp<RootStackParamList, "RegisterStep2">;
};

const RegisterStep2Screen: React.FC<Props> = ({ navigation, route }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { email, password } = route.params;

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

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

  await completeRegistration(username);

    navigation.reset({
      index: 0,
      routes: [{ name: "ExcursionList" }],
    });

  } catch (error) {
    console.error(error);
    setError("Error creando la cuenta");
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
          <Text style={styles.headerSubtitle}>Paso 2 de 2</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>

        {/* ICONO */}
        <View style={styles.iconCircle}>
          <MaterialDesignIcons
            name="account-outline"
            size={32}
            color={colors.white}
          />
        </View>

        <Text style={styles.title}>
          Elige tu nombre de usuario
        </Text>

        <Text style={styles.subtitle}>
          Será tu identidad en la comunidad
        </Text>

        {/* INPUT */}
        <View style={styles.card}>
          <Text style={styles.label}>Nombre de usuario</Text>

          <TextInput
            style={styles.input}
            placeholder="tu_usuario"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          {error !== "" && (
            <Text style={styles.error}>{error}</Text>
          )}

          <View style={styles.rules}>
            <Text style={styles.rule}>✓ Entre 3 y 20 caracteres</Text>
            <Text style={styles.rule}>
              ✓ Solo letras, números y guiones bajos (_)
            </Text>
            <Text style={styles.rule}>
              ✓ Sin espacios ni caracteres especiales
            </Text>
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
            <Text style={styles.infoTitle}>
              ¿Por qué un nombre de usuario?
            </Text>

            <Text style={styles.infoText}>
              Tu nombre de usuario será visible para otros senderistas.
              Elige uno que te represente y sea fácil de recordar.
            </Text>
          </View>
        </View>

        {/* BUTTON */}
        <Pressable
          style={styles.button}
          onPress={handleCreateAccount}
        >
          <MaterialDesignIcons
            name="check"
            size={20}
            color={colors.white}
          />

          <Text style={styles.buttonText}>
            Crear Cuenta
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default RegisterStep2Screen;

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

  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryGradientStart,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: colors.textPrimary,
  },

  subtitle: {
    textAlign: "center",
    color: colors.textSecondary,
    marginBottom: 24,
  },

  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
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

  rules: {
    marginTop: 12,
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

  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#E6F4EF",
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

  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryGradientStart,
    padding: 16,
    borderRadius: 12,
  },

  buttonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});