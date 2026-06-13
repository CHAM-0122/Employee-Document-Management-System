# Employee Intake Contracts MVP

入社時の `従業員誓約書` と `SNS誓約書` を電子化するための Next.js / Prisma ベースのMVPです。

## セットアップ

1. `.env.example` をもとに `.env.local` を作成
2. 依存関係をインストール
3. Prisma Client を生成
4. 開発サーバを起動

```bash
npm install
npm run prisma:generate
npm run dev
```

## DockerでQR読み取りテスト

実機スマホでQRコードを読み込むテストをする場合は、Dockerでも起動できます。

```bash
docker compose up --build
```

Macから確認する場合:

```text
http://localhost:3048/admin/intakes?role=hq_admin
```

スマホから確認する場合は、Macと同じWi-Fiに接続し、MacのローカルIPを使います。

```bash
ipconfig getifaddr en0
```

例:

```text
http://192.168.1.20:3048
```

詳しくは `DOCKER_TESTING.md` を参照してください。

## 主要ルート

- `/`
- `/intakes/sample-token`
- `/admin/intakes`

## 注意

- 管理者認証は仮実装です
- PDF生成、メール送信、S3保存は未接続です
- 署名画像は現時点では保存パスのみ仮実装です
