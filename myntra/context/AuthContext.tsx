import { createContext, useContext, useEffect, useState } from "react";
import { getUserData, saveUserData, clearUserData } from "@/utils/storage";
import React from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/utils/apiBaseUrl";

type AuthContextType = {
  isAuthenticated: boolean;
  user: { _id: string; name: string; email: string } | null;
  Signup: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    _id: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserData();
        if (data._id && data.name && data.email) {
          setUser({ _id: data._id, name: data.name, email: data.email });
          setIsAuthenticated(true);
        }
      } catch (e) {
        // Prevent crash on devices where SecureStore is unavailable/misconfigured.
        setIsAuthenticated(false);
        setUser(null);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const apiBaseUrl = getApiBaseUrl();
    const res = await axios.post(
      `${apiBaseUrl}/api/users/login`,
      { email, password },
      { 
        headers: { 
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true"
        } 
      }
    );

    const data = res.data.user;
    if (data?.fullname || data?.fullName || data?._id) {
      const displayName = data.fullname || data.fullName || data.name || "";
      await saveUserData(data._id, displayName, data.email);
      setUser({ _id: data._id, name: displayName, email: data.email });
      setIsAuthenticated(true);
      return;
    }

    throw new Error(res.data?.message || "Login failed");
  };

  const Signup = async (fullName: string, email: string, password: string) => {
    const apiBaseUrl = getApiBaseUrl();
    const res = await axios.post(
      `${apiBaseUrl}/api/users/signup`,
      { fullName, email, password },
      { 
        headers: { 
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true"
        } 
      }
    );

    const data = res.data.user;
    if (data?.fullname || data?.fullName || data?._id) {
      const displayName = data.fullname || data.fullName || data.name || "";
      await saveUserData(data._id, displayName, data.email);
      setUser({ _id: data._id, name: displayName, email: data.email });
      setIsAuthenticated(true);
      return;
    }

    throw new Error(res.data?.message || "Signup failed");
  };

  const logout = async () => {
    await clearUserData();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, Signup, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;