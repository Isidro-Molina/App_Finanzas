import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/finances/DashboardScreen';
import { AddTransactionScreen } from '../screens/finances/AddTransactionScreen';
import { GroupsScreen } from '../screens/split/GroupsScreen';
import { GroupDetailScreen } from '../screens/split/GroupDetailScreen';
import { AddGroupExpenseScreen } from '../screens/split/AddGroupExpenseScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AddCategoryScreen } from '../screens/finances/AddCategoryScreen';

import { Wallet, Users, Sliders, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Stack interno para navegación en la pestaña de Grupos
const GroupStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupsList" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </Stack.Navigator>
  );
};

// Navegación principal con Bottom Tabs
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a', // surface-900
          borderTopColor: '#334155', // slate-700
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#38bdf8', // brand-500
        tabBarInactiveTintColor: '#64748b', // slate-500
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
        name="Ajustes"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Sliders size={size} color={color} />,
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface-900 justify-center items-center">
        <ActivityIndicator size="large" color="#38bdf8" />
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
        </>
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
};
