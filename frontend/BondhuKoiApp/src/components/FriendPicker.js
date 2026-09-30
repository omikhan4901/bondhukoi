import { useEffect, useState } from 'react';
import { Check } from 'lucide-react-native';
import { Sheet, RowGroup, ListRow, Avatar, Button, Text } from '../ui';
import { useTheme } from '../theme/ThemeProvider';

/** Pick friends from a list (circle invites). */
export function FriendPicker({ visible, onClose, title, friends, actionLabel = 'Done', busy, onDone }) {
  const { c } = useTheme();
  const [picked, setPicked] = useState(new Set());
  useEffect(() => {
    if (!visible) setPicked(new Set());
  }, [visible]);
  const toggle = (id) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle="Only your friends can be invited. They choose whether to join."
      footer={<Button title={picked.size ? `${actionLabel} ${picked.size}` : actionLabel} disabled={!picked.size} loading={busy} onPress={() => onDone([...picked])} />}
    >
      {friends.length ? (
        <RowGroup>
          {friends.map((f) => (
            <ListRow
              key={f.id}
              leading={<Avatar name={f.name} url={f.avatarUrl} size={36} />}
              title={f.name}
              onPress={() => toggle(f.id)}
              chevron={false}
              accessibilityLabel={`${f.name}, ${picked.has(f.id) ? 'selected' : 'not selected'}`}
              trailing={picked.has(f.id) ? <Check size={20} color={c.brand} /> : null}
            />
          ))}
        </RowGroup>
      ) : (
        <Text variant="secondary" tone="muted">
          All your friends are already here. Add more friends first.
        </Text>
      )}
    </Sheet>
  );
}
