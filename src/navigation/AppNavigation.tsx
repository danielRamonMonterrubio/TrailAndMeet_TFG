import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ExcursionListScreen from "../screens/ExcursionListScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterStep1Screen from "../screens/RegisterStep1Screen";
import RegisterStep2Screen from "../screens/RegisterStep2Screen";

import { View, Text } from "react-native";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RegisterStep1: undefined;
  RegisterStep2: undefined;
  ExcursionList: undefined;
  ExcursionDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ExcursionDetailPlaceholder = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Detalle de excursión</Text>
    </View>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
        <Stack.Screen 
          name="RegisterStep1" 
          component={RegisterStep1Screen} />
        <Stack.Screen 
          name="RegisterStep2" 
          component={RegisterStep2Screen} />

        <Stack.Screen
          name="ExcursionList"
          component={ExcursionListScreen}
        />

        <Stack.Screen
          name="ExcursionDetail"
          component={ExcursionDetailPlaceholder}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;