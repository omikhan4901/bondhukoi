import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Bell, UserPlus, EyeOff, BatteryMedium, Check } from 'lucide-react-native';
import { Screen, Text, Button, IconTile, Card } from '../../src/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { askForeground, askBackground, permissionStatus } from '../../src/location/location';
import { askPush, registerPushToken } from '../../src/push/push';
import { finishOnboarding } from '../../src/lib/onboarding';
import { useMe } from '../../src/lib/queries';
import { useRefreshLocation } from '../../src/location/LocationSyncContext';

function Point({ icon, text }) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
      <IconTile icon={icon} size={36} tone="muted" />
      <Text variant="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

function Step({ icon, title, body, children }) {
  const { space } = useTheme();
  return (
    <View style={{ paddingTop: space.xxl, gap: space.xl }}>
      <IconTile icon={icon} size={64} />
      <View style={{ gap: space.sm }}>
        <Text variant="display">{title}</Text>
        <Text variant="body" tone="muted">
          {body}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** Three steps after sign-up: location, notifications, first friend. Each can be skipped. */
export default function Onboarding() {
  const { space } = useTheme();
  const params = useLocalSearchParams();
  const { data: me } = useMe();
  const refreshLocation = useRefreshLocation();
  const [step, setStep] = useState('location');
  const [locationStage, setLocationStage] = useState('explain');
  const [busy, setBusy] = useState(false);
  const single = params.step === 'location';

  async function finish() {
    await finishOnboarding();
    router.replace('/(app)/(tabs)');
  }
  const next = (s) => (single ? finish() : setStep(s));

  if (step === 'location') {
    return (
      <Screen
        footer={
          locationStage === 'explain' ? (
            <>
              <Button
                title="Continue"
                loading={busy}
                onPress={async () => {
                  setBusy(true);
                  const ok = await askForeground();
                  setBusy(false);
                  if (ok) setLocationStage('always');
                  else {
                    const st = await permissionStatus();
                    if (!st.canAskAgain) Linking.openSettings();
                  }
                }}
              />
              <Button title="Not now" variant="ghost" onPress={() => next('notifications')} />
            </>
          ) : (
            <>
              <Button
                title="Choose “Allow all the time”"
                loading={busy}
                onPress={async () => {
                  setBusy(true);
                  await askBackground();
                  setBusy(false);
                  refreshLocation({ force: true });
                  next('notifications');
                }}
              />
              <Button
                title="Keep “While using the app”"
                variant="ghost"
                onPress={() => {
                  refreshLocation({ force: true });
                  next('notifications');
                }}
              />
            </>
          )
        }
      >
        {locationStage === 'explain' ? (
          <Step icon={MapPin} title="Show friends when you’re on campus" body="BondhuKoi uses your location to answer one question: are you inside your campus, or a circle’s place?">
            <Card>
              <View style={{ gap: space.md }}>
                <Point icon={EyeOff} text="Your location is never stored or shown. Friends only see “On campus” or “Away”." />
                <Point icon={Check} text="Only friends and circles you accept see anything. Pause any time." />
                <Point icon={BatteryMedium} text="The phone only checks when you cross a zone’s edge, so it barely uses battery." />
              </View>
            </Card>
          </Step>
        ) : (
          <Step
            icon={MapPin}
            title="Update even when the app is closed"
            body="Choose “Allow all the time” on the next screen, so your status changes when you arrive, without opening BondhuKoi. BondhuKoi collects location in the background only to detect when you enter or leave your zones."
          />
        )}
      </Screen>
    );
  }

  if (step === 'notifications') {
    return (
      <Screen
        footer={
          <>
            <Button
              title="Turn on notifications"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                if (await askPush()) await registerPushToken().catch(() => {});
                setBusy(false);
                setStep('friend');
              }}
            />
            <Button title="Not now" variant="ghost" onPress={() => setStep('friend')} />
          </>
        }
      >
        <Step icon={Bell} title="Know when friends add you" body="We’ll tell you about friend requests, circle invitations and, if you ask for them, when a friend arrives. Nothing else." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            title="Share my code"
            onPress={() => Share.share({ message: `Add me on BondhuKoi: my code is ${me?.user.friendCode}. Get the app: https://bondhukoi.pages.dev` })}
          />
          <Button title="Add a friend’s code" variant="secondary" onPress={async () => { await finishOnboarding(); router.replace('/add-friend'); }} />
          <Button title="Done" variant="ghost" onPress={finish} />
        </>
      }
    >
      <Step icon={UserPlus} title="Add your friends" body={`Your code is ${me?.user.friendCode ?? '…'}. Send it to friends, or scan theirs. They say yes before anyone sees anything.`} />
    </Screen>
  );
}
