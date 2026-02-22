import { AgentBridgePlugin, SnapshotDelta, SnapshotTree, ActionPayload } from '@agentbridge/shared';

const plugins: AgentBridgePlugin[] = [];

export const registerPlugin = (plugin: AgentBridgePlugin) => {
  if (!plugin?.name) throw new Error('Plugin must have a name');
  plugins.push(plugin);
};

export const runSessionCreate = async (ctx: { session: any }) => {
  for (const plugin of plugins) {
    if (plugin.onSessionCreate) await plugin.onSessionCreate(ctx);
  }
};

export const runSnapshot = async (payload: { sessionId: string; snapshot: SnapshotTree; delta?: SnapshotDelta }) => {
  for (const plugin of plugins) {
    if (plugin.onSnapshot) await plugin.onSnapshot(payload);
  }
};

export const runAction = async (payload: { sessionId: string; action: ActionPayload }) => {
  for (const plugin of plugins) {
    if (plugin.onAction) await plugin.onAction(payload);
  }
};

export const getPlugins = () => plugins;
