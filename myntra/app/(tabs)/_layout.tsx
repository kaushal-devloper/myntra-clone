import { Tabs } from 'expo-router';
import React from 'react';
import { Home, Heart, Search, ShoppingBag, User } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.iconMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color ,size}) => <Home size={size} color={color}/>,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color ,size}) => <Search size={size} color={color}/>,
        }}
      />
        <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color ,size}) => <Heart size={size} color={color}/>,
        }}
      />
        <Tabs.Screen
        name="bag"
        options={{
          title: 'Bag',
          tabBarIcon: ({ color ,size}) => <ShoppingBag size={size} color={color}/>,
        }}
      />
        <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color ,size}) => <User size={size} color={color}/>,
        }}
      />
     
    </Tabs>
  );
}