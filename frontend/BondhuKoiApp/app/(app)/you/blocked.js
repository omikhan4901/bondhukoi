import { Ban } from 'lucide-react-native';
import { Screen, Header, RowGroup, ListRow, Avatar, Text, EmptyState, SkeletonList } from '../../../src/ui';
import { useBlocks, useAction, keys } from '../../../src/lib/queries';
import { api } from '../../../src/lib/api';

export default function Blocked() {
  const blocks = useBlocks();
  const unblock = useAction((id) => api(`/api/blocks/${id}`, { method: 'DELETE' }), { invalidate: [keys.blocks, keys.visibility], success: 'Unblocked. You’d need to add each other again.' });
  const list = blocks.data?.blocked || [];
  return (
    <Screen>
      <Header back title="Blocked people" subtitle="They can’t find you, add you or see you. They aren’t told." />
      {blocks.isLoading ? (
        <SkeletonList rows={2} />
      ) : list.length ? (
        <RowGroup>
          {list.map((b) => (
            <ListRow
              key={b.id}
              leading={<Avatar name={b.name} url={b.avatarUrl} size={36} />}
              title={b.name}
              trailing={
                <Text variant="secondaryStrong" tone="brand" onPress={() => unblock.mutate(b.id)} accessibilityRole="button">
                  Unblock
                </Text>
              }
            />
          ))}
        </RowGroup>
      ) : (
        <EmptyState icon={Ban} title="Nobody blocked" message="Block someone from their profile. It also ends any friendship and alerts between you." />
      )}
    </Screen>
  );
}
