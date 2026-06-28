# Wander App — セッション引き継ぎドキュメント

## プロジェクト概要

「あえて迷わせる散歩 Web アプリ」のフロントエンド・プロトタイプ。  
地図を表示せず、コンパス矢印と距離数字だけでユーザーを目的地（ランダム）へ誘導する。

**技術スタック:** Next.js 15 (App Router) / TypeScript / Tailwind CSS v3

---

## ディレクトリ構成

```
src/
  app/
    layout.tsx        # ルートレイアウト（viewport メタ含む）
    globals.css       # Tailwind directives + grain texture + keyframes
    page.tsx          # メイン画面（コンパス・距離・状態管理・ヒント表示）
  components/
    CompassArrow.tsx  # SVG コンパス針コンポーネント
    ArrivalModal.tsx  # 到着モーダル（軌跡マップ・統計・ボタン）
    RouteCanvas.tsx   # SVG 軌跡描画（白線・グロー・開始●・終了★）
  hooks/
    useGeolocation.ts          # navigator.geolocation.watchPosition ラッパー
    useDeviceOrientation.ts    # deviceorientation / iOS 許可ボタン / EMA フィルタ
    useWalkTracker.ts          # 経過時間・移動距離・推定歩数・ルート座標記録
    useWalkHints.ts            # 散歩ヒントのランダム表示（10秒後〜30-60秒ごと）
  lib/
    geo.ts            # bearing・distance・座標ユーティリティ + RoutePoint 型
```

---

## 画面の状態遷移

```
idle（スタートボタン）
  ↓ handleStart() — generateRandomDestination() + startTracking()
walking（コンパス・距離・ヒント・タイマー）
  ↓ dist <= 20m — setWalkState("arrived")
arrived（ArrivalModal: 軌跡マップ・統計）
  ↓ onRestart → idle→walking, onFinish → idle
```

---

## 主要な仕様

### 目的地（ランダム）
- スタートボタン押下時に現在地から **500m〜1km のランダム方向** へ目的地を設定
- `generateRandomDestination(lat, lng, 500, 1000)` — 球面三角法の逆算
- 「もう一度歩く」ボタンで現在地から再計算

### コンパス方角の計算
```
arrowRotation = bearing - deviceHeading
```
- `bearing` = 現在地→目的地の真北基準方位角（0=N, 90=E）
- `deviceHeading` = デバイスが向いている方位角（0=N, clockwise）

### デバイス方位の取得
| プラットフォーム | イベント | プロパティ |
|---|---|---|
| iOS Safari | `deviceorientation` | `event.webkitCompassHeading`（許可必要） |
| Android Chrome | `deviceorientationabsolute` | `(360 - event.alpha) % 360` |
| フォールバック | `deviceorientation` | `(360 - event.alpha) % 360` |

### 0/360 境界の滑らかなアニメーション
`useDeviceOrientation.ts` 内で最短弧デルタを累積加算し EMA（α=0.18）を適用。  
CSS `transition: transform 0.25s ease-out` との二段構えでフリップしない。

### 寄り道ヒント（useWalkHints）
- 歩行開始 10 秒後に最初のヒントを表示、以降 30〜60 秒ごとにランダム切替
- `key={hint}` で要素を再マウント → `hintFade` CSS アニメーションが毎回再生
- 直前と同じヒントは選ばない（`pickRandom(exclude)` の除外ロジック）

### ルート記録（useWalkTracker）
- GPS 更新ごとに 2 系統のフィルタリングを行う:
  - **距離累計**: 前回地点から 3m 以上移動したら加算（ジッター除去）
  - **ルート記録**: 前回記録点から 5m 以上移動したら `routePoints` 配列に追加
- `stats.routePoints` を `ArrivalModal` へ props で渡す

### SVG ルートマップ（RouteCanvas）
- viewBox `320×220`、`width: 100%` で親幅にフィット
- バウンディングボックスを計算し、縦横比を保ってパディング付きでスケーリング
- 白いグロー線（`feGaussianBlur` filter）＋クリアな白線の二重描画
- 開始: 白丸 ●、到着: 黄色の ★ テキスト

---

## 開発サーバーの起動

```bash
npm install
npm run dev
```

スマートフォンから接続するには、同一 Wi-Fi で IP アドレス指定か、  
または `next dev --experimental-https` を使ってローカル HTTPS 証明書を発行する  
（iOS Safari は HTTPS でないとデバイスセンサーが動かないことがある）。

```bash
# HTTPS で起動（iOS 実機テスト用）
npm run dev -- --experimental-https
```

---

## 未実装 / 今後の拡張候補

- [ ] **軌跡の永続化:** localStorage に保存して「今日の散歩一覧」を表示
- [ ] **PWA 対応:** `manifest.json` + Service Worker でオフライン・ホーム画面追加
- [ ] **方位センサー精度インジケーター:** `webkitCompassAccuracy` を UI に反映
- [ ] **多言語対応:** i18n
- [ ] **ヒントのカスタマイズ:** ユーザーが自分のヒントを追加できる設定画面

---

## 既知の制限

- 地図 API 不使用のため、直線距離のみ（実際の歩行距離は計算しない）
- Android の `alpha` 値はブラウザ実装によって符号・基準が異なる場合がある
- デスクトップブラウザではデバイス方位センサーがないため矢印は固定
- GPS 精度が低いと軌跡がジグザグになることがある（5m フィルタで軽減）

---

## メモリ / 重要な決定事項

- コンポーネントは `'use client'` ディレクティブ必須（ブラウザ API 使用のため）
- `min-h-dvh`（dynamic viewport height）を使用 → モバイルブラウザのアドレスバー対応
- Tailwind カスタムクラス `bg-grain` をグローバル CSS で定義
- `RoutePoint` 型は `geo.ts` に定義（geo 関連の共有型として）
- スパークル座標は `Math.random()` でなく決定論的計算 → Hydration エラー回避
