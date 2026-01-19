# Gitリポジトリの初期化とGitHubへのプッシュ手順

## 1. Gitリポジトリの初期化

ターミナルで以下のコマンドを実行してください：

```bash
cd /Users/shu/Desktop/2025/日報管理ver2
git init
```

## 2. ファイルをステージング

```bash
git add .
```

## 3. 初回コミット

```bash
git commit -m "Initial commit: 日報管理システム"
```

## 4. GitHubリポジトリの作成

1. [GitHub](https://github.com)にアクセス
2. 「New repository」をクリック
3. リポジトリ名を入力（例：`daily-report-system`）
4. 「Create repository」をクリック

## 5. GitHub Personal Access Token (PAT) の作成

GitHubへのプッシュには、パスワードの代わりにPersonal Access Tokenが必要です。

1. [GitHub](https://github.com)にログイン
2. 右上のプロフィールアイコンをクリック → **Settings**
3. 左メニューの一番下にある **Developer settings** をクリック
4. **Personal access tokens** → **Tokens (classic)** をクリック
5. **Generate new token** → **Generate new token (classic)** をクリック
6. 以下の設定を行う：
   - **Note**: `daily-report-system`（任意の名前）
   - **Expiration**: 必要に応じて設定（例：90日、またはNo expiration）
   - **Select scopes**: 以下の権限にチェック：
     - ✅ `repo` (全てのリポジトリへのアクセス)
7. **Generate token** をクリック
8. **重要**: 表示されたトークンをコピーして安全な場所に保存（再表示できません）

## 6. リモートリポジトリの追加とプッシュ

GitHubで作成したリポジトリのURLを取得し、以下のコマンドを実行：

```bash
# リモートリポジトリを追加（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換えてください）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# メインブランチに変更
git branch -M main

# プッシュ（ユーザー名とトークンを入力）
git push -u origin main
```

**プッシュ時の認証：**
- **Username**: あなたのGitHubユーザー名
- **Password**: 上記で作成したPersonal Access Token（パスワードではありません）

### 代替方法：SSH認証を使用する場合（推奨）

SSH認証を使用すると、Personal Access Tokenを毎回入力する必要がなくなります。
詳細な手順は `SETUP_SSH.md` を参照してください。

簡単な手順：

1. SSHキーを生成（まだ持っていない場合）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. 公開鍵をコピー：
```bash
cat ~/.ssh/id_ed25519.pub
```

3. GitHubにSSHキーを追加：
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - コピーした公開鍵を貼り付け

4. リモートURLをSSHに変更：
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 6. Renderでのデプロイ

GitHubリポジトリが準備できたら、`README_DEPLOY.md`の手順に従ってRenderでデプロイしてください。

