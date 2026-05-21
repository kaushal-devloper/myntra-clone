import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const saveUserData = async (_id: string, name: string, email: string) => {
  if (isWeb) {
    try {
      localStorage.setItem("userid", _id);
      localStorage.setItem("userName", name);
      localStorage.setItem("userEmail", email);
    } catch (e) {
      console.error("Local storage set error:", e);
    }
    return;
  }

  try {
    await SecureStore.setItemAsync("userid", _id);
    await SecureStore.setItemAsync("userName", name);
    await SecureStore.setItemAsync("userEmail", email);
  } catch (e) {
    console.error("SecureStore set error:", e);
  }
};

export const getUserData = async () => {
  if (isWeb) {
    try {
      const _id = localStorage.getItem("userid");
      const name = localStorage.getItem("userName");
      const email = localStorage.getItem("userEmail");
      return { _id, name, email };
    } catch (e) {
      console.error("Local storage get error:", e);
      return { _id: null, name: null, email: null };
    }
  }

  try {
    const _id = await SecureStore.getItemAsync("userid");
    const name = await SecureStore.getItemAsync("userName");
    const email = await SecureStore.getItemAsync("userEmail");
    return { _id, name, email };
  } catch (e) {
    console.error("SecureStore get error:", e);
    return { _id: null, name: null, email: null };
  }
};

export const clearUserData = async () => {
  if (isWeb) {
    try {
      localStorage.removeItem("userid");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
    } catch (e) {
      console.error("Local storage remove error:", e);
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync("userid");
    await SecureStore.deleteItemAsync("userName");
    await SecureStore.deleteItemAsync("userEmail");
  } catch (e) {
    console.error("SecureStore remove error:", e);
  }
};

