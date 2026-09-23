import type { ActivityMessage } from '@/types/activity';

/**
 * A local send can race an authoritative history refresh. Keep one copy per
 * durable database ID and retain the same chronological ordering as the RPC.
 */
export function appendActivityMessage(
  current: ActivityMessage[],
  incoming: ActivityMessage,
): ActivityMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  byId.set(incoming.id, incoming);
  return [...byId.values()].sort((left, right) => (
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
  ));
}
