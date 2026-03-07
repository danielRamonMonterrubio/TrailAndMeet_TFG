import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/AppNavigator";


type Props = {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    "Welcome"
  >;
};

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <LinearGradient
      colors={[
        colors.primaryGradientStart,
        colors.primaryGradientEnd,
      ]}
      style={styles.container}
    >
      <SafeAreaView style={styles.inner}>
        
        {/* LOGO */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <MaterialDesignIcons
              name="image-filter-hdr"
              size={80}
              color={colors.white}
            />
          </View>

          <Text style={styles.title}>TrailAndMeet</Text>
          <Text style={styles.subtitle}>
            Conecta con la naturaleza
          </Text>
        </View>

        {/* FEATURES */}
        <View style={styles.features}>
          <FeatureItem
            icon="map-marker"
            title="Descubre rutas increíbles"
            description="Explora nuevos senderos"
          />

          <FeatureItem
            icon="account-group"
            title="Conoce senderistas"
            description="Comparte experiencias"
          />

          <FeatureItem
            icon="image-filter-hdr"
            title="Organiza excursiones"
            description="Crea tus propias rutas"
          />
        </View>

        {/* BUTTONS */}
        <View style={styles.buttons}>
          <Pressable
            style={styles.loginButton}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginText}>
              Iniciar Sesión
            </Text>
          </Pressable>

          <Pressable
            style={styles.registerButton}
            onPress={() => navigation.navigate("RegisterStep1")}
          >
            <Text style={styles.registerText}>
              Registrarse
            </Text>
          </Pressable>

          <Text style={styles.terms}>
            Al continuar, aceptas nuestros Términos y Condiciones
          </Text>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
};

export default WelcomeScreen;

type FeatureProps = {
  icon: React.ComponentProps<typeof MaterialDesignIcons>["name"];
  title: string;
  description: string;
};

const FeatureItem: React.FC<FeatureProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <View style={styles.featureItem}>
      <View style={styles.iconCircle}>
        <MaterialDesignIcons
          name={icon}
          size={20}
          color={colors.white}
        />
      </View>

      <View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  inner: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  logoSection: {
    alignItems: "center",
    marginTop: 60,
  },

  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.white,
  },

  subtitle: {
    fontSize: 16,
    color: "#D1FAE5",
    marginTop: 8,
  },

  features: {
    gap: 24,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },

  featureDescription: {
    fontSize: 14,
    color: "#D1FAE5",
  },

  buttons: {
    gap: 16,
  },

  loginButton: {
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  loginText: {
    color: colors.primaryGradientStart,
    fontWeight: "600",
    fontSize: 16,
  },

  registerButton: {
    borderWidth: 1,
    borderColor: colors.white,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  registerText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },

  terms: {
    textAlign: "center",
    fontSize: 12,
    color: "#D1FAE5",
    marginTop: 8,
  },
});