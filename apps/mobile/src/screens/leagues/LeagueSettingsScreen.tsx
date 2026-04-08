import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LoadingScreen } from '../../components/ui/LoadingScreen';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import type { LeaguesStackParamList } from '../../navigation/types';
import { colors, radii } from '../../theme/tokens';

type Props = NativeStackScreenProps<LeaguesStackParamList, 'LeagueSettings'>;

export function LeagueSettingsScreen({ route, navigation }: Props) {
  const { leagueSlug } = route.params;

  const league = useQuery(api.leagues.getLeagueBySlug, { slug: leagueSlug });

  const updateLeague = useMutation(api.leagues.updateLeague);
  const leaveLeague = useMutation(api.leagues.leaveLeague);

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (league === undefined) return <LoadingScreen />;
  if (league === null) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>League not found.</Text>
      </View>
    );
  }

  const isAdmin = league.viewerRole === 'admin';
  const currentName = name ?? league.name;
  const currentDescription = description ?? (league.description ?? '');

  async function handleSave() {
    if (!league) return;
    setSaveError(null);
    setSaving(true);
    try {
      await updateLeague({
        leagueId: league._id as ConvexId<'leagues'>,
        name: currentName.trim() || undefined,
        description: currentDescription.trim() || undefined,
      });
      navigation.goBack();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function confirmLeave() {
    Alert.alert(
      'Leave league',
      `Are you sure you want to leave "${league?.name}"?`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Leave',
          onPress: () => void handleLeave(),
        },
      ],
    );
  }

  async function handleLeave() {
    if (!league) return;
    try {
      await leaveLeague({ leagueId: league._id as ConvexId<'leagues'> });
      navigation.navigate('LeagueList');
    } catch (err) {
      Alert.alert(
        'Cannot leave',
        err instanceof Error ? err.message : 'Failed to leave league',
      );
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
      >
        {/* League info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League info</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              editable={isAdmin}
              maxLength={50}
              onChangeText={(v) => { setName(v); setSaveError(null); }}
              placeholder="League name"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, !isAdmin ? styles.inputDisabled : null]}
              value={currentName}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              editable={isAdmin}
              maxLength={200}
              multiline
              numberOfLines={3}
              onChangeText={(v) => { setDescription(v); setSaveError(null); }}
              placeholder="Optional description…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.inputMultiline, !isAdmin ? styles.inputDisabled : null]}
              value={currentDescription}
            />
            <Text style={styles.charCount}>{currentDescription.length}/200</Text>
          </View>

          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

          {isAdmin ? (
            <Pressable
              disabled={saving}
              onPress={() => void handleSave()}
              style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving…' : 'Save changes'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* League details (read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invite code</Text>
            <Text style={styles.detailValue}>{league.slug}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Season</Text>
            <Text style={styles.detailValue}>{league.season}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Members</Text>
            <Text style={styles.detailValue}>{league.memberCount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Your role</Text>
            <Text style={styles.detailValue}>
              {league.viewerRole === 'admin' ? 'Admin' : 'Member'}
            </Text>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger zone</Text>
          <Pressable onPress={confirmLeave} style={styles.leaveButton}>
            <Text style={styles.leaveButtonText}>Leave league</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  charCount: {
    alignSelf: 'flex-end',
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  content: {
    gap: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  detailLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 14,
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 11,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  fieldGroup: {
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  leaveButton: {
    alignItems: 'center',
    borderColor: colors.error,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 12,
  },
  leaveButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
