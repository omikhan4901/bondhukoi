import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useToast } from '../ui';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (count, err) => err?.code === 'offline' && count < 2 },
    mutations: { retry: false },
  },
});

export const keys = {
  config: ['config'],
  me: ['me'],
  myPresence: ['me', 'presence'],
  visibility: ['me', 'visibility'],
  friends: ['friends'],
  requests: ['friends', 'requests'],
  watches: ['watches'],
  circles: ['circles'],
  invitations: ['circles', 'invitations'],
  circle: (id) => ['circles', id],
  activity: (id) => ['circles', id, 'activity'],
  zone: (id) => ['circles', id, 'zone'],
  notifications: ['notifications'],
  blocks: ['blocks'],
  user: (id) => ['users', id],
};

const useApiQuery = (key, path, opts = {}) => useQuery({ queryKey: key, queryFn: () => api(path), ...opts });

export const useConfig = () => useApiQuery(keys.config, '/api/config', { staleTime: 5 * 60_000 });
export const useMe = (opts) => useApiQuery(keys.me, '/api/me', opts);
export const useMyPresence = () => useApiQuery(keys.myPresence, '/api/me/presence', { refetchInterval: 60_000 });
export const useVisibility = () => useApiQuery(keys.visibility, '/api/me/visibility');
export const useFriends = () => useApiQuery(keys.friends, '/api/friends', { refetchInterval: 60_000 });
export const useRequests = () => useApiQuery(keys.requests, '/api/friends/requests');
export const useWatches = () => useApiQuery(keys.watches, '/api/watches');
export const useCircles = () => useApiQuery(keys.circles, '/api/circles', { refetchInterval: 60_000 });
export const useInvitations = () => useApiQuery(keys.invitations, '/api/circles/invitations');
export const useCircle = (id) => useApiQuery(keys.circle(id), `/api/circles/${id}`, { enabled: Boolean(id), refetchInterval: 60_000 });
export const useCircleActivity = (id) => useApiQuery(keys.activity(id), `/api/circles/${id}/activity`, { enabled: Boolean(id) });
export const useZone = (id) => useApiQuery(keys.zone(id), `/api/circles/${id}/zone`, { enabled: Boolean(id) });
export const useNotifications = () => useApiQuery(keys.notifications, '/api/notifications', { refetchInterval: 60_000 });
export const useBlocks = () => useApiQuery(keys.blocks, '/api/blocks');
export const useUser = (id) => useApiQuery(keys.user(id), `/api/users/${id}`, { enabled: Boolean(id) });

/**
 * A change: runs `fn`, refreshes the listed queries, shows `success` as a toast, and shows
 * the server's message if it fails. Returns react-query's mutation.
 */
export function useAction(fn, { invalidate = [], success, onSuccess } = {}) {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      await Promise.all(invalidate.map((key) => client.invalidateQueries({ queryKey: key })));
      if (success) toast(typeof success === 'function' ? success(data, vars) : success);
      onSuccess?.(data, vars);
    },
    onError: (err) => toast(err.message, 'error'),
  });
}
