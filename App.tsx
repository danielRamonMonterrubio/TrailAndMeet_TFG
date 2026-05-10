import React from "react";
import AppNavigator from "./src/navigation/AppNavigation";
import { AuthProvider } from "./src/context/AuthContext";
import { ChatUnreadProvider } from "./src/context/ChatUnreadContext";

export default function App() {
  return (
    <AuthProvider>
      <ChatUnreadProvider>
        <AppNavigator />
      </ChatUnreadProvider>
    </AuthProvider>
  );
}