import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { ApiConfig } from "../types";

const URL_KEY = "awayai.apiUrl";
const TOKEN_KEY = "awayai.apiToken";

export async function loadApiConfig(): Promise<ApiConfig> {
  const fallback: ApiConfig = {
    baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
    token: process.env.EXPO_PUBLIC_APP_TOKEN ?? "",
  };
  try {
    if (Platform.OS === "web") {
      return {
        baseUrl: globalThis.localStorage?.getItem(URL_KEY) ?? fallback.baseUrl,
        token: globalThis.localStorage?.getItem(TOKEN_KEY) ?? fallback.token,
      };
    }
    return {
      baseUrl: (await SecureStore.getItemAsync(URL_KEY)) ?? fallback.baseUrl,
      token: (await SecureStore.getItemAsync(TOKEN_KEY)) ?? fallback.token,
    };
  } catch {
    return fallback;
  }
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
  const clean = {
    baseUrl: config.baseUrl.trim().replace(/\/$/, ""),
    token: config.token.trim(),
  };
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(URL_KEY, clean.baseUrl);
    globalThis.localStorage?.setItem(TOKEN_KEY, clean.token);
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(URL_KEY, clean.baseUrl),
    SecureStore.setItemAsync(TOKEN_KEY, clean.token),
  ]);
}
