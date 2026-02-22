import { ManagedSession } from './sessionManager.js';
import { snapshotService } from './snapshotService.js';
import { ActionPayload, NavigatePayload } from '@agentbridge/shared';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { runAction } from '../plugins.js';
import { config } from '../config.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ensureStableIds = async (session: ManagedSession) => {
  await session.page.evaluate(() => {
    const hash = (input: string): string => {
      let h = 5381;
      for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
      return 'el_' + (h >>> 0).toString(16);
    };
    const cssPath = (el: Element): string => {
      const path: string[] = [];
      let current: Element | null = el;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const tag = current.tagName.toLowerCase();
        let selector = tag;
        if ((current as HTMLElement).id) {
          selector += `#${(current as HTMLElement).id}`;
          path.unshift(selector);
          break;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      return path.join('>');
    };

    document.querySelectorAll('button, a, input, textarea, select, form').forEach(el => {
      const id = hash(cssPath(el));
      (el as HTMLElement).setAttribute('data-agentbridge-id', id);
    });
  });
};

export class ActionService {
  async navigate(session: ManagedSession, payload: NavigatePayload) {
    await session.page.goto(payload.url, { waitUntil: 'load', timeout: 20000 });
    return snapshotService.snapshot(session.page, session.id);
  }

  async perform(session: ManagedSession, payload: ActionPayload) {
    const { action } = payload;
    let result: any;
    switch (action) {
      case 'navigate':
        if (!payload.value) throw new BadRequestError('url required');
        result = await this.navigate(session, { sessionId: payload.sessionId, url: payload.value });
        break;
      case 'click':
        if (!payload.elementId) throw new BadRequestError('elementId required');
        await ensureStableIds(session);
        await session.page.waitForSelector(`[data-agentbridge-id="${payload.elementId}"]`, { state: 'visible', timeout: 10000 });
        const target = await session.page.$(`[data-agentbridge-id="${payload.elementId}"]`);
        if (!target) throw new NotFoundError('element not found');
        await target.click({ delay: 10 });
        result = await snapshotService.snapshot(session.page, session.id);
        break;
      case 'type':
        if (!payload.elementId) throw new BadRequestError('elementId required');
        await ensureStableIds(session);
        await session.page.waitForSelector(`[data-agentbridge-id="${payload.elementId}"]`, { state: 'visible', timeout: 10000 });
        const input = await session.page.$(`[data-agentbridge-id="${payload.elementId}"]`);
        if (!input) throw new NotFoundError('element not found');
        await input.fill(payload.value ?? '');
        result = await snapshotService.snapshot(session.page, session.id);
        break;
      case 'extract':
        result = await snapshotService.snapshot(session.page, session.id);
        break;
      case 'screenshot': {
        const buffer = await session.page.screenshot({ fullPage: true });
        const file = path.join(config.userDataDir, `${session.id}_latest.png`);
        await fs.writeFile(file, buffer);
        result = { screenshotPath: file };
        break;
      }
      default:
        throw new BadRequestError('Unsupported action');
    }
    await runAction({ sessionId: payload.sessionId, action: payload });
    return result;
  }
}

export const actionService = new ActionService();
