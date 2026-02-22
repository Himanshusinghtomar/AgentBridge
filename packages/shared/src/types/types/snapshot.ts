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
