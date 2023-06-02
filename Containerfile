FROM docker.io/library/node:20

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml .
COPY .yarn .yarn

RUN yarn install --immutable

COPY . .

WORKDIR /app/scripts

ENTRYPOINT [ "node" ]
