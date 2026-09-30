import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Copy, ScanLine, Share2 } from 'lucide-react-native';
import { Screen, Header, Card, Text, Button, Input, Section, RowGroup, ListRow, Avatar, useToast } from '../../src/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useMe, useAction, keys } from '../../src/lib/queries';
import { api } from '../../src/lib/api';
import { spacedCode, parseCode } from '../../src/lib/format';
import { palettes } from '../../src/theme/tokens';
import { QrScanner } from '../../src/components/QrScanner';

const REL_LABEL = { friend: 'Friends', outgoing: 'Requested', incoming: 'Asked you' };
// QR codes stay dark-on-white in both themes so every scanner reads them.
const QR = { fg: palettes.light.ink, bg: palettes.light.surface };

export default function AddFriend() {
  const { space } = useTheme();
  const toast = useToast();
  const { data: me } = useMe();
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const myCode = me?.user.friendCode || '';

  const send = useAction((body) => api('/api/friends/requests', { method: 'POST', body }), {
    invalidate: [keys.requests, keys.friends],
    success: (res) => (res.status === 'friends' ? 'You’re friends now.' : 'Request sent.'),
    onSuccess: () => setCode(''),
  });

  // Search as you type, a little after the last keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults([]);
    const t = setTimeout(() => {
      api(`/api/users/search?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.results))
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(t);
  }, [query, send.isSuccess]);

  const typed = parseCode(code);

  return (
    <Screen>
      <Header back title="Add a friend" />
      <Card>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <Text variant="secondaryStrong" tone="muted">
            Your code
          </Text>
          {myCode ? (
            <View style={{ padding: space.md, backgroundColor: QR.bg, borderRadius: 12 }}>
              <QRCode value={`bondhukoi://add/${myCode}`} size={168} color={QR.fg} backgroundColor={QR.bg} />
            </View>
          ) : null}
          <Text variant="display" style={{ letterSpacing: 3 }} selectable>
            {spacedCode(myCode)}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' }}>
            <Button
              title="Share"
              icon={Share2}
              size="sm"
              style={{ flex: 1 }}
              onPress={() => Share.share({ message: `Add me on BondhuKoi: my code is ${myCode}. Get the app: https://bondhukoi.pages.dev` })}
            />
            <Button
              title="Copy"
              icon={Copy}
              size="sm"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={async () => {
                await Clipboard.setStringAsync(myCode);
                toast('Code copied.');
              }}
            />
          </View>
        </View>
      </Card>

      <Section title="Their code">
        <View style={{ gap: space.sm }}>
          <Input placeholder="e.g. NJ4K 7QX2" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={12} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Send request" size="sm" style={{ flex: 1 }} disabled={!typed} loading={send.isPending} onPress={() => send.mutate({ friendCode: typed })} />
            {Platform.OS !== 'web' ? <Button title="Scan QR" icon={ScanLine} size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setScanning(true)} /> : null}
          </View>
        </View>
      </Section>

      <Section title="Or find them by name">
        <Input placeholder="Name (people at your university)" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
        {results.length ? (
          <View style={{ marginTop: space.sm }}>
            <RowGroup>
              {results.map((r) => (
                <ListRow
                  key={r.id}
                  leading={<Avatar name={r.name} url={r.avatarUrl} size={36} />}
                  title={r.name}
                  subtitle={r.university}
                  trailing={
                    r.relationship === 'none' ? (
                      <Button title="Add" size="sm" full={false} onPress={() => send.mutate({ userId: r.id })} />
                    ) : (
                      <Text variant="secondaryStrong" tone="muted">
                        {REL_LABEL[r.relationship]}
                      </Text>
                    )
                  }
                />
              ))}
            </RowGroup>
          </View>
        ) : query.trim().length >= 2 ? (
          <Text variant="secondary" tone="muted" style={{ marginTop: space.sm }}>
            No one found. Ask them for their code instead.
          </Text>
        ) : null}
      </Section>

      <QrScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onCode={(text) => {
          const scanned = parseCode(text);
          setScanning(false);
          if (scanned && scanned !== myCode) send.mutate({ friendCode: scanned });
          else if (!scanned) toast('That isn’t a BondhuKoi code.', 'error');
        }}
      />
    </Screen>
  );
}
