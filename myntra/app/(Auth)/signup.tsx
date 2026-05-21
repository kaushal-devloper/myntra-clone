import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';

// Use inline text icons to avoid relying on extra icon packages.
function EyeIcon({ visible }: { visible: boolean }) {
  return <Text style={{ fontSize: 18, fontWeight: '800', color: '#666' }}>{visible ? '👁' : '🙈'}</Text>;
}

export default function Signup() {
  const router = useRouter();
  const { Signup: signupUser } = useAuth();

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
        if (err.response && err.response.data && err.response.data.message) {
          setApiError(err.response.data.message);
        } else {
          setApiError('Signup failed. Please check your connection.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Image
        source={{
          uri: 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        }}
        style={styles.backgroundImage}
      />

      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Myntra and discover amazing fashion</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, errors.fullname ? styles.inputError : null]}
            placeholder="Full Name"
            value={formData.fullname}
            onChangeText={(text) => setFormData({ ...formData, fullname: text })}
          />
          {errors.fullname ? <Text style={styles.errorText}>{errors.fullname}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <EyeIcon visible={showPassword} />
            </TouchableOpacity>
          </View>

          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}
        </View>

        {apiError ? <Text style={styles.apiErrorText}>{apiError}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          {isloading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')}>
          <Text style={styles.loginText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  inputGroup: {
    marginTop: 14,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  inputError: {
    borderColor: '#ff3f6c',
  },
  errorText: {
    marginTop: 6,
    color: '#ff3f6c',
    fontWeight: '700',
    fontSize: 12,
  },
  apiErrorText: {
    marginTop: 14,
    color: '#ff3f6c',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    paddingVertical: 0,
  },
  eyeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#ff3f6c',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  loginLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  loginText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 12,
  },
});

