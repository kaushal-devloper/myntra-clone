import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const saveUserData = async (_id: string, name: string, email: string, token?: string) => {
  if (isWeb) {
    try {
      localStorage.setItem("userid", _id);
      localStorage.setItem("userName", name);
      localStorage.setItem("userEmail", email);
      if (token) localStorage.setItem("userToken", token);
    } catch (e) {
      console.error("Local storage set error:", e);
    }
    return;
  }

  try {
    await AsyncStorage.setItem("userid", _id);
    await AsyncStorage.setItem("userName", name);
    await AsyncStorage.setItem("userEmail", email);
    if (token) await AsyncStorage.setItem("userToken", token);
  } catch (e) {
    console.error("AsyncStorage set error:", e);
  }
};

export const getUserData = async () => {
  if (isWeb) {
    try {
      const _id = localStorage.getItem("userid");
      const name = localStorage.getItem("userName");
      const email = localStorage.getItem("userEmail");
      const token = localStorage.getItem("userToken");
      return { _id, name, email, token };
    } catch (e) {
      console.error("Local storage get error:", e);
      return { _id: null, name: null, email: null, token: null };
    }
  }

  try {
    const _id = await AsyncStorage.getItem("userid");
    const name = await AsyncStorage.getItem("userName");
    const email = await AsyncStorage.getItem("userEmail");
    const token = await AsyncStorage.getItem("userToken");
    return { _id, name, email, token };
  } catch (e) {
    console.error("AsyncStorage get error:", e);
    return { _id: null, name: null, email: null, token: null };
  }
};

export const clearUserData = async () => {
  if (isWeb) {
    try {
      localStorage.removeItem("userid");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userToken");
    } catch (e) {
      console.error("Local storage remove error:", e);
    }
    return;
  }

  try {
    await AsyncStorage.removeItem("userid");
    await AsyncStorage.removeItem("userName");
    await AsyncStorage.removeItem("userEmail");
    await AsyncStorage.removeItem("userToken");
  } catch (e) {
    console.error("AsyncStorage remove error:", e);
  }
};
