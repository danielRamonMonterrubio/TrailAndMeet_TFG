import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ExcursionListScreen from "../screens/ExcursionListScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterStep1Screen from "../screens/RegisterStep1Screen";
import RegisterStep2Screen from "../screens/RegisterStep2Screen";
import CreateExcursionScreen from "../screens/CreateExcursionScreen";
import ExcursionDetailScreen from "../screens/ExcursionDetailScreen"; 

import { AuthContext } from "../context/AuthContext.tsx";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RegisterStep1: undefined;
  RegisterStep2: {
    email: string;
    password: string;
  };
  ExcursionList: undefined;
  CreateExcursion: undefined;
  ExcursionDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {

  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={session ? "ExcursionList" : "Welcome"}
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
          component={RegisterStep1Screen}
        />

        <Stack.Screen
          name="RegisterStep2"
          component={RegisterStep2Screen}
        />

        <Stack.Screen
          name="ExcursionList"
          component={ExcursionListScreen}
        />

        <Stack.Screen name="CreateExcursion" component={CreateExcursionScreen} />

        <Stack.Screen name="ExcursionDetail" component={ExcursionDetailScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;