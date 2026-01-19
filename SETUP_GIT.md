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

## 5. リモートリポジトリの追加とプッシュ

GitHubで作成したリポジトリのURLを取得し、以下のコマンドを実行：

```bash
# リモートリポジトリを追加（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換えてください）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# メインブランチに変更
git branch -M main

# プッシュ
git push -u origin main
```

## 6. Renderでのデプロイ

GitHubリポジトリが準備できたら、`README_DEPLOY.md`の手順に従ってRenderでデプロイしてください。

