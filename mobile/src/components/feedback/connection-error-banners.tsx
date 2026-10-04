import { View } from 'react-native';

import { Banner } from './banner';

export type ConnectionErrorBannersProps = {
  hatDisconnected?: boolean;
  networkDisconnected?: boolean;
  onReconnectHat?: () => void;
  onRetryNetwork?: () => void;
  testID?: string;
};

export function ConnectionErrorBanners({
  hatDisconnected = false,
  networkDisconnected = false,
  onReconnectHat,
  onRetryNetwork,
  testID,
}: ConnectionErrorBannersProps) {
  if (!hatDisconnected && !networkDisconnected) return null;

  return (
    <View testID={testID}>
      {networkDisconnected && (
        <Banner kind="network" actionLabel={onRetryNetwork ? '再試行' : undefined} onAction={onRetryNetwork} testID={testID ? `${testID}-network` : undefined} />
      )}
      {hatDisconnected && (
        <Banner kind="hat" actionLabel={onReconnectHat ? '再接続' : undefined} onAction={onReconnectHat} testID={testID ? `${testID}-hat` : undefined} />
      )}
    </View>
  );
}
