import Fastify, { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import FastifyRedis from '@fastify/redis'
import fastifyHelmet from '@fastify/helmet';
import fastifyJWT from '@fastify/jwt'
import { Redis } from 'ioredis'
import { AddressInfo } from 'net'
import Pino from 'pino'
import { hashPassword, comparePassword } from './utils.js'
import { PrismaClient } from '@prisma/client'
import { REDIS_HOST, REDIS_PORT, PORT, HOST, ENV, ENVIRONMENTS, JWT_SECRET } from './config.js'

declare global {
  interface BigInt {
    toJSON(): number | string;
  }
}
BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

const log = Pino({ level: 'info' })
const prisma = new PrismaClient({
  log: ENV === ENVIRONMENTS.PRODUCTION ? ['error', 'warn'] : ['query', 'error', 'info', 'warn']
});
const fastify = Fastify({ logger: log })

fastify.register(fastifyHelmet);

fastify.register(fastifyJWT, {
  secret: JWT_SECRET,
  sign: { expiresIn: ENV === ENVIRONMENTS.DEVELOPMENT ? '1h' : '7d' },
  formatUser: (user: any) => ({ id: user.id, role: user.role })
})


declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

fastify.decorate("authenticate", async function(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send('INVALID_CREDENTIALS')
  }
})
// Redis
fastify.register(FastifyRedis, { client: new Redis({ host: REDIS_HOST, port: REDIS_PORT }) })

fastify.get('/heartbeat', async (req: any, reply: any) => {
  return reply.code(200).type('text/plain').send('OK');
});

fastify.get('/health', async (req: any, reply: any) => {
  try {
    const [pgLive, RedisRes] = await Promise.all([
      await prisma.$queryRaw`SELECT 1`,
      fastify.redis.ping()
    ])
    if (!pgLive || RedisRes !== 'PONG') {
      throw new Error('Failed to connect to Postgres OR Redis');
    }
    log.info(`Postgres and Redis are healthy`);
    return reply.code(200).type('text/plain').send('OK');
  }
  catch (err) {
    return reply.code(500).type('text/plain').send('NOT_OK');
  }
});

fastify.post('/login', async (req, reply) => {
  const { email, password } = req.body as { email: string, password: string };
  try {
    const user = await prisma.users.findFirst({ where: { email } });
    if (!user) {
        return reply.code(404).send({ error: 'User not found' });
    }
    if (!comparePassword(password, (user as { password: string }).password)) {
        return reply.code(401).send({ error: 'Invalid password' });
    }
    return reply.code(200).send({ token: fastify.jwt.sign({ id: user.id, role: user.role }) });
  }
  catch (err: any) {
    return reply.code(500).send({ error: err?.message ?? 'Unable to find user by email' });
  }
});

// Create user
fastify.post('/users', async (req: any, reply: any) => {

  const { email, name, phone } = req.body;
  try {
    const hashedPassword = await hashPassword(req.body.password);
    const result = await prisma.users.create({
      data: {
        email,
        phone,
        name,
        password: hashedPassword,
      }
    });
    const { password, ...restOfObj } = result;
    return reply.code(201).send(restOfObj);
  } catch (err: any) {
    if (err.code === '23505') {
      return reply.code(409).send({ error: 'User already exists' });
    }
    req.log.error(err?.message);
    return reply.code(500).send({ error: err?.message });
  }
});

const getUserByIdHandler = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = req.params;
  try {
    log.info(`Fetching user with id: ${id}, by user: ${(req.user as { id: number }).id} / ${(req.user as { role: string }).role}`)
    const {password, ...restOfObj} = await prisma.users.findFirst({ where: { id: parseInt(id) } }) as any;
    return reply.code(200).send(restOfObj)
  } catch (err: any) {
    return reply.code(500).send({ error: err?.message });
  }
};

type RouteGenericInterface = {
  Params: { id: string };
};

fastify.get<RouteGenericInterface>('/users/:id', { onRequest: [fastify.authenticate] }, getUserByIdHandler);

fastify.get('/me', async (req: any, reply: any) => {
  // get user id from jwt
  const { id } = req.user;
  try {
    const { password, ...restOfObj } = await prisma.users.findFirst({ where: { id } }) as any;
    return reply.code(200).send(restOfObj);
  } catch (err: any) {
    return reply.code(500).send({ error: err?.message });
  }
})

/**
 * Store key-value pair in Redis
 */
fastify.post('/cache', async (req: any, reply: any) => {
  const { key, value } = req.body;
  await fastify.redis.set(key, value);
  return reply.code(201).send({ key, value });
})

fastify.get('/cache/:key', async (req: any, reply: any) => {
  const { key } = req.params;
  const value = await fastify.redis.get(key);
  return reply.code(200).send({ key, value });
})

fastify.listen({ port: PORT, host: HOST }, (err: Error | null) => {
  if (err){
    log.error(`[${err?.name}] ${err?.message}`);
    throw err
  }
  const { address, port } = fastify.server.address() as AddressInfo | null || { address: HOST, port: PORT };
  fastify.log.info(`server listening on ${address}:${port}`);
})