# 起動手順

`git clone https://github.com/SmartPhoneAppsProject/satoruchan-server.git`

各々の docker 実行環境で init.sh の実行権限がないと docker によりエラーが返される
そのため以下のコマンドで実行権限を付与する必要があります。クローン後に一度実行するだけでいいです。

`chmod a+x container/db/docker-entrypoint-initdb.d/init.sh`

イメージ作ったりしてコンテナ起動

`docker compose up -d`

コンテナ・イメージ・ネットワークを削除

`docker compose down --rmi all`

# 確認

コンテナが動いているか確認。
Status が running になっていれば動いてます。

`docker compose ps`

loclhost:8888 でサーバーが動いているのでアクセスしてみましょう。

`http://localhost:8888`

データベースから値を取得できているか確認

`http://localhost:8888/testdb`

# 起動後ワークフロー

コンテナを起動後、app フォルダ内のソースに変更を加えると、コンテナ内のソースも同期して
変更されます。そのためコンテナに入って作業する必要はなく、いつも通り自身の環境で作業
してください。
注意) コンテナ内のソースが更新されてサーバーがリスタートするまで数秒かかります。

変更が更新されない現象が起きた場合は、以下のコマンドを試してみてください。(これは代用手段のため、
頻繁にこの現象が起きた場合は、ホスト・コンテナ間のソース同期の方法を考える必要があります。)

`docker compose restart`

# デプロイについて

開発では docker-compose を使います。
本番環境では server の環境のみ docker で作成し、それを heroku の docker registory に push & release することでデプロイしています。

- heroku の registory について
  https://devcenter.heroku.com/articles/container-registry-and-runtime#cli

- 本番環境で server の環境のみ用意するメリット
  https://devcenter.heroku.com/ja/articles/local-development-with-docker-compose#pushing-your-containers-to-heroku

注) deploy.sh でデプロイするためには、heroku container にログインしている必要があります。

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
