type RefreshHandler = () => Promise<void>;

let dashboardRefreshHandler: RefreshHandler | null = null;
let lastDashboardSyncAt = 0;

const groupDetailRefreshHandlers = new Map<string, RefreshHandler>();
const lastGroupSyncAt = new Map<string, number>();

export function registerDashboardRefresh(handler: RefreshHandler) {
  dashboardRefreshHandler = handler;
  return () => {
    if (dashboardRefreshHandler === handler) {
      dashboardRefreshHandler = null;
    }
  };
}

export async function awaitDashboardRefresh(): Promise<void> {
  if (dashboardRefreshHandler) {
    await dashboardRefreshHandler();
    lastDashboardSyncAt = Date.now();
  }
}

export function wasDashboardJustSynced(withinMs = 2500): boolean {
  return Date.now() - lastDashboardSyncAt < withinMs;
}

export function registerGroupDetailRefresh(
  groupId: string,
  handler: RefreshHandler,
) {
  groupDetailRefreshHandlers.set(groupId, handler);
  return () => {
    if (groupDetailRefreshHandlers.get(groupId) === handler) {
      groupDetailRefreshHandlers.delete(groupId);
    }
  };
}

export async function awaitGroupDetailRefresh(groupId: string): Promise<void> {
  const handler = groupDetailRefreshHandlers.get(groupId);
  if (handler) {
    await handler();
    lastGroupSyncAt.set(groupId, Date.now());
  }
}

export function wasGroupJustSynced(groupId: string, withinMs = 2500): boolean {
  const ts = lastGroupSyncAt.get(groupId) ?? 0;
  return Date.now() - ts < withinMs;
}
