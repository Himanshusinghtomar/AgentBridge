import jwt from 'jsonwebtoken';
import { FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { BadRequestError } from './errors.js';

export const sanitizeInput = (payload: any): any => {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === 'string') {
    return payload
      .replace(/<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gi, '')
      .replace(/[\u0000-\u001f\u007f]+/g, '')
      .trim();
  }
  if (Array.isArray(payload)) return payload.map(sanitizeInput);
  if (typeof payload === 'object') {
    return Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, sanitizeInput(v)]));
  }
  return payload;
};

export const authenticateRequest = (request: FastifyRequest) => {
  const apiKey = config.auth.apiKey;
  const jwtSecret = config.auth.jwtSecret;

  if (!apiKey && !jwtSecret) return; // auth disabled

  const headerKey = request.headers['x-api-key'];
  const authHeader = request.headers.authorization;

  if (apiKey && headerKey === apiKey) return;

  if (jwtSecret && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    try {
      jwt.verify(token, jwtSecret);
      return;
    } catch (err) {
      throw new BadRequestError('Invalid token');
    }
  }

  throw new BadRequestError('Unauthorized');
};
