import { SnapshotResult, ActionPayload, SnapshotTree } from '@agentbridge/shared';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket, RawData } from 'ws';
import { fetch } from 'undici';
import type { RequestInit } from 'undici';

export class AgentBridgeError extends Error {}
export class SessionNotFoundError extends AgentBridgeError {}
export class ActionFailedError extends AgentBridgeError {}

export interface AgentBridgeOptions {
  endpoint?: string;
  timeout?: number;
  apiKey?: string;
  jwt?: string;
  retries?: number;
}

export class AgentBridge {
  private endpoint: string;
  private timeout: number;
  private apiKey?: string;
  private jwt?: string;
  private retries: number;

  constructor(opts?: AgentBridgeOptions) {
    this.endpoint = opts?.endpoint ?? 'http://localhost:3030';
    this.timeout = opts?.timeout ?? 10000;
    this.apiKey = opts?.apiKey;
    this.jwt = opts?.jwt;
    this.retries = opts?.retries ?? 3;
  }

  private headers() {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    if (this.jwt) headers['authorization'] = `Bearer ${this.jwt}`;
    return headers;
  }

  private async request<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(`${this.endpoint}${path}`, {
        ...init,
        headers: { ...this.headers(), ...(init.headers as any) },
        signal: controller.signal
      });
      if (res.status === 404) throw new SessionNotFoundError('Session not found');
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ActionFailedError(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      const json = await res.json() as T;
      return json;
    } catch (err: any) {
      if (attempt < this.retries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 4000);
        await delay(backoff);
        return this.request<T>(path, init, attempt + 1);
      }
      if (err.name === 'AbortError') {
        throw new AgentBridgeError('Request timed out');
      }
      if (err instanceof AgentBridgeError) throw err;
      throw new AgentBridgeError(err?.message || 'Unknown error');
    } finally {
      clearTimeout(timeout);
    }
  }

  async createSession(params?: { headless?: boolean; proxy?: string }) {
    return this.request<{ sessionId: string; record: any }>('/session', {
      method: 'POST',
      body: JSON.stringify(params || {})
    });
  }

  async destroySession(sessionId: string) {
    await this.request<void>(`/session/${sessionId}`, { method: 'DELETE' });
  }

  async navigate(sessionId: string, url: string) {
    return this.request<SnapshotResult>('/navigate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, url })
    });
  }

  async snapshot(sessionId: string) {
    return this.request<SnapshotResult>(`/snapshot/${sessionId}`, { method: 'GET' });
  }

  async click(sessionId: string, elementId: string) {
    return this.action({ sessionId, action: 'click', elementId });
  }

  async type(sessionId: string, elementId: string, value: string) {
    return this.action({ sessionId, action: 'type', elementId, value });
  }

  async extract(sessionId: string) {
    return this.action({ sessionId, action: 'extract' });
  }

  async screenshot(sessionId: string) {
    return this.action({ sessionId, action: 'screenshot' });
  }

  async action(payload: ActionPayload) {
    return this.request('/action', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  subscribe(sessionId: string, onMessage: (data: { snapshot?: SnapshotTree; delta?: any; console?: string }) => void) {
    const wsUrl = this.endpoint.replace(/^http/, 'ws') + `/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl, {
      headers: this.headers()
    });
    ws.on('message', (data: RawData) => {
      try {
        const parsed = JSON.parse(data.toString());
        onMessage(parsed);
      } catch (err) {
        // ignore parse errors
      }
    });
    return () => ws.close();
  }
}

export default AgentBridge;
