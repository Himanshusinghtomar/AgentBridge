import { SnapshotDelta, SnapshotTree } from './snapshot.js';

type BrowserMode = 'headless' | 'headful';

export interface SessionOptions {
  headless?: boolean;
  proxy?: string;
}

export interface SessionRecord {
  id: string;
  mode: BrowserMode;
  createdAt: string;
  userDataDir: string;
}

export type ActionKind = 'click' | 'type' | 'navigate' | 'extract' | 'screenshot';

export interface ActionPayload {
  sessionId: string;
  action: ActionKind;
  elementId?: string;
  value?: string;
}

export interface NavigatePayload {
  sessionId: string;
  url: string;
}

export interface SnapshotResult {
  snapshot: SnapshotTree;
  delta?: SnapshotDelta;
}

export interface SessionState {
  record: SessionRecord;
  lastSnapshot?: SnapshotTree;
}
