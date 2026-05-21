import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: '(Auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <WishlistProvider>
            <Stack screenOptions={{ headerShown: false }}>
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
                }}
              />
            </Stack>

            <StatusBar style="auto" />
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
  );
}


