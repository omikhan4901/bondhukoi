import { useState } from 'react';
import { Sheet, RowGroup, ListRow, Input, Button, Text } from '../ui';
import { useAction } from '../lib/queries';
import { api } from '../lib/api';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

const REASONS = [
  ['harassment', 'Harassing or bullying'],
  ['stalking', 'Following or watching me'],
  ['fake_account', 'Fake account'],
  ['inappropriate', 'Inappropriate name or photo'],
  ['spam', 'Spam'],
  ['other', 'Something else'],
];

/** Report a person or a circle. The BondhuKoi team reads every report. */
export function ReportSheet({ visible, onClose, target }) {
  const { c } = useTheme();
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const send = useAction(
    () => api('/api/reports', { method: 'POST', body: { ...(target.userId ? { userId: target.userId } : { circleId: target.circleId }), reason, details } }),
    {
      success: 'Thanks. We’ll look at it.',
      onSuccess: () => {
        setReason(null);
        setDetails('');
        onClose();
      },
    },
  );
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Report ${target.name}`}
      subtitle="Only the BondhuKoi team sees this. They aren’t told who reported them."
      footer={<Button title="Send report" disabled={!reason} loading={send.isPending} onPress={() => send.mutate()} />}
    >
      <RowGroup>
        {REASONS.map(([key, label]) => (
          <ListRow key={key} title={label} onPress={() => setReason(key)} chevron={false} trailing={reason === key ? <Check size={20} color={c.brand} /> : null} />
        ))}
      </RowGroup>
      <Input label="Anything else? (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
      <Text variant="caption" tone="muted">
        If you feel unsafe, block them too. In an emergency call 999.
      </Text>
    </Sheet>
  );
}
