import { useCallback, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Header, Button, SkeletonList, useConfirm } from '../../../../src/ui';
import { useZone, useAction, keys } from '../../../../src/lib/queries';
import { api } from '../../../../src/lib/api';
import { ZoneEditor } from '../../../../src/components/ZoneEditor';
import { useRefreshLocation } from '../../../../src/location/LocationSyncContext';

export default function EditZone() {
  const { id } = useLocalSearchParams();
  const zone = useZone(id);
  const editor = useRef(null);
  const refreshLocation = useRefreshLocation();
  const [confirm, dialog] = useConfirm();
  const [draft, setDraft] = useState({ points: [], closed: false });
  const onChange = useCallback((points, closed) => setDraft({ points, closed }), []);
  const invalidate = [keys.zone(id), keys.circle(id), keys.circles];

  const save = useAction(
    async () => {
      const snapshot = await editor.current?.snapshot();
      return api(`/api/circles/${id}/zone`, { method: 'PUT', body: { boundary: draft.points, ...(snapshot ? { snapshotBase64: snapshot } : {}) } });
    },
    {
      invalidate,
      success: 'Zone saved.',
      onSuccess: () => {
        refreshLocation({ force: true });
        router.back();
      },
    },
  );
  const remove = useAction(() => api(`/api/circles/${id}/zone`, { method: 'DELETE' }), { invalidate, success: 'Zone removed.', onSuccess: () => router.back() });

  return (
    <Screen
      footer={
        <>
          <Button title={draft.closed ? 'Save zone and cover' : 'Close the zone to save'} disabled={!draft.closed} loading={save.isPending} onPress={() => save.mutate()} />
          {zone.data?.boundary ? (
            <Button
              title="Remove the zone"
              variant="ghost"
              onPress={async () => (await confirm({ title: 'Remove the zone?', message: 'Members won’t see who’s here until you draw a new one.', confirmLabel: 'Remove', danger: true })) && remove.mutate()}
            />
          ) : null}
        </>
      }
    >
      <Header back title="Circle zone" subtitle="Tap the corners of the place you meet, then tap the first corner to close it. Keep it to one building or area." />
      {zone.isLoading ? <SkeletonList rows={2} /> : <ZoneEditor ref={editor} initial={zone.data?.boundary || []} onChange={onChange} />}
      {dialog}
    </Screen>
  );
}
