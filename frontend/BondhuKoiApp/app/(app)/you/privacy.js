import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Header, RowGroup, SwitchRow, ListRow, Section, Text, Sheet, SkeletonList } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useMe, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { hourLabel } from '../../../src/lib/format';
import { useRefreshLocation } from '../../../src/location/LocationSyncContext';
import { Check } from 'lucide-react-native';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default function Privacy() {
  const { c, space } = useTheme();
  const me = useMe();
  const refreshLocation = useRefreshLocation();
  const [picking, setPicking] = useState(null);
  const save = useAction((body) => api('/api/me/privacy', { method: 'PATCH', body }), {
    invalidate: [keys.me, keys.myPresence, keys.visibility],
    onSuccess: () => refreshLocation({ force: true }),
  });

  if (!me.data) {
    return (
      <Screen>
        <Header back title="Sharing and quiet hours" />
        <SkeletonList rows={3} />
      </Screen>
    );
  }
  const p = { ...me.data.privacy, ...(save.isPending ? save.variables : {}) };

  return (
    <Screen>
      <Header back title="Sharing and quiet hours" />
      <RowGroup>
        <SwitchRow title="Share my status" subtitle="Off: nobody sees anything, not even “away”." value={p.sharingEnabled} onValueChange={(v) => save.mutate({ sharingEnabled: v })} />
        <SwitchRow title="Show when I’m on campus" subtitle="Friends see “On campus”. Off: only circles you’re in." value={p.shareCampus} onValueChange={(v) => save.mutate({ shareCampus: v })} disabled={!p.sharingEnabled} />
      </RowGroup>

      <Section title="Quiet hours">
        <RowGroup>
          <SwitchRow title="Quiet hours" subtitle="Nothing is shared during these hours. Friends just see “Not sharing”." value={p.quietHoursEnabled} onValueChange={(v) => save.mutate({ quietHoursEnabled: v })} />
          {p.quietHoursEnabled ? <ListRow title="From" value={hourLabel(p.quietStart)} onPress={() => setPicking('quietStart')} /> : null}
          {p.quietHoursEnabled ? <ListRow title="Until" value={hourLabel(p.quietEnd)} onPress={() => setPicking('quietEnd')} /> : null}
        </RowGroup>
        <Text variant="caption" tone="muted" style={{ marginTop: space.sm }}>
          Times are Bangladesh time.
        </Text>
      </Section>

      <Section title="History">
        <RowGroup>
          <SwitchRow
            title="Forget arrivals after 24 hours"
            subtitle="Off: kept for 30 days, for the people you let watch you. Either way, your location itself is never kept."
            value={p.shortHistory}
            onValueChange={(v) => save.mutate({ shortHistory: v })}
          />
        </RowGroup>
      </Section>

      <Sheet visible={Boolean(picking)} onClose={() => setPicking(null)} title={picking === 'quietStart' ? 'Quiet from' : 'Quiet until'}>
        <View>
          <RowGroup>
            {HOURS.map((h) => (
              <ListRow
                key={h}
                title={hourLabel(h)}
                chevron={false}
                onPress={() => {
                  save.mutate({ [picking]: h });
                  setPicking(null);
                }}
                trailing={p[picking] === h ? <Check size={20} color={c.brand} /> : null}
              />
            ))}
          </RowGroup>
        </View>
      </Sheet>
    </Screen>
  );
}
