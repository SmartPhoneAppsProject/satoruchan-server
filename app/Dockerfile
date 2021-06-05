FROM node:14

WORKDIR /usr/src/app

# http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn

COPY . .
RUN yarn build

ENV NODE_ENV production
CMD [ "node", "dist/index.js" ]