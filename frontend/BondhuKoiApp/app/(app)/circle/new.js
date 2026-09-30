import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Input, Button, Text, RowGroup, ListRow, Avatar, EmptyState } from '../../../src/ui';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useFriends, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';
import { ZoneEditor } from '../../../src/components/ZoneEditor';
import { useRefreshLocation } from '../../../src/location/LocationSyncContext';
import { Check, Users } from 'lucide-react-native';

const STEPS = ['About', 'People', 'Zone'];

/** Three short steps: name it, pick friends, draw the place (or skip). */
export default function NewCircle() {
  const { c, space } = useTheme();
  const friends = useFriends();
  const refreshLocation = useRefreshLocation();
  const editor = useRef(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [zone, setZone] = useState({ points: [], closed: false });
  const onZone = useCallback((points, closed) => setZone({ points, closed }), []);

  const create = useAction(
    async ({ withZone }) => {
      const snapshot = withZone ? await editor.current?.snapshot() : null;
      return api('/api/circles', {
        method: 'POST',
        body: {
          name: name.trim(),
          ...(label.trim() ? { locationLabel: label.trim() } : {}),
          inviteeIds: [...picked],
          ...(withZone ? { boundary: zone.points } : {}),
          ...(snapshot ? { snapshotBase64: snapshot } : {}),
        },
      });
    },
    {
      invalidate: [keys.circles],
      success: (r) => `Circle created. ${r.invited} invited.`,
      onSuccess: (r) => {
        refreshLocation({ force: true });
        router.replace(`/circle/${r.id}`);
      },
    },
  );

  const list = friends.data?.friends || [];
  const toggle = (id) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const footer = [
    <Button key="1" title="Next" disabled={!name.trim()} onPress={() => setStep(1)} />,
    <Button key="2" title={picked.size ? `Next · ${picked.size} invited` : 'Pick at least one friend'} disabled={!picked.size} onPress={() => setStep(2)} />,
    <>
      <Button key="3" title={zone.closed ? 'Create circle' : 'Close the zone to continue'} disabled={!zone.closed} loading={create.isPending} onPress={() => create.mutate({ withZone: true })} />
      <Button key="4" title="Skip the zone for now" variant="ghost" disabled={create.isPending} onPress={() => create.mutate({ withZone: false })} />
    </>,
  ][step];

  return (
    <Screen footer={footer}>
      <Header back title="New circle" subtitle={`Step ${step + 1} of 3 · ${STEPS[step]}`} />
      {step === 0 ? (
        <View style={{ gap: space.lg }}>
          <Input label="Name" placeholder="e.g. Thesis group" value={name} onChangeText={setName} maxLength={60} autoFocus />
          <Input label="Place (optional)" placeholder="e.g. SAC building, 4th floor" value={label} onChangeText={setLabel} maxLength={80} />
          <Text variant="secondary" tone="muted">
            Members will see who’s in the circle’s place right now. Nobody sees anything until they join.
          </Text>
        </View>
      ) : null}

      {step === 1 ? (
        list.length ? (
          <RowGroup>
            {list.map((f) => (
              <ListRow
                key={f.id}
                leading={<Avatar name={f.name} url={f.avatarUrl} size={36} />}
                title={f.name}
                onPress={() => toggle(f.id)}
                chevron={false}
                trailing={picked.has(f.id) ? <Check size={20} color={c.brand} /> : null}
              />
            ))}
          </RowGroup>
        ) : (
          <EmptyState icon={Users} title="Add friends first" message="You can only invite friends to a circle." action="Add a friend" onAction={() => router.push('/add-friend')} />
        )
      ) : null}

      {step === 2 ? <ZoneEditor ref={editor} onChange={onZone} /> : null}
    </Screen>
  );
}
