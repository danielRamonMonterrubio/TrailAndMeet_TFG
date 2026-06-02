import React, { useContext, useEffect } from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import ExcursionListScreen from "../screens/ExcursionListScreen";
import MyExcursionsScreen from "../screens/MyExcursionsScreen";
import MyChatsScreen from "../screens/MyChatsScreen";
import MyForumsScreen from "../screens/MyForumsScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterStep1Screen from "../screens/RegisterStep1Screen";
import RegisterStep2Screen from "../screens/RegisterStep2Screen";
import CreateExcursionScreen from "../screens/CreateExcursionScreen";
import ExcursionDetailScreen from "../screens/ExcursionDetailScreen";
import PendingRequestsScreen from "../screens/PendingRequestsScreen";
import EditExcursionScreen from "../screens/EditExcursionScreen";
import ExcursionParticipantsScreen from "../screens/ExcursionParticipantsScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import UserSearchScreen from "../screens/UserSearchScreen";
import ExploreForumsScreen from "../screens/ExploreForumsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import FriendsScreen from "../screens/FriendsScreen";
import CreateForumScreen from "../screens/CreateForumScreen";
import ForumDetailScreen from "../screens/ForumDetailScreen";
import ForumMembersScreen from "../screens/ForumMembersScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import RateParticipantsScreen from "../screens/RateParticipantsScreen";

import { AuthContext } from "../context/AuthContext";
import { ChatUnreadContext } from "../context/ChatUnreadContext";
import { NotificationContext } from "../context/NotificationContext";
import { FriendRequestContext } from "../context/FriendRequestContext";
import BrandHeader from "../components/headers/BrandHeader";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RegisterStep1: undefined;
  RegisterStep2: { email: string; password: string };
  ExcursionList: undefined;
  MyExcursions: undefined;
  Comunidad: undefined;
  Profile: undefined;
  EditProfile: undefined;
  UserProfile: { userId: string; username: string };
  UserSearch: undefined;
  CreateExcursion: undefined;
  ExcursionDetail: { id: string };
  PendingRequests: { excursionId: string; excursionTitle: string };
  EditExcursion: { excursionId: string };
  ExcursionParticipants: { excursionId: string; excursionTitle: string; organizerId: string };
  MyChats: undefined;
  Chat: { excursionId: string; excursionTitle: string; excursionStatus: string };
  MyForums: undefined;
  ExploreForums: undefined;
  CreateForum: undefined;
  ForumDetail: { foroId: number; foroTitulo: string };
  ForumMembers: { foroId: number; foroTitulo: string };
  CreatePost: { foroId: number; foroTitulo: string };
  PostDetail: { postId: number; postTitulo: string; foroId: number };
  Notifications: undefined;
  Friends: undefined;
  RateParticipants: { excursionId: string; excursionTitle: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

type ComunidadTabsParamList = {
  MyForums: undefined;
  MyChats: undefined;
};
const ComunidadTopTab = createMaterialTopTabNavigator<ComunidadTabsParamList>();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
    <Stack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
  </Stack.Navigator>
);

const ExcursionListStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExcursionList" component={ExcursionListScreen} />
    <Stack.Screen name="CreateExcursion" component={CreateExcursionScreen} />
    <Stack.Screen name="ExcursionDetail" component={ExcursionDetailScreen} />
    <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} />
    <Stack.Screen name="EditExcursion" component={EditExcursionScreen} />
    <Stack.Screen name="ExcursionParticipants" component={ExcursionParticipantsScreen} />
    <Stack.Screen name="RateParticipants" component={RateParticipantsScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const MyExcursionsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyExcursions" component={MyExcursionsScreen} />
    <Stack.Screen name="ExcursionDetail" component={ExcursionDetailScreen} />
    <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} />
    <Stack.Screen name="EditExcursion" component={EditExcursionScreen} />
    <Stack.Screen name="ExcursionParticipants" component={ExcursionParticipantsScreen} />
    <Stack.Screen name="RateParticipants" component={RateParticipantsScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const ComunidadTopTabs = () => {
  const navigation = useNavigation<any>();
  return (
  <View style={{ flex: 1 }}>
    <BrandHeader />
    <ComunidadTopTab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primaryGradientStart,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarIndicatorStyle: { backgroundColor: colors.primaryGradientStart },
      tabBarStyle: { backgroundColor: colors.white },
      tabBarLabelStyle: { fontWeight: '600', fontSize: 14 },
    }}
  >
      <ComunidadTopTab.Screen name="MyForums" component={MyForumsScreen} options={{ title: 'Foros' }} />
      <ComunidadTopTab.Screen name="MyChats" component={MyChatsScreen} options={{ title: 'Chats' }} />
    </ComunidadTopTab.Navigator>
  </View>
  );
};

const ComunidadStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Comunidad" component={ComunidadTopTabs} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="ExploreForums" component={ExploreForumsScreen} />
    <Stack.Screen name="CreateForum" component={CreateForumScreen} />
    <Stack.Screen name="ForumDetail" component={ForumDetailScreen} />
    <Stack.Screen name="ForumMembers" component={ForumMembersScreen} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} />
  </Stack.Navigator>
);

const FriendsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Friends" component={FriendsScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="UserSearch" component={UserSearchScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
  </Stack.Navigator>
);

const AppStack = () => {
  const { totalUnread } = useContext(ChatUnreadContext);
  const { setUnreadCount } = useContext(NotificationContext);
  const { pendingCount, setPendingCount } = useContext(FriendRequestContext);

  useEffect(() => {
    import('../services/notificationService').then(({ getNotifications }) => {
      getNotifications().then(({ unreadCount }) => setUnreadCount(unreadCount)).catch(() => {});
    });
    import('../services/friendService').then(({ friendService }) => {
      friendService.getFriendRequests().then(requests => setPendingCount(requests.length)).catch(() => {});
    });
  }, [setUnreadCount, setPendingCount]);

  return (
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
          if (route.name === "ExcursionList") iconName = "map";
          else if (route.name === "MyExcursions") iconName = "briefcase";
          else if (route.name === "Comunidad") iconName = "forum";
          else if (route.name === "Friends") iconName = "account-group";
          else if (route.name === "Profile") iconName = "account";
          return <MaterialDesignIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="ExcursionList"
        component={ExcursionListStack}
        options={{ title: "Explorar" }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('ExcursionList' as never, { screen: 'ExcursionList' } as never);
          },
        })}
      />
      <Tab.Screen
        name="MyExcursions"
        component={MyExcursionsStack}
        options={{ title: "Mis Excursiones" }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('MyExcursions' as never, { screen: 'MyExcursions' } as never);
          },
        })}
      />
      <Tab.Screen
        name="Comunidad"
        component={ComunidadStack}
        options={{
          title: "Comunidad",
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Comunidad' as never, { screen: 'Comunidad' } as never);
          },
        })}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsStack}
        options={{
          title: "Amigos",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Friends' as never, { screen: 'Friends' } as never);
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ title: "Perfil" }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Profile' as never, { screen: 'Profile' } as never);
          },
        })}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { session, loading } = useContext(AuthContext);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.backgroundSoft }} />;
  }

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
