import Constants from 'expo-constants';

export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key',
  appVersion: Constants.expoConfig?.version || '1.0.0',
  easProjectId: Constants.expoConfig?.extra?.eas?.projectId,
  // The web build with EXPO_PUBLIC_DEMO=1 shows sample data, for design previews and
  // store screenshots. It never talks to a server. 'signed-out' shows the welcome screens,
  // 'empty' a brand-new account.
  demo: ['1', 'signed-out', 'empty'].includes(process.env.EXPO_PUBLIC_DEMO),
  demoSignedOut: process.env.EXPO_PUBLIC_DEMO === 'signed-out',
  // A brand-new student: no friends, circles or notifications yet.
  demoEmpty: process.env.EXPO_PUBLIC_DEMO === 'empty',
};

/** "1.2.10" > "1.2.9" */
export function versionBelow(current, minimum) {
  const a = String(current).split('.').map(Number);
  const b = String(minimum).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  }
  return false;
}
