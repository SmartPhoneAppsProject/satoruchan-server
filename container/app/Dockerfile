FROM node:14

WORKDIR /usr/src/app

# http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
COPY ../../app/package.json ./
COPY ../../app/yarn.lock ./

RUN yarn

# COPY ../../app .
# RUN yarn build