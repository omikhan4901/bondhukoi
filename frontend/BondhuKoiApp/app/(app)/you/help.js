import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Screen, Header, Section, Card, Text, Input, Button, RowGroup, ListRow } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useAction } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { config } from '../../../src/lib/config';

const FAQ = [
  ['Can anyone see where I am?', 'No. Your phone sends a reading when you cross the edge of a zone; the server works out “on campus” or “in this circle”, keeps only that answer and throws the reading away.'],
  ['Why does BondhuKoi want location “all the time”?', 'So your status updates when you arrive or leave without opening the app. The phone only wakes BondhuKoi at zone edges, so it uses very little battery.'],
  ['My status doesn’t update on my phone', 'Some phones (Xiaomi, Oppo, Realme, Vivo) stop apps in the background. In Settings, set BondhuKoi’s battery use to “No restrictions” and allow autostart.'],
  ['Who can see me?', 'Only friends you accepted, members of circles you joined, and people you allowed to get alerts. You → Who can see me lists all of them.'],
];

export default function Help() {
  const { space } = useTheme();
  const [message, setMessage] = useState('');
  const send = useAction(() => api('/api/feedback', { method: 'POST', body: { message, appVersion: config.appVersion, platform: Platform.OS, screen: 'Help' } }), {
    success: 'Thanks! We read every message.',
    onSuccess: () => setMessage(''),
  });
  return (
    <Screen>
      <Header back title="Help and feedback" />
      <View style={{ gap: space.md }}>
        {FAQ.map(([q, a]) => (
          <Card key={q}>
            <Text variant="bodyStrong">{q}</Text>
            <Text variant="secondary" tone="muted" style={{ marginTop: 4 }}>
              {a}
            </Text>
          </Card>
        ))}
      </View>
      <Section title="Tell us something">
        <View style={{ gap: space.sm }}>
          <Input value={message} onChangeText={setMessage} placeholder="What’s confusing, broken or missing?" multiline maxLength={2000} />
          <Button title="Send" disabled={!message.trim()} loading={send.isPending} onPress={() => send.mutate()} />
        </View>
      </Section>
      <Section title="More">
        <RowGroup>
          <ListRow title="Battery settings for your phone" subtitle="dontkillmyapp.com" onPress={() => Linking.openURL('https://dontkillmyapp.com')} />
          <ListRow title="Report a security problem" subtitle="How to tell us privately" onPress={() => Linking.openURL('https://github.com/omikhan4901/bondhukoi/security/policy')} />
        </RowGroup>
      </Section>
    </Screen>
  );
}
