# GitHub SSH認証の設定手順

SSH認証を使用すると、Personal Access Tokenを毎回入力する必要がなくなります。

## 1. SSHキーの確認

既にSSHキーが存在するか確認：

```bash
ls -al ~/.ssh
```

`id_ed25519.pub` または `id_rsa.pub` があれば、既にSSHキーが存在します。
その場合は、ステップ2に進んでください。

## 2. SSHキーの生成（まだ持っていない場合）

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

- メールアドレスはGitHubに登録しているものを使用してください
- パスフレーズの入力を求められたら、Enterキーを2回押してパスフレーズなしで作成することもできます（セキュリティ上は推奨されませんが、開発環境では便利です）

## 3. SSHキーをGitHubに追加

1. 公開鍵の内容をコピー：

```bash
cat ~/.ssh/id_ed25519.pub
```

2. 表示された内容を全てコピー（`ssh-ed25519`で始まる文字列）

3. GitHubでSSHキーを追加：
   - [GitHub](https://github.com)にログイン
   - 右上のプロフィールアイコン → **Settings**
   - 左メニューの **SSH and GPG keys** をクリック
   - **New SSH key** をクリック
   - **Title**: `Mac - Daily Report System`（任意の名前）
   - **Key**: コピーした公開鍵を貼り付け
   - **Add SSH key** をクリック

## 4. SSH接続のテスト

```bash
ssh -T git@github.com
```

初回接続時は「Are you sure you want to continue connecting?」と聞かれるので、`yes`と入力してください。

「Hi YOUR_USERNAME! You've successfully authenticated...」と表示されれば成功です。

## 5. リモートURLをSSHに変更

既にHTTPSでリモートを追加している場合：

```bash
# 現在のリモートURLを確認
git remote -v

# SSH URLに変更（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換えてください）
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 確認
git remote -v
```

まだリモートを追加していない場合：

```bash
# SSH URLでリモートを追加（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換えてください）
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

## 6. プッシュ

```bash
git push -u origin main
```

これで、パスワードやトークンの入力なしでプッシュできます！

