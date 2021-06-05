#!/bin/bash

echo コンテナのバーションを入力してください。
read VERSION

docker build -t satoruchan-web:v$VERSION app/.
docker tag satoruchan-web:v$VERSION registry.heroku.com/satoruchan/web
docker push registry.heroku.com/satoruchan/web

heroku container:release web
heroku open