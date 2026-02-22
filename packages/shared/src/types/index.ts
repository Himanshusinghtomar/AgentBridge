export type ElementType = 'button' | 'link' | 'input' | 'form' | 'other';

export interface SnapshotElement {
  id: string;
  type: ElementType;
  text: string;
  attributes: Record<string, string | null>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
}

export interface SnapshotTree {
  elements: SnapshotElement[];
  createdAt: string;
}

export interface SnapshotDelta {
  changed: SnapshotElement[];
  removed: string[];
  createdAt: string;
}

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

export interface AgentBridgePlugin {
  name: string;
  onSessionCreate?(ctx: { session: SessionRecord }): void | Promise<void>;
  onSnapshot?(payload: { sessionId: string; snapshot: SnapshotTree; delta?: SnapshotDelta }): void | Promise<void>;
  onAction?(payload: { sessionId: string; action: ActionPayload }): void | Promise<void>;
}
