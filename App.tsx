import React from "react";
import AppNavigator from "./src/navigation/AppNavigation";
import { AuthProvider } from "./src/context/AuthContext";

export default function App() {

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );

}