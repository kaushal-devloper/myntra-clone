import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider as NavigationProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import NotificationHandler from '@/components/NotificationHandler';

import { AlertProvider } from '@/context/AlertContext';
import { ThemedAlert } from '@/components/themed-alert';

// Prevent splash screen from auto-hiding during initial mount/hydration
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: '(Auth)',
};

function RootLayoutContent() {
  const { isDark, theme, isLoading } = useAppTheme();

  // Hide splash screen once theme is loaded from storage
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Keep showing native splash screen while theme configuration is hydra-ting
  if (isLoading) {
    return null;
  }

  // Create custom React Navigation theme dynamically matched to our active design system
  const baseTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.notification,
    },
  };

  return (
    <NavigationProvider value={navigationTheme}>
      <AuthProvider>
        <NotificationProvider>
          <WishlistProvider>
            <NotificationHandler />
            <ThemedAlert />
            <Stack
              screenOptions={{
                headerShown: false,
                headerStyle: {
                  backgroundColor: theme.colors.card,
                },
                headerTintColor: theme.colors.text,
                headerTitleStyle: {
                  color: theme.colors.text,
                  fontWeight: 'bold',
                },
              }}
            >
              {/* Auth Screens */}
              <Stack.Screen name="(Auth)" />

              {/* Main App Tabs */}
              <Stack.Screen name="(tabs)" />

              {/* Modal Screen */}
              <Stack.Screen
                name="modal"
                options={{
                  presentation: 'modal',
                  title: 'Modal',
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: theme.colors.card,
                  },
                  headerTintColor: theme.colors.text,
                }}
              />
            </Stack>

            <StatusBar
              style={isDark ? 'light' : 'dark'}
              backgroundColor={theme.colors.card}
              translucent={true}
            />
          </WishlistProvider>
        </NotificationProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AlertProvider>
        <RootLayoutContent />
      </AlertProvider>
    </AppThemeProvider>
  );
}
