# Node APP 1337

## About the stack
- Nodejs application running on node LTS 20.13.1 (check .nvmrc file)
- Postgresql DB
- Redis DB
- Fastify Node.js framework

## Getting Started
1. Make sure to run the build command `npm run build`
2. Make sure you have Postgresql and Redis
3. Env' variable to set
   1. PG_URL - Postgresql connection string, default to `postgres://postgres:password@localhost:5432/node_app`
   2. REDIS_HOST - Redis host, default to localhost
   3. REDIS_PORT - Redis port number, default to 6379
   4. PORT - server port number, will default to 8080 if not set (always check code for latest)
4. How to run migration `npm run db:migrate`
5. You made migrations changes in the `schema.prisma` file and you want to sync the migration file make sure to run `npm run db:migrate-dev`
