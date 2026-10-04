import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type MetricTileProps = { label: string; value: string; unit?: string; detail?: string; icon?: ReactNode; testID?: string };
export function MetricTile({ label, value, unit, detail, icon, testID }: MetricTileProps) {
  return <View style={styles.tile} testID={testID}><View style={styles.heading}>{icon}<AppText variant="caption" style={styles.label}>{label}</AppText></View><View style={styles.valueRow}><AppText variant="bodyLgBold" style={styles.value}>{value}</AppText>{unit && <AppText variant="bodyLgBold" style={styles.value}>{unit}</AppText>}</View>{detail && <AppText variant="small" style={styles.detail}>{detail}</AppText>}</View>;
}
const styles = StyleSheet.create({ tile: { backgroundColor: colors.primary, borderRadius: radii.md, flexShrink: 0, gap: 2, height: 72, padding: 10, width: 92 }, heading: { alignItems: 'center', flexDirection: 'row' }, label: { color: colors.textDeep, lineHeight: 13 }, valueRow: { alignItems: 'baseline', flexDirection: 'row' }, value: { color: colors.surface, lineHeight: 25 }, detail: { color: colors.textMutedGreen, lineHeight: 10 } });
