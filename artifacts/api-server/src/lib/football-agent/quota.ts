import { getQuotaManager as getCoreQuotaManager } from "../sports/core/quota";
import type { QuotaManager as CoreQuotaManager } from "../sports/core/quota";

// Backward compatibility: use the new core quota manager
export function getQuotaManager(): CoreQuotaManager {
  return getCoreQuotaManager("football");
}
