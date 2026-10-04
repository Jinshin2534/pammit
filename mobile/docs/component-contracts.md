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
