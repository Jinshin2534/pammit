import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type MetricTileProps = { label: string; value: string; unit?: string; detail?: string; icon?: ReactNode; testID?: string };
export function MetricTile({ label, value, unit, detail, icon, testID }: MetricTileProps) {
  return <View style={styles.tile} testID={testID}><View style={styles.heading}>{icon}<AppText adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} variant="caption" style={styles.label}>{label}</AppText></View><View style={styles.valueRow}><AppText adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} variant="bodyLgBold" style={styles.value}>{value}</AppText>{unit && <AppText adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} variant="bodyLgBold" style={styles.value}>{unit}</AppText>}</View>{detail && <AppText adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} variant="small" style={styles.detail}>{detail}</AppText>}</View>;
}
const styles = StyleSheet.create({ tile: { backgroundColor: colors.primary, borderRadius: radii.md, flexShrink: 1, gap: 2, height: 72, minWidth: 0, paddingHorizontal: 6, paddingVertical: 10, width: 92 }, heading: { alignItems: 'center', flexDirection: 'row', minWidth: 0 }, label: { color: colors.textDeep, flexShrink: 1, fontSize: 11, lineHeight: 13 }, valueRow: { alignItems: 'baseline', flexDirection: 'row', minWidth: 0 }, value: { color: colors.surface, flexShrink: 1, lineHeight: 25 }, detail: { color: colors.textMutedGreen, flexShrink: 1, lineHeight: 10 } });
