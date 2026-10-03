/** Account + generation checks prevent late responses and stale callbacks from
 * changing the visible profile. This is a UI boundary; database RLS still owns
 * authorization. A -> B -> A must invalidate the first A request too. */
export function createProfileRequestScope() {
  let accountId: string | null = null;
  let generation = 0;
  return {
    switchAccount(nextAccountId: string | null) {
      accountId = nextAccountId;
      generation += 1;
    },
    begin(expectedAccountId: string) {
      if (accountId !== expectedAccountId) return null;
      return { accountId, generation: ++generation };
    },
    isCurrent(request: { accountId: string; generation: number }) {
      return request.accountId === accountId && request.generation === generation;
    },
    invalidate() { generation += 1; },
  };
}
