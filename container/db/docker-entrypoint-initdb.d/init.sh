#!/bin/bash
set -e

psql -U postgres satoruchan<<- EOSQL
CREATE TABLE member_list (name text, macaddress text);

INSERT INTO member_list values ('ギア','FF:FF:FF:FF:FF:FF');
INSERT INTO member_list values ('スタヌ','FF:FF:FF:FF:FF:FF');
EOSQL
