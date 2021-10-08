#!/bin/bash

heroku container: login

echo コンテナのバーションを入力してください。
read VERSION

echo "create contaier & push heroku registory"
docker build -t satoruchan-web:v$VERSION app/.
docker tag satoruchan-web:v$VERSION registry.heroku.com/satoruchan/web
docker push registry.heroku.com/satoruchan/web

heroku container:release web -a satoruchan
heroku open -a satoruchan
