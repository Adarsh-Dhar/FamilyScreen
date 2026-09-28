import { getEndpoint } from "./endpoints";
import { guardedCall as coreGuardedCall, type GuardedCallResult } from "../sports/core/guarded-call";
import type { AgentCallLog } from "./types";

export type { GuardedCallResult };

/**
 * Football wrapper over the shared core guardedCall. One cache/quota/client implementation for
 * every sport — football just fills in its own endpoint definition.
 */
export async function guardedCall<T = unknown>(
  endpointKey: string,
  params: Record<string, string | number | boolean | undefined> = {},
  opts: { isLivePollCall?: boolean; log?: AgentCallLog[] } = {},
): Promise<GuardedCallResult<T>> {
  const def = getEndpoint(endpointKey);
  return coreGuardedCall<T>("football", endpointKey, def.path, def, params, opts);
}
