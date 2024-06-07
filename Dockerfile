FROM node:20.13.1

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

ENV PORT 8080

EXPOSE 8080

# TODO: remove this, DB migrations should run as part of the ci/cd pipeline
# and not as part of the container startup
# REMOVE THIS LINE BEFORE PRODUCTION
RUN npm run db:migrate

CMD [ "node", "dist/index.js" ]