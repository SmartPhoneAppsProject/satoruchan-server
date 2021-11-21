#!/bin/bash

heroku container:login

echo "現在のリリースバージョンは以下の通りです。"
echo "================"
heroku releases:info -a satoruchan | grep "Release"
echo "================\n"

echo "> コンテナのバージョンを入力してください。\n"

echo "[ヒント1] 通常、コンテナのバージョンは次のリリースバージョンになります。"
echo "[ヒント2] バージョンは整数で入力してください\n"

read VERSION

echo "create contaier & push heroku registory"
docker build -t satoruchan-web:v$VERSION app/.
docker tag satoruchan-web:v$VERSION registry.heroku.com/satoruchan/web
docker push registry.heroku.com/satoruchan/web

heroku container:release web -a satoruchan
heroku open -a satoruchan
