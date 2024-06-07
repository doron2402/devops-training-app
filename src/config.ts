export const PG_URL = process.env.PG_URL || 'postgres://postgres:password@localhost:5432/node_app';
export const PORT = Number(process.env.PORT || 8080);
export const HOST = process.env.HOST || '0.0.0.0';
export const REDIS_HOST = process.env.REDIS_URL || 'localhost';
export const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
export const JWT_SECRET = process.env.JWT_SECRET || 'shhhhhhhh...this is a super secret';

// ENV
export const ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
  TEST: 'test',
}

export const ENV = process.env.NODE_ENV || process.env.ENV || 'development'; // development, staging, production, test


export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
}