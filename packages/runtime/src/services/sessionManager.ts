import { chromium, Page, ChromiumBrowserContext } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { SessionOptions, SessionRecord } from '@agentbridge/shared';
import { logger } from '../utils/logger.js';
import { runSessionCreate } from '../plugins.js';

export interface ManagedSession {
  id: string;
  context: ChromiumBrowserContext;
  page: Page;
  record: SessionRecord;
}

class SessionManager {
  private sessions = new Map<string, ManagedSession>();

  async createSession(options?: SessionOptions): Promise<ManagedSession> {
    const id = uuidv4();
    const mode = options?.headless === false ? 'headful' : (config.headless ? 'headless' : 'headful');
    const userDataDir = path.join(config.userDataDir, id);
    await fs.promises.mkdir(userDataDir, { recursive: true });

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: mode === 'headless',
      viewport: { width: 1280, height: 800 },
      proxy: options?.proxy ? { server: options.proxy } : undefined,
    });

    const page = context.pages()[0] ?? await context.newPage();
    page.setDefaultTimeout(15000);

    const record: SessionRecord = {
      id,
      mode,
      createdAt: new Date().toISOString(),
      userDataDir
    };

    const managed: ManagedSession = { id, context, page, record };
    this.sessions.set(id, managed);
    logger.info({ id, mode }, 'session created');
    await runSessionCreate({ session: record });
    return managed;
  }

  getSession(sessionId: string): ManagedSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): SessionRecord[] {
    return Array.from(this.sessions.values()).map(s => s.record);
  }

  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.context.close();
    this.sessions.delete(sessionId);
    logger.info({ sessionId }, 'session destroyed');
  }

  async disposeAll(): Promise<void> {
    await Promise.allSettled(Array.from(this.sessions.keys()).map(id => this.destroySession(id)));
  }
}

export const sessionManager = new SessionManager();
