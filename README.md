# 起動手順

`git clone https://github.com/SmartPhoneAppsProject/satoruchan-server.git`

依存関係のインストール

`cd app/ && yarn` or `cd app/ npm install`

環境変数の設置

app フォルダ内に `.env` ファイルを設置し、次のフォーマットで変数を定義する

```
SLACK_API_KEY=
TEST_SLACK_CHANNEL_ID=
PRODUCTION_SLACK_CHANNEL_ID=
```

各々の docker 実行環境で init.sh の実行権限がないと docker によりエラーが返される
そのため以下のコマンドで実行権限を付与する必要があります。クローン後に一度実行するだけでいいです。

`chmod a+x container/db/docker-entrypoint-initdb.d/init.sh`

コンテナ起動

`docker compose up -d`

これでアプリが動くはずです。

# 確認

コンテナが動いているか確認。
Status が running になっていれば動いてます。

`docker compose ps`

loclhost:8888 でサーバーが動いているのでアクセスしてみましょう。

`http://localhost:8888`

データベースから値を取得できているか確認

`http://localhost:8888/testdb`

コンテナ・イメージ・ネットワークを削除

`docker compose down --rmi all`

# 起動後ワークフロー

コンテナを起動後、app フォルダ内のソースに変更を加えると、コンテナ内のソースも同期して
変更されます。そのためコンテナに入って作業する必要はなく、いつも通り自身の環境で作業
してください。
注意) コンテナ内のソースが更新されてサーバーがリスタートするまで数秒かかります。

変更が更新されない現象が起きた場合は、以下のコマンドを試してみてください。(これは代用手段のため、
頻繁にこの現象が起きた場合は、ホスト・コンテナ間のソース同期の方法を考える必要があります。)

`docker compose restart`

# 環境変数について

開発環境では doker-compose の `environment` で次の環境変数を定義しています。

```
DATABASE_URL=
NODE_ENV=
```

本番環境では、app/Dockerfile の `ENV` で次の環境変数を定義しています。<br>
また、本番環境の `DATABASE_URL` は heroku により設定されます。Heroku CLI によりスマプロのアカウントで heroku のさとるちゃんプロジェクトにログイン後、 `heroku config` で実際に設定される変数が確認できると思います。

```
NODE_ENV=
```

app/.env では、以下の環境変数を定義しています。

```
SLACK_API_KEY=Bearer hogehoe
TEST_SLACK_CHANNEL_ID=
PRODUCTION_SLACK_CHANNEL_ID=
```

`NODE_ENV`によって、本番と開発でさとるちゃんが通知するチャンネルが切り替わります。<br>
`SLACK_API_KEY` は、本番と開発で共通です。

最後に、本番環境の`PORT`も heroku により自動でセットされます。開発環境では、PORT が heroku によりセットされないため、8888 番ポートがセットされるようになっています。

# デプロイについて

開発環境は docker-compose で整えています。<br>
開発環境で実際に動くコンテナは、container/ で定義しており、docker-compose で管理しています。

本番環境では docker-compose は使っておらず、 server の環境のみ docker で作成し、それを heroku の docker registory に push & release することでデプロイしています。<br>
本番環境で実際に動くコンテナは、app/Dockerfile で定義しています。<br>

- heroku の registory について
  https://devcenter.heroku.com/articles/container-registry-and-runtime#cli

- 本番環境で server の環境のみ用意するメリット
  https://devcenter.heroku.com/ja/articles/local-development-with-docker-compose#pushing-your-containers-to-heroku

注) deploy.sh でデプロイするためには、heroku container にログインしている必要があります。

# heroku CLI

heroku CLI は以下の URL からインストールできます。<br>
https://devcenter.heroku.com/ja/articles/heroku-cli#download-and-install

`heroku config --app satoruchan`で heroku が本番環境でセットしてくれる環境変数が確認できます。このコマンドでは
表示されないですが、`PORT`もセットしてくれます。

# ユーティリティ

### コンテナ状態確認

`docker compose ps`

### コンテナは作成されていても起動していない時とか

`docker compose logs`

### データベースの値を確認したい・直接書き換えたい

db コンテナに入る

`docker compose exec db bash`

データベースに入る

`psql -U postgres satoruchan`

    -> `\d` // テーブル確認

    -> `select * from member_list`

### データベースの内容を初期化したい

データベースのデータをコンテナを消しても残しておくために、docker のボリュームという機能を使っています。

コンテナ初回起動時 -> container/db/docker-entrypoint-initdb.d/init.sh が実行される。

コンテナ初回起動以降に再起動 -> ボリューム(satoruchan_db_data)による値が使用される。

ボリュームによって各々の PC にデータが保存されているため、コンテナを破棄 => 再作成 => 再起動ということをしてもデータは保持されます。ボリュームを消したい場合は以下のコマンドを使います。

`docker compose down --rmi all`

`docker volume ls`

ボリューム名はおそらく satoruchan-server_satoruchan_db_data になっていると思います。

`docker volume rm ボリューム名`

そしてコンテナ再起動

`docker compose up -d`

db の初期状態は container/db/docker-entrypoint-initdb.d/init.sh で定義できます。
