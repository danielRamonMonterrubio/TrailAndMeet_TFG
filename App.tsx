import React from "react";
import AppNavigator from "./src/navigation/AppNavigation";
import { AuthProvider } from "./src/context/AuthContext.tsx";

export default function App() {

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );

}