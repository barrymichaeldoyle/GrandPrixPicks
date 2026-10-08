import { Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import { EmptyState } from '../../components/ui/EmptyState';
import { ModalToast } from '../../providers/ToastProvider';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

/* Empty states and the modal that hosts a pick editor. */

export function NoUpcomingRaceState() {
  return (
    <View className="flex-1 bg-page py-12">
      <EmptyState
        body="There's no race open for predictions right now. Check back when the next round's picks unlock."
        icon="flag-outline"
        title="No race to predict"
      />
    </View>
  );
}

export function NotAvailableState() {
  return (
    <View className="flex-1 bg-page py-12">
      <EmptyState
        body="Picks can’t load without a connection. Reconnect to make your picks."
        icon="cloud-offline-outline"
        title="Predictions unavailable"
      />
    </View>
  );
}

export function PickEditorModal({
  title,
  subtitle,
  onClose,
  children,
  scrollEnabled = true,
  fillBody = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  scrollEnabled?: boolean;
  /** Stretch the body to the screen, for a single battle that owns it. */
  fillBody?: boolean;
}) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* RN Modal sits above the app's SafeAreaProvider, so insets are 0
          unless this tree provides its own. Without that, the title and Close
          draw under the status bar. */}
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView
            edges={['top', 'bottom']}
            style={{ flex: 1, backgroundColor: colors.page }}
          >
            <View className="flex-row items-center justify-between px-4 py-2">
              <View className="flex-1">
                <Text className="text-foreground text-xl font-semibold">
                  {title}
                </Text>
                {subtitle ? (
                  <Text className="text-muted text-xs">{subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                className="min-h-11 justify-center px-3"
              >
                <Text className="text-accent">Close</Text>
              </Pressable>
            </View>
            <ScrollView
              scrollEnabled={scrollEnabled}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 40,
                flexGrow: fillBody ? 1 : undefined,
              }}
            >
              {children}
            </ScrollView>
            <ModalToast />
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}
