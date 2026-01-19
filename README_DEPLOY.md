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

#### AWS S3設定（必須）
データファイル（JSON）はAWS S3に保存されます。以下の環境変数を設定してください：

- **USE_S3**: `true`（S3を使用する場合）
- **AWS_ACCESS_KEY_ID**: AWSアクセスキーID
- **AWS_SECRET_ACCESS_KEY**: AWSシークレットアクセスキー
- **AWS_REGION**: AWSリージョン（デフォルト: `ap-northeast-1`）
- **S3_BUCKET_NAME**: S3バケット名（デフォルト: `nohara-dairy-report-db`）

**重要**: 
- AWS認証情報はRenderの環境変数として設定してください（機密情報のため）
- S3バケット`nohara-dairy-report-db`が事前に作成されている必要があります
- バケットのアクセス権限（IAMポリシー）で読み書きが許可されている必要があります

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

### データが保存されない / JSONファイルが読み込めない
- **AWS S3設定を確認**:
  - 環境変数`USE_S3`が`true`に設定されているか確認
  - `AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`が正しく設定されているか確認
  - S3バケット名が正しいか確認（デフォルト: `nohara-dairy-report-db`）
  - AWSリージョンが正しいか確認（デフォルト: `ap-northeast-1`）
- **S3バケットの確認**:
  - S3バケット`nohara-dairy-report-db`が存在するか確認
  - IAMポリシーで読み書き権限が付与されているか確認
- **ログを確認**:
  - Renderのログに`[json_manager] S3クライアントを初期化しました:`というメッセージが表示されるか確認
  - S3への保存/読み込みエラーがないか確認
- **ローカル開発環境の場合**:
  - 環境変数`USE_S3`を設定しない、または`false`に設定すると、ローカルの`data`ディレクトリを使用します

### アプリケーションが起動しない
- ログを確認してエラー内容を確認
- `gunicorn`が正しくインストールされているか確認

