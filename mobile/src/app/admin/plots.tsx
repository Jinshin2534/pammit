import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminFlowFooter, AdminHeader, AdminPage, AdminTextField, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { Dialog } from '@/components/feedback';
import { useAppState } from '@/providers/app-state';
import { colors, radii, strokes } from '@/theme/tokens';

export default function PlotsScreen() {
  const { addFarm, updateFarm, deleteFarm, farms } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('豊作農園');
  const [location, setLocation] = useState('神山町');

  return (
    <AdminPage scrollable header={<AdminHeader title={editingId ? '農園編集' : '農園登録'} />} footer={<AdminFlowFooter nextLabel={editingId ? '保存する' : '登録する'} onBack={() => router.back()} onNext={() => { if (editingId) updateFarm(editingId, { name, location }); else addFarm({ name, location }); router.replace('/admin'); }} />} testID="plot-register-screen">
      <AdminTextField label="農園の名前" value={name} onChangeText={setName} />
      <AdminTextField label="所在地（市区町村）" value={location} onChangeText={setLocation} />
      <View style={styles.list}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>登録済み農園</Text>
        {farms.map((farm) => (
          <View key={farm.id} style={styles.row}>
            <View style={styles.copy}><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={adminTextStyles.body}>{farm.name}</Text><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={adminTextStyles.caption}>{farm.location || '所在地未登録'}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => { setEditingId(farm.id); setName(farm.name); setLocation(farm.location ?? ''); }} style={styles.editButton}><Text style={styles.buttonText}>編集</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPendingDelete({ id: farm.id, name: farm.name })} style={[styles.editButton, styles.deleteButton]}><Text style={styles.buttonText}>削除</Text></Pressable>
          </View>
        ))}
      </View>
      <Dialog
        visible={Boolean(pendingDelete)}
        title="本当に削除しますか？"
        body={pendingDelete ? `${pendingDelete.name}を削除します` : undefined}
        confirmLabel="削除する"
        cancelLabel="戻る"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteFarm(pendingDelete.id);
          if (editingId === pendingDelete.id) setEditingId(null);
          setPendingDelete(null);
        }}
        testID="farm-delete-dialog"
      />
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  row: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', gap: 6, minHeight: 60, paddingHorizontal: 10 },
  copy: { flex: 1, gap: 3 },
  editButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, justifyContent: 'center', minHeight: 36, paddingHorizontal: 10 },
  deleteButton: { backgroundColor: colors.cta },
  buttonText: { ...adminTextStyles.body, color: colors.textInverse },
});
