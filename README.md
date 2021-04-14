# 起動手順

`git clone https://github.com/SmartPhoneAppsProject/satoruchan-server.git`

`chmod a+x container/db/docker-entrypoint-initdb.d/init.sh`

`docker compose up -d`

`docker compose down --rmi all`

# 確認・起動後ワークフロー

`hogehoge`

# 起動に困った時は

`docker compose ps`

`docker compose logs`
