import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { api } from './lib';

export const useAdmin = (path, opts = {}) => useQuery({ queryKey: ['admin', path], queryFn: () => api(`/api/admin${path}`), ...opts });

/** A change with a success message, an error message, and fresh data afterwards. */
export function useChange(fn, { success, onSuccess } = {}) {
  const client = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      await client.invalidateQueries({ queryKey: ['admin'] });
      if (success) message.success(typeof success === 'function' ? success(data, vars) : success);
      onSuccess?.(data, vars);
    },
    onError: (err) => message.error(err.message),
  });
}
