import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ExcursionListScreen from "../screens/ExcursionListScreen";
import { View, Text } from "react-native";

export type RootStackParamList = {
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
        initialRouteName="ExcursionList"
        screenOptions={{
          headerShown: false,
        }}
      >
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