import { useRef } from 'react';
import { Modal, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, IconButton, EmptyState } from '../ui';
import { useTheme } from '../theme/ThemeProvider';
import { ScanLine, X } from 'lucide-react-native';

/** Full-screen QR scanner. Calls onCode once with the first code it reads. */
export function QrScanner({ visible, onClose, onCode }) {
  const { c, space } = useTheme();
  const [permission, request] = useCameraPermissions();
  const done = useRef(false);
  if (!visible) return null;
  done.current = false;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.page }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg }}>
          <Text variant="title">Scan a friend’s code</Text>
          <IconButton icon={X} label="Close" onPress={onClose} />
        </View>
        {!permission?.granted ? (
          <EmptyState icon={ScanLine} title="Camera needed" message="BondhuKoi uses the camera only to read the QR code. Nothing is saved." action="Allow camera" onAction={request} secondary="Cancel" onSecondary={onClose} />
        ) : (
          <View style={{ flex: 1, margin: space.lg, borderRadius: 24, overflow: 'hidden', backgroundColor: c.ink }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (done.current) return;
                done.current = true;
                onCode(data);
              }}
            />
          </View>
        )}
        <View style={{ padding: space.lg }}>
          <Button title="Cancel" variant="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
