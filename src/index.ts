import Fastify, { FastifyRequest, FastifyInstance } from 'fastify';
import FastifyPostgres from '@fastify/postgres'
import FastifyRedis from '@fastify/redis'
import fastifyHelmet from '@fastify/helmet';
import fastifyJWT from '@fastify/jwt'
import { Redis } from 'ioredis'
import { AddressInfo } from 'net'
import Pino from 'pino'
import { hashPassword, comparePassword } from './utils.js'
import { PG_URL, REDIS_HOST, REDIS_PORT, PORT, HOST, ENV, ENVIRONMENTS, JWT_SECRET, ROLES } from './config.js'

const log = Pino({ level: 'info' })
const fastify = Fastify({ logger: log })

fastify.register(fastifyHelmet);

fastify.register(fastifyJWT, {
  secret: JWT_SECRET,
  sign: { expiresIn: ENV === ENVIRONMENTS.DEVELOPMENT ? '1h' : '7d' },
})

// Set Postgresql
fastify.register(FastifyPostgres, { connectionString: PG_URL })

// Redis
fastify.register(FastifyRedis, { client: new Redis({ host: REDIS_HOST, port: REDIS_PORT }) })

fastify.get('/health', async (req: any, reply: any) => {
  const pgClient = await fastify.pg.connect()
  try {
    const [{ rowCount }, RedisRes] = await Promise.all([
      pgClient.query('SELECT 1'),
      fastify.redis.ping()
    ])
    if (rowCount !== 1 || RedisRes !== 'PONG') {
      throw new Error('Failed to connect to Postgres OR Redis');
    }
    log.info(`Postgres and Redis are healthy`);
    return reply
      .code(200)
      .type('text/plain')
      .send('OK');
  }
  catch (err) {
    return reply
      .code(500)
      .type('text/plain')
      .send('NOT_OK');
  }
  finally {
    // Release the client immediately after query resolves, or upon error
    pgClient.release()
  }
});

fastify.post('/login', async (req, reply) => {
  const client = await fastify.pg.connect();
  const { email, password } = req.body as { email: string, password: string };
  try {
      const { rows } = await client.query(`SELECT * FROM users WHERE email = '${email}' LIMIT 1`);
      if (rows.length === 0) {
          return reply.code(404).send({ error: 'User not found' });
      }
      const user = rows[0];
      if (!comparePassword(password, user.password)) {
          return reply.code(401).send({ error: 'Invalid password' });
      }
      return reply.code(200).send({ token: fastify.jwt.sign({ id: user.id, role: user.role }) });
  }
  finally {
      // Release the client immediately after query resolves, or upon error
      client.release();
  }
});


// Create user
fastify.post('/users', async (req: any, reply: any) => {
  const client = await fastify.pg.connect()
  const { email, name, password } = req.body;
  const hashedPassword = hashPassword(password);
  try {
    const { rows } = await client.query(`INSERT INTO users (name, email, password, role) VALUES ('${name}', '${email}', '${hashedPassword}', '${ROLES.USER}') RETURNING *`)
    return reply.code(201).send({ user: { name: rows[0].name, email: rows[0].email } });
  } catch (err: any) {
    return reply.code(500).send({ error: err?.message });
  } finally {
    // Release the client immediately after query resolves, or upon error
    client.release()
  }
});

fastify.get('/user/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
  const client = await fastify.pg.connect()
  const { id } = req.params;
  try {
    const { rows } = await client.query(
      `SELECT * FROM users WHERE id = ${id}`,
    )
    // Note: avoid doing expensive computation here, this will block releasing the client
    return rows
  } finally {
    // Release the client immediately after query resolves, or upon error
    client.release()
  }
})

fastify.listen({ port: PORT, host: HOST }, (err: Error | null) => {
  if (err){
    log.error(`[${err?.name}] ${err?.message}`);
    throw err
  }
  const address = fastify.server.address() as AddressInfo | null;
  fastify.log.info(`server listening on ${address}:${address?.port}`);
})