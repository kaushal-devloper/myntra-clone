import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedInput } from '@/components/themed-input';
import { ThemedButton } from '@/components/themed-button';

export default function Loginscreen() {
  const { login, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const route = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      route.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      route.replace('/(tabs)');
    } catch (err: any) {
      console.log('Login error:', err);
      setError(err.message || 'Login failed. Please check your connection or credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Welcome To Myntra</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Login to continue</Text>

        {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

        <View style={styles.form}>
          <ThemedInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <ThemedInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
          />

          <ThemedButton
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.button}
          />
        </View>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => route.push('/signup')}
          disabled={isLoading}
        >
          <Text style={[styles.signupText, { color: theme.colors.primary }]}>Create an account</Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
          (Demo) Any email/password will login.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    height: 220,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  card: {
    flex: 1,
    marginTop: -40,
    paddingHorizontal: 20,
    paddingTop: 30,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 10,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginTop: 14,
  },
  button: {
    marginTop: 8,
    height: 50,
  },
  hint: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
  signupLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  signupText: {
    fontWeight: '700',
  },
});
