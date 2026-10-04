import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '@/components/ui';

export type WorkSummaryProps = { plot?: string; work?: string; hat?: string; testID?: string };
export function WorkSummary({ plot = '三番ハウス', work = '摘果・摘葉', hat = '使用する', testID }: WorkSummaryProps) {
  return <Card title="作業内容" variant="filled" testID={testID}><View style={styles.row}><AppText>園地</AppText><AppText variant="bodyBold">{plot}</AppText></View><View style={styles.row}><AppText>作業</AppText><AppText variant="bodyBold">{work}</AppText></View><View style={styles.row}><AppText>帽子</AppText><AppText variant="bodyBold">{hat}</AppText></View></Card>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-between' } });
