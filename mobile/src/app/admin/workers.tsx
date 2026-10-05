import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage, useCreateUser, useUpdateUser, useUsers, type UserOut, type UserUpdate } from '@/api';
import { AdminDropdown, AdminErrorBanner, AdminFlowFooter, AdminHeader, AdminPage, AdminTextField, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { Dialog } from '@/components/feedback';
import { colors, radii, strokes } from '@/theme/tokens';

type Gender = NonNullable<UserUpdate['gender']>;
type WorkerType = NonNullable<UserUpdate['worker_type']>;

const genderOptions = [{ label: '女', value: '女' }, { label: '男', value: '男' }, { label: '回答しない', value: '回答しない' }] as const;
const workerTypeOptions = [{ label: '後継者さん', value: '後継者さん' }, { label: 'アルバイト', value: 'アルバイト' }] as const;

type Form = { name: string; gender: Gender | null; workerType: WorkerType | null; weeklyHours: string };

const newForm: Form = { name: '', gender: '女', workerType: 'アルバイト', weeklyHours: '' };

const asGender = (value: string | null | undefined): Gender | null => (genderOptions.some((option) => option.value === value) ? (value as Gender) : null);
const asWorkerType = (value: string | null | undefined): WorkerType | null => (workerTypeOptions.some((option) => option.value === value) ? (value as WorkerType) : null);

function formFromUser(user: UserOut): Form {
  return {
    name: user.name,
    gender: asGender(user.gender),
    workerType: asWorkerType(user.worker_type),
    weeklyHours: user.weekly_max_hours == null ? '' : String(user.weekly_max_hours),
  };
}

/** 週の最大稼働時間。空と「-」は null（決めていない）。数でなければ undefined */
function parseWeeklyHours(value: string): number | null | undefined {
  const text = value.trim().replace(/[０-９．]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  if (text === '' || text === '-' || text === 'ー') return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return undefined;
  const hours = Number(text);
  return hours <= 168 ? hours : undefined;
}

export default function WorkersScreen() {
  const users = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [editing, setEditing] = useState<UserOut | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserOut | null>(null);
  const [form, setForm] = useState<Form>(newForm);
  const [actionError, setActionError] = useState<string | null>(null);

  // owner と停止した人は出さない
  const workers = (users.data ?? []).filter((user) => user.role === 'worker' && user.active);
  const weeklyHours = parseWeeklyHours(form.weeklyHours);
  const hoursError = weeklyHours === undefined ? '数字で入れてください（決めていないときは空のまま）' : undefined;
  const busy = createUser.isPending || updateUser.isPending;
  const canSubmit = Boolean(form.name.trim()) && weeklyHours !== undefined && !busy;
  const update = (patch: Partial<Form>) => setForm((current) => ({ ...current, ...patch }));

  const startEdit = (user: UserOut) => {
    setActionError(null);
    setEditing(user);
    setForm(formFromUser(user));
  };

  const submit = () => {
    if (!canSubmit || weeklyHours === undefined) return;
    setActionError(null);
    const name = form.name.trim();
    if (editing) {
      // 変えた項目だけを送る。空のままの項目を既定値で上書きしない
      const before = formFromUser(editing);
      const body: UserUpdate = {};
      if (name !== before.name) body.name = name;
      if (form.gender !== before.gender) body.gender = form.gender;
      if (form.workerType !== before.workerType) body.worker_type = form.workerType;
      if (weeklyHours !== (editing.weekly_max_hours ?? null)) body.weekly_max_hours = weeklyHours;
      if (Object.keys(body).length === 0) {
        router.replace('/admin');
        return;
      }
      updateUser.mutate({ id: editing.id, body }, {
        onSuccess: () => router.replace('/admin'),
        onError: (error) => setActionError(errorMessage(error)),
      });
    } else {
      createUser.mutate({ name, role: 'worker', gender: form.gender, worker_type: form.workerType, weekly_max_hours: weeklyHours }, {
        onSuccess: () => router.push('/admin/workers/complete'),
        onError: (error) => setActionError(errorMessage(error)),
      });
    }
  };

  const confirmDelete = () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setActionError(null);
    // 削除は停止にする。一覧から消え、過去の予定・作業ログには名前が残る
    updateUser.mutate({ id: target.id, body: { active: false } }, {
      onSuccess: () => {
        if (editing?.id === target.id) {
          setEditing(null);
          setForm(newForm);
        }
      },
      onError: (error) => setActionError(errorMessage(error)),
    });
  };

  const loadError = users.isError ? errorMessage(users.error) : null;

  return (
    <AdminPage
      scrollable
      header={<>
        <AdminErrorBanner message={actionError ?? loadError} actionLabel={!actionError && loadError ? '再読み込み' : undefined} onAction={() => void users.refetch()} testID="worker-error" />
        <AdminHeader title={editing ? '作業者編集' : '作業者登録'} />
      </>}
      footer={<AdminFlowFooter nextLabel={editing ? '保存する' : '確認する'} nextDisabled={!canSubmit} onBack={() => router.back()} onNext={submit} />}
      testID="worker-register-screen">
      <AdminTextField label="名前" value={form.name} placeholder="田中みのる" inputProps={{ maxLength: 100 }} onChangeText={(name) => update({ name })} />
      <AdminDropdown label="性別" value={form.gender} options={genderOptions} onChange={(gender) => update({ gender: asGender(gender) })} />
      <AdminDropdown label="作業者種別" value={form.workerType} options={workerTypeOptions} onChange={(workerType) => update({ workerType: asWorkerType(workerType) })} />
      <AdminTextField label="週間最大稼働時間" value={form.weeklyHours} placeholder="-" error={hoursError} inputProps={{ keyboardType: 'decimal-pad' }} onChangeText={(hours) => update({ weeklyHours: hours })} />
      <View style={styles.list}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>登録済み作業者</Text>
        {workers.map((user) => (
          <View key={user.id} style={styles.row}>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[adminTextStyles.body, styles.name]}>{user.name}</Text>
            <Pressable accessibilityRole="button" onPress={() => startEdit(user)} style={styles.editButton}><Text style={styles.buttonText}>編集</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPendingDelete(user)} style={[styles.editButton, styles.deleteButton]}><Text style={styles.buttonText}>削除</Text></Pressable>
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
        onConfirm={confirmDelete}
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
