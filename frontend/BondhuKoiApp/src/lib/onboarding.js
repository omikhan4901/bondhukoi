import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bondhukoi.needsOnboarding';

/** Set just before a new account's first sign-in; cleared when onboarding finishes. */
export const markNeedsOnboarding = () => AsyncStorage.setItem(KEY, '1');
export const finishOnboarding = () => AsyncStorage.removeItem(KEY);
export const needsOnboarding = async () => (await AsyncStorage.getItem(KEY)) === '1';
