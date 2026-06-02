import React from "react";
import AppNavigator from "./src/navigation/AppNavigation";
import { AuthProvider } from "./src/context/AuthContext";
import { ChatUnreadProvider } from "./src/context/ChatUnreadContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { FriendRequestProvider } from "./src/context/FriendRequestContext";

export default function App() {
  return (
    <AuthProvider>
      <ChatUnreadProvider>
        <NotificationProvider>
          <FriendRequestProvider>
            <AppNavigator />
          </FriendRequestProvider>
        </NotificationProvider>
      </ChatUnreadProvider>
    </AuthProvider>
  );
}