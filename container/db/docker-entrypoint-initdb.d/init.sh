#!/bin/bash
set -e

psql -U postgres satoruchan<<- EOSQL
CREATE TABLE member_list (name text, macaddress text);
CREATE TABLE active_member (macaddress text);

INSERT INTO member_list values ('Tokyo Tanaka','FF:FF:FF:FF:FF:F1');
INSERT INTO member_list values ('Jean-Ken Jony','FF:FF:FF:FF:FF:F2');
INSERT INTO member_list values ('Kamikaze Boy','FF:FF:FF:FF:FF:F3');
INSERT INTO member_list values ('Spear Rib','FF:FF:FF:FF:FF:F4');
INSERT INTO member_list values ('DJ Santa Monica','FF:FF:FF:FF:FF:F5');


INSERT INTO active_member values ('FF:FF:FF:FF:FF:F2');
EOSQL
