# パミット ドキュメント

すだち農家向け技能継承システム「パミット」の設計ドキュメント。

**このディレクトリの内容が正（Single Source of Truth）です。**
予選提出スライドの内容と食い違う場合、こちらが優先します。

AIの現在の開発範囲と測定結果は[AIの最新説明](ai/README.md)を入口にしてください（2026-10-02更新）。個別の計画書には過去の設計案も残っています。実装やローカル成果物を参照する資料があり、画像・モデル本体はGitへ含めません。

## システム構成（現時点の設計案）

使用するハードは [購入・注文済みハード一覧](hardware-inventory.md) を参照してください。
構成・接続方法の詳細は検討中で、実機での動作確認を経て更新します。

```
■ 帽子（Raspberry Pi Zero 2 W）── I/O のみ
    カメラV3 / マイク / スピーカー
         ↕ Wi-Fi（スマートフォンのテザリング）
■ スマートフォン（Android / React Native）── 頭脳
    果実検出ONNX Runtime（Pixel 7a検証済み）/ 実の明暗・かぶり（試作評価中）
    位置付き音声・作業判断・本体アプリへの統合（未完了）
         ↕ LTE
■ AWS（EC2 + RDS + S3）
    記録 / 週次スケジュール生成 / RAG
```

## ハード開発担当へ

まず [初心者向け意思決定ガイド](hardware-decisions.md) を参照してください。何を・なぜ・どの順番で決めるかを整理しています。

[ハード開発の引き継ぎ](hardware-handoff.md) に担当範囲・着手順・接続前の確認事項をまとめています。
センサー値の送信先と送り方は [AWS とセンサー受信](aws.md) を参照してください。

## 目次

### 一次資料

| ファイル | 内容 |
|---|---|
| [research/README.md](research/README.md) | **現地調査（収穫アルバイト2日間）の記録。要件の出所** |
| [research/ai-voice-guidance-products.md](research/ai-voice-guidance-products.md) | **既存製品の複数対象検出・位置音声・対象指定方式の比較** |

### 要件

| ファイル | 内容 |
|---|---|
| [ai/README.md](ai/README.md) | **AIの最新説明**。実装済み範囲、Pixel 7aの速度、ラベルと最新評価、接続条件 |
| [requirements/00-overview.md](requirements/00-overview.md) | 対象者・課題・KPIとその測定方法 |
| [requirements/01-requirements.md](requirements/01-requirements.md) | 機能要件 F-01〜F-12・非機能要件・スコープ |
| [requirements/02-domain-model.md](requirements/02-domain-model.md) | ドメインモデル・テーブル設計 |
| [requirements/03-labels.md](requirements/03-labels.md) | ラベル定義・アノテーション規約 |
| [requirements/04-api.md](requirements/04-api.md) | **API仕様・実装順序**（アプリ／ハード担当への受け渡し用） |
| [requirements/05-ai-requirements-draft.md](requirements/05-ai-requirements-draft.md) | **AI要件定義の草案**。確認済み事項、データ監査、未決事項 |
| [requirements/06-ai-implementation-plan.md](requirements/06-ai-implementation-plan.md) | **10月10日本選向けAI実装計画**。データ判定条件と日程 |
| [requirements/07-ai-design-review.md](requirements/07-ai-design-review.md) | **AI実装の全体設計レビュー案**。構成、データ、通信、音声、評価、実装順 |
| [requirements/08-drive-data-audit.md](requirements/08-drive-data-audit.md) | **Driveデータ一次監査**。収穫動画34件・76.93 GB、事後ラベル付けの可能性 |
| [requirements/09-decision-label-pilot.md](requirements/09-decision-label-pilot.md) | **摘果・摘葉の判断基準と事後ラベル試行**。既存の理由候補、熟練者の確認事項、評価への接続 |
| [requirements/10-thinning-research-review.md](requirements/10-thinning-research-review.md) | **摘果・摘葉の調査資料レビュー**。本選に採用する設計と検証後に回す項目 |
| [requirements/11-first-label-pilot-batch.md](requirements/11-first-label-pilot-batch.md) | **第1回ラベル試行セット**。4日分・5場面の小容量クリップと静止画、熟練者確認項目 |
| [requirements/12-android-inference-check.md](requirements/12-android-inference-check.md) | **既存ONNXモデルのAndroid実機検証**。FP32変換、Pixel 7aでの再現性と速度、残課題 |
| [requirements/15-fruit-shade-label-audit.md](requirements/15-fruit-shade-label-audit.md) | **実の明暗・葉のかぶりラベルの初回確認**。ラベル件数、未入力、基準実験 |
| [requirements/16-additional-shade-frames.md](requirements/16-additional-shade-frames.md) | **追加の静止画ラベルセット**。別動画8本の9場面、選別と候補枠 |
| [requirements/13-p01-provisional-review.md](requirements/13-p01-provisional-review.md) | **P01の暫定画像レビュー**。検出候補の確認と摘果・摘葉判断を保留した根拠 |
| [requirements/14-pilot-analyst-review.md](requirements/14-pilot-analyst-review.md) | **第1回ラベル試行のAI側レビュー**。全47候補の存在確認、重複・見逃しの疑い |
| [requirements/handoff-trigger-and-guidance.md](requirements/handoff-trigger-and-guidance.md) | **Piの音声トリガー・単一JPEG・音声案内の引き継ぎ**。実装済みAPIと未決事項 |

## 未決事項

### AIの直近の確認事項

- [ ] 明暗ラベルの「一部が明るい／表面の大半が明るい」を確認する
- [ ] 実全体を残す新入力で明暗・葉のかぶりを評価する
- [ ] 誤判定・見逃し・`unknown`の許容上限を熟練者と決める
- [ ] Pi→Pixel→最初の音声の全経路を実機で測る

### 栽培判断の正解データ

現在の動画は収穫が中心で、実の画像上の明暗・葉のかぶりをラベル付けしている。摘果・摘葉の作業判断へ進むには、適用条件と熟練者の正解判断を別途確認する必要がある。

現地レポート1日目には「すでに2Lに達しているものが多く、本日から収穫開始。例年より少し早い」とある。
神山町では摘果が9月中旬まで続くと聞いていたが、**畑によって進度が違う。**

- [ ] 摘果・摘葉の判断基準を適用できるデータを確保する

### ヒアリング待ち（撮影同行で確認）

- [ ] **ハウスで天候が作業にどう関わるか** → F-04（週次スケジュール提案）のルールが書けない
  - 露地の収穫は「雨でも作業内容は変わらない」と現地で確認済み。防除など他作業は未確認
- [ ] 摘果の指導は行われているか（**収穫では指導されず放置されていた**。作業によって違うか）
- [ ] **年間カレンダーは実際に使われているか** → F-07 の実装要否
- [ ] **栽培暦の現物をもらう** → F-04 の前提データ。**これが無いと1行も動かない**
- [ ] PHI・灌水タイミングで困っているか → 実装しないと決めたが、確認は取る
- [ ] 10月に木に実は残っているか → デモの実演方法
- [ ] 秀品率の実数 → KPIの根拠

### 撮影前に決めること

- [ ] 撮影日程の確定（ベテラン同行・音声録音込み）

※ マーカー手袋は不採用とした。**撮影は通常の手袋のままでよい。**

### 保留中の機能候補

- [ ] **「丁寧に扱う」促し** — すだちをポロポロ落として傷をつけている（現地観測）。
  音声リマインドならほぼゼロコスト。ロナさん案「すだちが『ココダヨ』と喋る」。撮影結果を見てから判断
- [ ] **剪定支援** — 2年目の研修生が困っており最も裏取りが強いが、剪定は2〜3月で本選に間に合わない。
  今後の展望として提示する。高木さんが畑の一部を実験に貸してくれる
- [ ] **園地マップ + 土壌水分センサーによる灌水判断支援** — 帽子とは別に園地へ常設したセンサーから
  土壌水分を収集し、地図上で園地ごとの乾燥状態・前回の降雨・前回の灌水を見える化する案。
  農家が灌水の実施・見送り、水量、判断理由を記録し、園地固有の判断基準を後継者へ引き継ぐ可能性がある。
  当初は樹齢・季節・降雨・土壌水分を使ったルールで提案し、十分な記録が蓄積してから個別最適化を検討する。
  **本選スコープには入れず**、すだち園での設置位置・閾値・通知需要をヒアリングしてから採否を決める

### 実装前に決めること

- [ ] スマホ画面ON/OFF を統合するか（現状: OFF固定を基本、ONはデモ表示用）
- [ ] 気象APIの選定（気象庁 / OpenWeather）
- [ ] 露地展開時のセンサー通信（LoRaWAN + TTN が有力）

## 運用ルール

1. 仕様が変わったら、影響するファイルを同じPRで更新する
2. マージしたら Slack にリンクを投げる
3. 版数は打たない。**常に最新が正**。本選時点で git tag を打つ

なお、設計判断の経緯（なぜその構成にしたか、何を却下したか）は
リポジトリ外で別途管理しています。

## 用語

| 用語 | 意味 |
|---|---|
| 摘果 | 実を大きく育てるため、不要な実を間引く作業 |
| 摘葉 | 日照を妨げている葉を取り除く作業 |
| 秀品率 | 収穫物のうち規格を満たし傷のないものの割合 |
| 栽培暦 | JAが配布する年間作業計画表。現在は手書きで記入 |
| 園地 | 畑の単位。「3番畑」「3番ハウス」など |
| 一次応答 | 判定直後の定型音声（0.3秒・オフライン） |
| 二次応答 | 「なんで?」に対する Realtime API の説明（2〜3秒・要通信） |
