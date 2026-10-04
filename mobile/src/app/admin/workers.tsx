import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminDropdown, AdminFlowFooter, AdminHeader, AdminPage, AdminTextField, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { Dialog } from '@/components/feedback';
import { useAppState } from '@/providers/app-state';
import { colors, radii, strokes } from '@/theme/tokens';

export default function WorkersScreen() {
  const { addUser, updateUser, deleteUser, users } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('田中みのる');
  const [gender, setGender] = useState('女');
  const [workerType, setWorkerType] = useState('アルバイト');
  const [weeklyHours, setWeeklyHours] = useState('-');

  return (
    <AdminPage scrollable header={<AdminHeader title={editingId ? '作業者編集' : '作業者登録'} />} footer={<AdminFlowFooter nextLabel={editingId ? '保存する' : '確認する'} onBack={() => router.back()} onNext={() => {
      if (editingId) {
        updateUser(editingId, { name, gender, workerType, weeklyHours });
        router.replace('/admin');
      } else {
        addUser({ name, role: 'worker', gender, workerType, weeklyHours });
        router.push({ pathname: '/admin/workers/complete', params: { name } });
      }
    }} />} testID="worker-register-screen">
      <AdminTextField label="名前" value={name} onChangeText={setName} />
      <AdminDropdown label="性別" value={gender} options={[{ label: '女', value: '女' }, { label: '男', value: '男' }, { label: '回答しない', value: '回答しない' }]} onChange={setGender} />
      <AdminDropdown label="作業者種別" value={workerType} options={[{ label: '後継者さん', value: '後継者さん' }, { label: 'アルバイト', value: 'アルバイト' }]} onChange={setWorkerType} />
      <AdminTextField label="週間最大稼働時間" value={weeklyHours} onChangeText={setWeeklyHours} />
      <View style={styles.list}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>登録済み作業者</Text>
        {users.filter((user) => user.role === 'worker').map((user) => (
          <View key={user.id} style={styles.row}>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[adminTextStyles.body, styles.name]}>{user.name}</Text>
            <Pressable accessibilityRole="button" onPress={() => { setEditingId(user.id); setName(user.name); setGender(user.gender ?? '回答しない'); setWorkerType(user.workerType ?? '後継者さん'); setWeeklyHours(user.weeklyHours ?? '-'); }} style={styles.editButton}><Text style={styles.buttonText}>編集</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setPendingDelete({ id: user.id, name: user.name })} style={[styles.editButton, styles.deleteButton]}><Text style={styles.buttonText}>削除</Text></Pressable>
          </View>
        ))}
      </View>
      <Dialog
        visible={Boolean(pendingDelete)}
        title="本当に削除しますか？"
        body={pendingDelete ? `${pendingDelete.name}さんを削除します` : undefined}
        confirmLabel="削除する"
        cancelLabel="戻る"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteUser(pendingDelete.id);
          if (editingId === pendingDelete.id) setEditingId(null);
          setPendingDelete(null);
        }}
        testID="worker-delete-dialog"
      />
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  row: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', gap: 6, minHeight: 54, paddingHorizontal: 10 },
  name: { flex: 1 },
  editButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.full, justifyContent: 'center', minHeight: 36, paddingHorizontal: 12 },
  deleteButton: { backgroundColor: colors.cta },
  buttonText: { ...adminTextStyles.body, color: colors.textInverse },
});
