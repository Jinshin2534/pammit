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

## AppTextと文字スタイル

共通の文字は`src/components/ui/app-text.tsx`から`AppText`を読み込む。`variant`には`display`、`titleLg`、`title`、`bodyLg`、`bodyLgBold`、`bodyMd`、`body`、`bodyBold`、`caption`、`captionBold`、`small`、`numberXl`、`numberLg`を指定できる。

```tsx
<AppText variant="title">画面タイトル</AppText>
<AppText variant="body">本文と補足の文章</AppText>
```

すべてZen Maru Gothicを使い、Androidの余分な上下余白を付けず、文字拡大を1.2倍までに揃える。文字色は既定で`colors.text`。必要な場合は`style`で色や配置だけを上書きする。開発時は`/dev/typography`で全種類を確認できる。

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

## PageLayout

`src/components/layout/page-layout.tsx`から読み込む。

```tsx
<PageLayout
  header={<ScreenHeader title="ホーム" topPadding={16} />}
  footer={<BottomNav role="worker" onTabPress={handleTabPress} />}>
  {/* 本文 */}
</PageLayout>
```

- `header`、`footer`: スクロールしない上部・下部の部品。どちらも省略可。上部のScreenHeaderには`topPadding={16}`を渡す。
- `children`: 本文。既定で縦にスクロールできる。
- `variant`: `standard`（既定）または`centered`。中央配置でも本文が長くなればスクロールできる。
- `contentPadding`: 本文の左右余白。既定40。カレンダー・農園・AI相談は16。
- `scrollable`: 既定`true`。本文がFlatListや独自のスクロールを持つ場合は`false`にして、縦スクロールを二重にしない。
- `background`: 画面全体の後ろに配置する装飾。Safe Areaの外にも広がり、タップを遮らない。HeaderBackgroundなどを呼び出し側から渡す。
- `testID`: 本文は末尾`-body`、下部領域は末尾`-footer`。

Safe Areaはこの部品で一度だけ確保する。親でSafeAreaViewを重ねない。下部バーがあるときは、システム操作領域に加えて10の余白を確保する。本文の上余白8、下余白24、部品間隔20。

開発時は`/dev/page-layout`で通常・中央・長い本文・左右余白16を切り替えて確認できる。BottomNav自体は別の部品として実装する。

## BottomNav

`src/components/navigation/bottom-nav.tsx`から読み込む。

```tsx
const routes = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
} as const;

<BottomNav
  role="worker"
  activeTab="home"
  onTabPress={(tab) => router.navigate(routes[tab])}
/>
```

- `role`: 必須。`worker`はホーム・予定・農園・相談の4タブ。`owner`は管理を加えた5タブ。表示制御であり、APIや画面の認可は別途行う。
- `onTabPress`: 必須。押したタブのキーを返す。画面側でルーティングへ接続する。
- `activeTab`: 選択中のタブを読み上げに反映する。Figmaの仕様どおり、選択による色の変更は行わない。
- `testID`: 各タブに末尾`-home`、`-schedule`、`-farm`、`-ai`、`-admin`を付ける。

アイコンはFigmaのSVGを使用。49×49、AIだけ37×49。文字はZen Maru Gothic Mediumの15、Androidで切れないよう行高18、文字拡大は1.2倍まで。タブを等幅に並べ、左右余白8。押下中は不透明度70%。

Safe Areaと下10の余白はPageLayout側で確保する。BottomNav自身では重ねて確保しない。既存のexpo-router標準タブバーへの置き換えは、画面の結合時に行う。

開発時は`/dev/bottom-nav`で4/5タブの切り替えとタブ押下を確認できる。この確認画面では製品画面へ遷移せず、押したタブに応じてタイトルを切り替える。

## 6部品の組み合わせ確認

開発時は`/dev/component-integration`で、最初に作った6部品を同じ画面に置いて確認できる。

- PageLayoutの本文だけがスクロールし、ScreenHeaderとBottomNavは固定される。
- TextFieldへ名前を入力すると、下のCardへ入力内容が表示される。
- 時間入力欄、Button、ScreenHeaderの戻るボタン、BottomNavを押すと、最上部のCardへ結果が表示される。
- 製品ビルドではこの確認画面から入口へ戻る。
