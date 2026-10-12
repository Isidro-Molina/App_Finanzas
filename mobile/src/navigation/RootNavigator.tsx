import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { useTheme } from '../context/ThemeContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { DashboardScreen } from '../screens/finances/DashboardScreen';
import { AddTransactionScreen } from '../screens/finances/AddTransactionScreen';
import { GroupsScreen } from '../screens/split/GroupsScreen';
import { GroupDetailScreen } from '../screens/split/GroupDetailScreen';
import { AddGroupExpenseScreen } from '../screens/split/AddGroupExpenseScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { AddCategoryScreen } from '../screens/finances/AddCategoryScreen';
import { ManageCategoriesScreen } from '../screens/finances/ManageCategoriesScreen';
import { EditProfileScreen } from '../screens/settings/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';

import { Wallet, Users, Settings, User, Bell } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const GroupStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsList" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { colors } = useTheme();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await apiClient.get<Array<{ isRead: boolean }>>('/notifications');
      setUnread(res.data.filter((n) => !n.isRead).length);
    } catch {
      // Silencioso: el badge es opcional
    }
  }, []);

  // Refresca el badge al abrir la app y cada 30s
  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.tabBorder,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_600SemiBold',
        },
      }}
    >
      <Tab.Screen
        name="Finanzas"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Grupos"
        component={GroupStack}
        options={{
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notificaciones"
        options={{
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      >
        {() => <NotificationsScreen onUnreadChange={setUnread} />}
      </Tab.Screen>
      <Tab.Screen
        name="Ajustes"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Usuario"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen
            name="AddTransaction"
            component={AddTransactionScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="AddGroupExpense"
            component={AddGroupExpenseScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="AddCategory"
            component={AddCategoryScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="ManageCategories"
            component={ManageCategoriesScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ presentation: 'modal' }}
          />
        </>
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
};
