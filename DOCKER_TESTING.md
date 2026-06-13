# Dockerテスト環境

QRコードを実機スマホで読み込んで入力テストするための、開発用Docker構成です。

## 起動

```bash
docker compose up --build
```

Docker確認中は `USE_MOCK_DATA=1` で起動します。QR発行や提出一覧の確認はモックデータ上で動くため、ローカルにPostgreSQLを起動しなくてもスマホ入力テストができます。

起動後、Macのブラウザでは次のURLを開きます。

```text
http://localhost:3048/admin/intakes?role=hq_admin
```

## スマホからQRを読む場合

スマホとMacを同じWi-Fiに接続し、MacのローカルIPアドレスを確認します。

```bash
ipconfig getifaddr en0
```

例: MacのIPが `192.168.1.20` の場合、スマホ共有用ベースURLには次を入力します。

```text
http://192.168.1.20:3048
```

その状態で管理画面のQRを表示・印刷すると、スマホから読み取れるURLになります。

## 停止

```bash
docker compose down
```

## 補足

- このDocker構成はテスト用です。
- 本番用のDB、メール送信、ファイル保存、認証は別途AWS構成へ接続します。
- 現在のモックデータ確認やQR読み取りテストを安定させる目的で使います。
