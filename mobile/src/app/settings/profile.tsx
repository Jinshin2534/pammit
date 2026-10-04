import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { SettingsFrame } from '@/components/settings/settings-frame';
import { AppText, Button, TextField } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { useAppState } from '@/providers/app-state';

const avatars = [
  { id: 'default', label: 'すだちキャラクター', source: require('../../../assets/images/mascot-sudachi.png'), wide: true },
  { id: 'hat', label: '麦わら帽子', source: require('../../../assets/images/profile-avatar-hat.png') },
  { id: 'scarf', label: 'ピンクの頭巾', source: require('../../../assets/images/profile-avatar-scarf.png') },
  { id: 'glasses', label: '眼鏡と緑の帽子', source: require('../../../assets/images/profile-avatar-glasses.png') },
] as const;

export default function ProfileScreen() {
  const { session, updateCurrentProfile } = useAppState();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const name = nameDraft ?? session.userName;
  const avatarId = avatarDraft ?? session.avatarId ?? 'default';
  const avatarIndex = Math.max(0, avatars.findIndex((item) => item.id === avatarId));
  const avatar = avatars[avatarIndex];

  return (
    <SettingsFrame
      onSave={() => { updateCurrentProfile({ name, avatarId: avatar.id }); setSaved(true); }}
      saveDisabled={!name.trim()}
      saved={saved}
      testID="profile-screen">
      <AppText variant="title" style={styles.title}>プロフィール</AppText>
      <TextField label="名前" value={name} onChangeText={(value) => { setNameDraft(value); setSaved(false); }} testID="profile-name" />
      <View style={styles.iconField}>
        <AppText variant="bodyLg" style={styles.iconLabel}>アイコン</AppText>
        <View style={styles.iconFrame}>
          <View style={styles.iconInset} />
          <Image source={avatar.source} style={'wide' in avatar && avatar.wide ? styles.mascot : styles.selectedAvatar} contentFit="contain" accessible={false} />
        </View>
        <Button label="変更する" variant="primary" size="md" onPress={() => setPickerOpen(true)} testID="profile-change-icon" />
      </View>

      <Modal animationType="fade" transparent visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="アイコン選択を閉じる" onPress={() => setPickerOpen(false)} style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.pickerCard}>
            <AppText variant="bodyLgBold" style={styles.pickerTitle}>アイコンを選ぶ</AppText>
            <View style={styles.avatarGrid}>
              {avatars.map((item, index) => (
                <Pressable
                  key={item.id}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: index === avatarIndex }}
                  onPress={() => {
                    setAvatarDraft(item.id);
                    setSaved(false);
                    setPickerOpen(false);
                  }}
                  style={[styles.avatarOption, index === avatarIndex && styles.avatarOptionSelected]}>
                  <Image source={item.source} style={styles.avatarThumb} contentFit="contain" accessible={false} />
                </Pressable>
              ))}
            </View>
            <Button label="閉じる" variant="secondary" size="md" onPress={() => setPickerOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    </SettingsFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    lineHeight: 51,
    textAlign: 'center',
  },
  iconField: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
  },
  iconLabel: {
    alignSelf: 'stretch',
    lineHeight: 25,
  },
  iconFrame: {
    backgroundColor: colors.primary,
    height: 162,
    position: 'relative',
    width: 229,
  },
  iconInset: {
    backgroundColor: colors.surfaceMuted,
    height: 146,
    left: 9,
    position: 'absolute',
    top: 8,
    width: 211,
  },
  mascot: {
    height: 125,
    left: 19,
    position: 'absolute',
    top: 18,
    width: 185,
  },
  selectedAvatar: {
    height: 132,
    left: 48,
    position: 'absolute',
    top: 15,
    width: 132,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  pickerCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 20,
    padding: 20,
    width: '100%',
  },
  pickerTitle: {
    textAlign: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 4,
    height: 116,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 116,
  },
  avatarOptionSelected: {
    borderColor: colors.primary,
  },
  avatarThumb: {
    height: 104,
    width: 104,
  },
});
