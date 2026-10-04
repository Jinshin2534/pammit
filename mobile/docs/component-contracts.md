# 共通コンポーネントの配置と契約

実装開始前に担当者同士でpropsを確定し、同じファイルを同時に編集しない。

## 配置

| ディレクトリ | 対象 |
|---|---|
| `src/components/ui/` | Button、IconButton、SmallButton、TextField、Dropdown、Radio、Card、ListItem、PinKey、PinDot、MetricTile、MenuTile |
| `src/components/navigation/` | ScreenHeader、BottomNav、StepHeader、StepIndicator、FlowFooter |
| `src/components/feedback/` | Banner、Dialog、Toast |
| `src/components/chat/` | ChatInput、ChatBubble、AiAvatar |
| `src/components/schedule/` | CalendarDay、WorkTypeLegend、ScheduleCard、ScheduleCarousel、ScheduleBottomSheet |
| `src/components/layout/` | HeaderBackground、画面共通レイアウト |

## 最初に確定する共通props

```ts
type CommonPressableProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  testID?: string;
};

type ButtonProps = CommonPressableProps & {
  label: string;
  variant?: 'primary' | 'cta' | 'secondary';
  size?: 'md' | 'lg';
};

type TextFieldBaseProps = {
  label: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
};

type TextFieldProps =
  | (TextFieldBaseProps & {
      type?: 'text';
      value: string;
      onChangeText: (value: string) => void;
      placeholder?: string;
    })
  | (TextFieldBaseProps & {
      type: 'time-range';
      from: string;
      to: string;
      onPress: () => void;
    });

type CardProps = {
  title?: string;
  body?: string;
  children?: ReactNode;
  variant?: 'outlined' | 'filled' | 'muted';
  testID?: string;
};
```

詳細なpropsは各コンポーネントの実装開始前に確定する。

## ScreenHeader

`src/components/navigation/screen-header.tsx`から読み込む。

```tsx
<ScreenHeader title="ホーム" />
<ScreenHeader title="予定入力" showBack onBack={() => router.back()} />
```

- `title`: 表示する画面タイトル。必須。
- `showBack`: 戻るボタンを表示する。既定は`false`。
- `onBack`: `showBack={true}`の場合は必須。遷移先は呼び出し側で決める。
- `topPadding`: 既定はFigmaと同じ40。親の`SafeAreaView`が上部のシステム領域を確保する場合は16を渡す。ヘッダー自体ではSafe Areaを加算しない。
- `backAccessibilityLabel`: 戻るボタンの読み上げ。既定は「前の画面に戻る」。
- `testID`: 確認用ID。ボタンには末尾`-back`を付ける。

タイトルは中央寄せ、Zen Maru Gothic Mediumの35。戻るボタンは左16、48×48、押下中は不透明度70%。長いタイトルは折り返し、戻るボタンの領域と重ねない。

開発時は`/dev/screen-header`で、戻るボタンの有無、長いタイトル、押下を確認できる。製品ビルドではこの確認画面から入口へ戻る。
