import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import ExcursionListScreen from "../screens/ExcursionListScreen";
import MyExcursionsScreen from "../screens/MyExcursionsScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterStep1Screen from "../screens/RegisterStep1Screen";
import RegisterStep2Screen from "../screens/RegisterStep2Screen";
import CreateExcursionScreen from "../screens/CreateExcursionScreen";
import ExcursionDetailScreen from "../screens/ExcursionDetailScreen";
import PendingRequestsScreen from "../screens/PendingRequestsScreen";
import EditExcursionScreen from "../screens/EditExcursionScreen";
import ExcursionParticipantsScreen from "../screens/ExcursionParticipantsScreen";

import { AuthContext } from "../context/AuthContext";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RegisterStep1: undefined;
  RegisterStep2: {
    email: string;
    password: string;
  };
  ExcursionList: undefined;
  MyExcursions: undefined;
  CreateExcursion: undefined;
  ExcursionDetail: { id: string };
  PendingRequests: { excursionId: string; excursionTitle: string };
  EditExcursion: { excursionId: string };
  ExcursionParticipants: { excursionId: string; excursionTitle: string; organizerId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

// Stack de autenticación
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
    <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
  </Stack.Navigator>
);

// Stack para ExcursionList con su navegación interna
const ExcursionListStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExcursionList" component={ExcursionListScreen} />
    <Stack.Screen name="CreateExcursion" component={CreateExcursionScreen} />
    <Stack.Screen name="ExcursionDetail" component={ExcursionDetailScreen} />
    <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} />
    <Stack.Screen name="EditExcursion" component={EditExcursionScreen} />
    <Stack.Screen name="ExcursionParticipants" component={ExcursionParticipantsScreen} />
  </Stack.Navigator>
);

// Stack para MyExcursions con su navegación interna
const MyExcursionsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyExcursions" component={MyExcursionsScreen} />
    <Stack.Screen name="ExcursionDetail" component={ExcursionDetailScreen} />
    <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} />
    <Stack.Screen name="EditExcursion" component={EditExcursionScreen} />
    <Stack.Screen name="ExcursionParticipants" component={ExcursionParticipantsScreen} />
  </Stack.Navigator>
);

// Bottom Tab Navigator
const AppStack = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primaryGradientStart,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.grayLight,
      },
      tabBarIcon: ({ color, size }) => {
        let iconName: React.ComponentProps<typeof MaterialDesignIcons>["name"] = "help";

        if (route.name === "ExcursionList") {
          iconName = "map";
        } else if (route.name === "MyExcursions") {
          iconName = "briefcase";
        }

        return <MaterialDesignIcons name={iconName} size={size} color={color} />;
      },
      tabBarLabel: route.name === "ExcursionList" ? "Explorar" : "Mis Excursiones",
    })}
  >
    <Tab.Screen
      name="ExcursionList"
      component={ExcursionListStack}
      options={{
        title: "Explorar",
      }}
      listeners={({ navigation, route }) => ({
        tabPress: (e) => {
          // Navegrar al screen inicial del stack usando nested navigation
          // Esto resetea el stack a la pantalla raíz
          navigation.navigate('ExcursionList' as never, {
            screen: 'ExcursionList',
          } as never);
        },
      })}
    />
    <Tab.Screen
      name="MyExcursions"
      component={MyExcursionsStack}
      options={{
        title: "Mis Excursiones",
      }}
      listeners={({ navigation, route }) => ({
        tabPress: (e) => {
          // Navegrar al screen inicial del stack usando nested navigation
          // Esto resetea el stack a la pantalla raíz
          navigation.navigate('MyExcursions' as never, {
            screen: 'MyExcursions',
          } as never);
        },
      })}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.backgroundSoft }} />
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;