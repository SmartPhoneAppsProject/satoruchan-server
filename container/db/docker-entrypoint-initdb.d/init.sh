#!/bin/bash
set -e

psql -U postgres satoruchan<<- EOSQL
CREATE TABLE member_list (name text, macaddress text);
CREATE TABLE active_member (macaddress text);

INSERT INTO member_list values ('ギア','FF:FF:FF:FF:FF:F1');
INSERT INTO member_list values ('スタヌ','FF:FF:FF:FF:FF:F2');


INSERT INTO active_member values ('FF:FF:FF:FF:FF:F2');
EOSQL
