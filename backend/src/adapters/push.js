const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends notifications through Expo's push service (free). Failures are logged and never
 * break the request that caused them.
 */
export function createExpoPush({ accessToken, log }) {
  return {
    /** Sends messages; returns the tokens Expo says no longer exist (app uninstalled). */
    async send(messages) {
      const dead = [];
      if (!messages.length) return dead;
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        try {
          const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              accept: 'application/json',
              ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(batch),
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) {
            log.warn({ status: res.status }, 'push send failed');
            continue;
          }
          const { data = [] } = await res.json();
          data.forEach((ticket, j) => {
            if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.push(batch[j].to);
          });
        } catch (err) {
          log.warn({ err: err.message }, 'push send failed');
        }
      }
      return dead;
    },
  };
}
