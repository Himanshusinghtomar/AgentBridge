import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: numberFromEnv(process.env.PORT, 3030),
  headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  userDataDir: process.env.USER_DATA_DIR || path.join(process.cwd(), 'data', 'sessions'),
  rateLimit: {
    max: numberFromEnv(process.env.RATE_LIMIT_MAX, 200),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
  },
  proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY,
  websocket: {
    snapshotIntervalMs: numberFromEnv(process.env.WS_SNAPSHOT_INTERVAL_MS, 1500)
  },
  redis: {
    enabled: process.env.REDIS_URL !== undefined,
    url: process.env.REDIS_URL
  },
  auth: {
    apiKey: process.env.AGENTBRIDGE_API_KEY,
    jwtSecret: process.env.AGENTBRIDGE_JWT_SECRET
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  }
};
