#!/bin/bash
set -e

psql -U postgres satoruchan<<- EOSQL
CREATE TABLE member_list (name text, macaddress text);
CREATE TABLE active_member (macaddress text);

INSERT INTO member_list values ('TokyoTanaka','FF:FF:FF:FF:FF:F1');
INSERT INTO member_list values ('JankenJony','FF:FF:FF:FF:FF:F2');
INSERT INTO member_list values ('KamikazeBoy','FF:FF:FF:FF:FF:F3');
INSERT INTO member_list values ('SpairLib','FF:FF:FF:FF:FF:F4');
INSERT INTO member_list values ('DJ-Santamonica','FF:FF:FF:FF:FF:F5');


INSERT INTO active_member values ('FF:FF:FF:FF:FF:F2');
EOSQL
