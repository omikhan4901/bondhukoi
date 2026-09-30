import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the sign-in session lives: the Android Keystore / iOS Keychain through
 * expo-secure-store. Values over ~2 KB are split into chunks, because SecureStore limits
 * the size of one entry and a Supabase session can be larger. On the web build (used for
 * design previews) it falls back to localStorage.
 */
const CHUNK = 1800;
const safeKey = (key) => key.replace(/[^A-Za-z0-9._-]/g, '_');

const native = {
  async getItem(key) {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`);
    if (count == null) return SecureStore.getItemAsync(k);
    let value = '';
    for (let i = 0; i < Number(count); i++) value += (await SecureStore.getItemAsync(`${k}.${i}`)) ?? '';
    return value;
  },
  async setItem(key, value) {
    const k = safeKey(key);
    await this.removeItem(key);
    if (value.length <= CHUNK) return SecureStore.setItemAsync(k, value);
    const parts = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < parts; i++) await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${k}.n`, String(parts));
  },
  async removeItem(key) {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}.n`);
    if (count != null) {
      for (let i = 0; i < Number(count); i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
      await SecureStore.deleteItemAsync(`${k}.n`);
    }
    await SecureStore.deleteItemAsync(k);
  },
};

const web = {
  getItem: async (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: async (key, value) => typeof localStorage !== 'undefined' && localStorage.setItem(key, value),
  removeItem: async (key) => typeof localStorage !== 'undefined' && localStorage.removeItem(key),
};

export const secureStorage = Platform.OS === 'web' ? web : native;
