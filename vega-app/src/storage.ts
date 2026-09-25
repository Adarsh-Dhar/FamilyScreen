import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCOUNT_KEY = "family-screen-account";

export async function readSavedAccountId(fallback = ""): Promise<string> {
  try {
    const value = await AsyncStorage.getItem(ACCOUNT_KEY);
    return value || fallback;
  } catch {
    return fallback;
  }
}

export async function saveAccountId(value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACCOUNT_KEY, value);
  } catch {
    // Storage is a convenience here, not a hard dependency.
  }
}

export async function clearAccountId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Storage is a convenience here, not a hard dependency.
  }
}
