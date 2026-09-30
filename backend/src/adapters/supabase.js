import { createClient } from '@supabase/supabase-js';

/**
 * Supabase services the API uses with the service role key: Storage for images and the
 * Auth admin API for deleting and signing out accounts. The key never leaves the server.
 */
export function createSupabaseAdapters({ supabaseUrl, supabaseServiceKey }) {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const storage = {
    async upload(bucket, path, buffer, contentType) {
      const { error } = await client.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
      if (error) throw error;
    },
    async remove(bucket, paths) {
      const list = paths.filter(Boolean);
      if (!list.length) return;
      const { error } = await client.storage.from(bucket).remove(list);
      if (error) throw error;
    },
    publicUrl(bucket, path) {
      if (!path) return null;
      return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    },
    async signedUrl(bucket, path, seconds = 3600) {
      if (!path) return null;
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, seconds);
      if (error) return null;
      return data.signedUrl;
    },
  };

  const authAdmin = {
    async deleteUser(userId) {
      const { error } = await client.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    /** Bans in Supabase Auth too, so refresh tokens stop working. 0 hours lifts the ban. */
    async setBan(userId, hours) {
      const { error } = await client.auth.admin.updateUserById(userId, {
        ban_duration: hours > 0 ? `${hours}h` : 'none',
      });
      if (error) throw error;
    },
  };

  return { storage, authAdmin };
}
