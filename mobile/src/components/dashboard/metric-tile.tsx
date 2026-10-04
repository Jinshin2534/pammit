import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type MetricTileProps = { label: string; value: string; unit?: string; detail?: string; icon?: ReactNode; testID?: string };
export function MetricTile({ label, value, unit, detail, icon, testID }: MetricTileProps) {
  return <View style={styles.tile} testID={testID}><View style={styles.heading}>{icon}<AppText variant="caption" style={styles.label}>{label}</AppText></View><View style={styles.valueRow}><AppText variant="numberLg">{value}</AppText>{unit && <AppText variant="body">{unit}</AppText>}</View>{detail && <AppText variant="small" style={styles.detail}>{detail}</AppText>}</View>;
}
const styles = StyleSheet.create({ tile: { backgroundColor: colors.surfaceWarm, borderRadius: radii.md, flex: 1, gap: 6, minWidth: 132, padding: 16 }, heading: { alignItems: 'center', flexDirection: 'row', gap: 6 }, label: { color: colors.textMutedGreen }, valueRow: { alignItems: 'baseline', flexDirection: 'row', gap: 4 }, detail: { color: colors.textSub } });
