import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage, useCreatePlot, usePlots, useUpdatePlot, type Plot, type PlotUpdate } from '@/api';
import { AdminErrorBanner, AdminFlowFooter, AdminHeader, AdminPage, AdminTextField, adminTextStyles } from '@/components/admin/figma-admin-ui';
import { Dialog } from '@/components/feedback';
import { colors, radii, strokes } from '@/theme/tokens';

// 画面の「農園」は API の plots、「所在地」は municipality
export default function PlotsScreen() {
  const plots = usePlots();
  const createPlot = useCreatePlot();
  const updatePlot = useUpdatePlot();
  const [editing, setEditing] = useState<Plot | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Plot | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = createPlot.isPending || updatePlot.isPending;
  const canSubmit = Boolean(name.trim()) && !busy;

  const startEdit = (plot: Plot) => {
    setActionError(null);
    setEditing(plot);
    setName(plot.name);
    setLocation(plot.municipality ?? '');
  };

  const submit = () => {
    if (!canSubmit) return;
    setActionError(null);
    const trimmedName = name.trim();
    const municipality = location.trim() || null;
    const onError = (error: unknown) => setActionError(errorMessage(error));
    if (editing) {
      // 変えた項目だけを送る
      const body: PlotUpdate = {};
      if (trimmedName !== editing.name) body.name = trimmedName;
      if (municipality !== (editing.municipality ?? null)) body.municipality = municipality;
      if (Object.keys(body).length === 0) {
        router.replace('/admin');
        return;
      }
      updatePlot.mutate({ id: editing.id, body }, { onSuccess: () => router.replace('/admin'), onError });
    } else {
      createPlot.mutate({ name: trimmedName, municipality }, { onSuccess: () => router.replace('/admin'), onError });
    }
  };

  const confirmDelete = () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setActionError(null);
    // 削除は停止にする。一覧と新しい予定・作業から消え、過去の記録には名前が残る
    updatePlot.mutate({ id: target.id, body: { active: false } }, {
      onSuccess: () => {
        if (editing?.id === target.id) {
          setEditing(null);
          setName('');
          setLocation('');
        }
      },
      onError: (error) => setActionError(errorMessage(error)),
    });
  };

  const loadError = plots.isError ? errorMessage(plots.error) : null;

  return (
    <AdminPage
      scrollable
      header={<>
        <AdminErrorBanner message={actionError ?? loadError} actionLabel={!actionError && loadError ? '再読み込み' : undefined} onAction={() => void plots.refetch()} testID="plot-error" />
        <AdminHeader title={editing ? '農園編集' : '農園登録'} />
      </>}
      footer={<AdminFlowFooter nextLabel={editing ? '保存する' : '登録する'} nextDisabled={!canSubmit} onBack={() => router.back()} onNext={submit} />}
      testID="plot-register-screen">
      <AdminTextField label="農園の名前" value={name} placeholder="豊作農園" inputProps={{ maxLength: 100 }} onChangeText={setName} />
      <AdminTextField label="所在地（市区町村）" value={location} placeholder="神山町" inputProps={{ maxLength: 100 }} onChangeText={setLocation} />
      <View style={styles.list}>
        <Text maxFontSizeMultiplier={1.2} style={adminTextStyles.bodyLg}>登録済み農園</Text>
        {(plots.data ?? []).filter((plot) => plot.active).map((plot) => (
          <View key={plot.id} style={styles.row}>
            <View style={styles.copy}><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={adminTextStyles.body}>{plot.name}</Text><Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={adminTextStyles.caption}>{plot.municipality || '所在地未登録'}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => startEdit(plot)} style={styles.editButton}><Text style={styles.buttonText}>編集</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPendingDelete(plot)} style={[styles.editButton, styles.deleteButton]}><Text style={styles.buttonText}>削除</Text></Pressable>
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
        onConfirm={confirmDelete}
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
