import { Page } from 'playwright';
import { SnapshotTree, SnapshotDelta, SnapshotElement, ElementType } from '@agentbridge/shared';
import { runSnapshot } from '../plugins.js';

const isEqualElement = (a: SnapshotElement, b: SnapshotElement): boolean => {
  return a.text === b.text &&
    a.type === b.type &&
    a.visible === b.visible &&
    a.boundingBox.x === b.boundingBox.x &&
    a.boundingBox.y === b.boundingBox.y &&
    a.boundingBox.width === b.boundingBox.width &&
    a.boundingBox.height === b.boundingBox.height &&
    JSON.stringify(a.attributes) === JSON.stringify(b.attributes);
};

async function collectSnapshot(page: Page): Promise<SnapshotTree> {
  const result = await page.evaluate(() => {
    const hash = (input: string): string => {
      let h = 5381;
      for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
      return 'el_' + (h >>> 0).toString(16);
    };

    const cssPath = (el: Element): string => {
      if (!(el instanceof Element)) return '';
      const path: string[] = [];
      let current: Element | null = el;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const tag = current.tagName.toLowerCase();
        let selector = tag;
        if (current.id) {
          selector += `#${current.id}`;
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

    const isVisible = (el: Element): boolean => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const hasSize = rect.width > 0 && rect.height > 0;
      const visible = style && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
      return hasSize && visible;
    };

    const elements = Array.from(document.querySelectorAll('button, a, input, textarea, select, form'))
      .filter(isVisible)
      .map(el => {
        const path = cssPath(el);
        const id = hash(path);
        (el as HTMLElement).setAttribute('data-agentbridge-id', id);
        const rect = (el as HTMLElement).getBoundingClientRect();
        const tag = el.tagName.toLowerCase();
        const type: ElementType = tag === 'button'
          ? 'button'
          : tag === 'a'
            ? 'link'
            : ['input', 'textarea', 'select'].includes(tag)
              ? 'input'
              : tag === 'form'
                ? 'form'
                : 'other';
        const attributes: Record<string, string | null> = {};
        ['id', 'name', 'type', 'href', 'value', 'placeholder', 'role', 'aria-label'].forEach(attr => {
          attributes[attr] = el.getAttribute(attr);
        });
        return {
          id,
          type,
          text: (el as HTMLElement).innerText?.trim() || (el as HTMLInputElement).value || '',
          attributes,
          boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          visible: true
        } satisfies SnapshotElement;
      });

    return {
      elements,
      createdAt: new Date().toISOString()
    } satisfies SnapshotTree;
  });

  return result;
}

export class SnapshotService {
  private lastSnapshots = new Map<string, SnapshotTree>();

  async snapshot(page: Page, sessionId: string): Promise<{ snapshot: SnapshotTree; delta?: SnapshotDelta }> {
    const current = await collectSnapshot(page);
    const previous = this.lastSnapshots.get(sessionId);
    let delta: SnapshotDelta | undefined;
    if (previous) {
      const prevMap = new Map<string, SnapshotElement>(previous.elements.map((el): [string, SnapshotElement] => [el.id, el]));
      const changed: SnapshotElement[] = [];
      for (const el of current.elements) {
        const prev = prevMap.get(el.id);
        if (!prev || !isEqualElement(prev, el)) {
          changed.push(el);
        }
      }
      const removed = previous.elements
        .filter((el: SnapshotElement) => !current.elements.some((c: SnapshotElement) => c.id === el.id))
        .map((el: SnapshotElement) => el.id);
      delta = { changed, removed, createdAt: current.createdAt };
    }

    this.lastSnapshots.set(sessionId, current);
    await runSnapshot({ sessionId, snapshot: current, delta });
    return { snapshot: current, delta };
  }
}

export const snapshotService = new SnapshotService();
