const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends notifications through Expo's push service (free). Failures are logged and never
 * break the request that caused them.
 */
export function createExpoPush({ accessToken, log }) {
  return {
    async send(messages) {
      if (!messages.length) return;
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
          if (!res.ok) log.warn({ status: res.status }, 'push send failed');
        } catch (err) {
          log.warn({ err: err.message }, 'push send failed');
        }
      }
    },
  };
}
