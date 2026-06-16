import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedInput } from '@/components/themed-input';
import { ThemedButton } from '@/components/themed-button';

// Use inline text icons to adapt dynamically.
function EyeIcon({ visible, color }: { visible: boolean; color: string }) {
  return <Text style={{ fontSize: 18, fontWeight: '800', color }}>{visible ? '👁' : '🙈'}</Text>;
}

export default function Signup() {
  const router = useRouter();
  const { Signup: signupUser, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();

  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isloading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setError] = useState({
    fullname: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const validateform = () => {
    let isvalid = true;
    const newerror = {
      fullname: '',
      email: '',
      password: '',
    };

    if (!formData.fullname.trim()) {
      newerror.fullname = 'Full name is required';
      isvalid = false;
    }

    if (!formData.email.trim()) {
      newerror.email = 'Email is required';
      isvalid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newerror.email = 'Email is invalid';
      isvalid = false;
    }

    if (!formData.password.trim()) {
      newerror.password = 'Password is required';
      isvalid = false;
    } else if (formData.password.length < 6) {
      newerror.password = 'Password must be at least 6 characters';
      isvalid = false;
    }

    setError(newerror);
    return isvalid;
  };

  const handleSignup = async () => {
    setApiError('');
    if (validateform()) {
      setIsLoading(true);
      try {
        await signupUser(formData.fullname.trim(), formData.email.trim(), formData.password);
        router.push('/(tabs)');
      } catch (err: any) {
        console.log('Signup error:', err);
        setApiError(err.message || 'Signup failed. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <Image
        source={{
          uri: 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        }}
        style={styles.backgroundImage}
      />

      <View style={[styles.formContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Join Myntra and discover amazing fashion</Text>

        <View style={styles.form}>
          <ThemedInput
            placeholder="Full Name"
            value={formData.fullname}
            onChangeText={(text) => setFormData({ ...formData, fullname: text })}
            error={errors.fullname}
          />

          <ThemedInput
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <View style={styles.inputGroup}>
            <View style={[
              styles.passwordContainer,
              {
                backgroundColor: theme.colors.inputBackground,
                borderColor: errors.password ? theme.colors.error : theme.colors.border,
                borderRadius: theme.roundness.md
              }
            ]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.colors.inputText }]}
                placeholder="Password"
                placeholderTextColor={theme.colors.inputPlaceholder}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <EyeIcon visible={showPassword} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {errors.password ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{errors.password}</Text>
            ) : null}
          </View>
        </View>

        {apiError ? <Text style={[styles.apiErrorText, { color: theme.colors.error }]}>{apiError}</Text> : null}

        <ThemedButton
          title="Sign Up"
          onPress={handleSignup}
          loading={isloading}
          style={styles.button}
        />

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')}>
          <Text style={[styles.loginText, { color: theme.colors.primary }]}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backgroundImage: {
    width: '100%',
    height: 220,
  },
  formContainer: {
    marginTop: -40,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
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
  form: {
    marginTop: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    height: '100%',
  },
  eyeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 6,
    fontWeight: '700',
    fontSize: 12,
  },
  apiErrorText: {
    marginTop: 14,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 18,
    height: 50,
  },
  loginLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  loginText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
