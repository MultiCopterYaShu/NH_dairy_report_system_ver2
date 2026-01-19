# Render デプロイ手順

このシステムをRenderにデプロイする手順です。

## 1. Renderアカウントの作成

1. [Render](https://render.com) にアクセスしてアカウントを作成
2. GitHubアカウントと連携（推奨）

## 2. リポジトリの準備

1. このプロジェクトをGitHubリポジトリにプッシュ
2. `.gitignore`で`data/*.json`が除外されているため、初期データは`initialize_data()`で自動生成されます

## 3. RenderでWebサービスを作成

1. Renderダッシュボードで「New +」→「Web Service」を選択
2. GitHubリポジトリを接続
3. 以下の設定を行う：

### 基本設定
- **Name**: `daily-report-system`（任意）
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

### 環境変数
以下の環境変数を設定：

- **SECRET_KEY**: ランダムな文字列（例：`openssl rand -hex 32`で生成）
  - セキュリティのため、本番環境では必ず設定してください

### ディスクストレージ（重要）
データファイル（JSON）を永続化するため、ディスクストレージを追加：

1. 「Disk」タブで「Add Disk」をクリック
2. 以下の設定：
   - **Name**: `data-disk`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1GB（必要に応じて調整）

## 4. デプロイ

1. 「Create Web Service」をクリック
2. デプロイが完了するまで待機（数分かかります）
3. デプロイ完了後、提供されたURLでアクセス

## 5. 初期ログイン

- **ユーザー名**: `admin`
- **パスワード**: `admin`（初回ログイン後、必ず変更してください）

## 注意事項

1. **データの永続化**: ディスクストレージを設定しないと、再デプロイ時にデータが失われます
2. **SECRET_KEY**: 本番環境では必ず強力なSECRET_KEYを設定してください
3. **HTTPS**: Renderは自動的にHTTPSを提供します
4. **環境変数**: 機密情報は環境変数で管理してください

## トラブルシューティング

### デプロイエラー
- `requirements.txt`の依存関係を確認
- ビルドログを確認してエラー内容を確認

### データが保存されない
- ディスクストレージが正しくマウントされているか確認
- `data`ディレクトリのパスが正しいか確認

### アプリケーションが起動しない
- ログを確認してエラー内容を確認
- `gunicorn`が正しくインストールされているか確認

