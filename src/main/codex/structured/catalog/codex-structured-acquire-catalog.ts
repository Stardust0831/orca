import { codexLaunchProfileCatalogKey } from '../../../../shared/agent-launch/choices/codex-launch-profiles'
import type {
  CodexSessionCatalogAccess,
  CodexStructuredSessionAdapterDeps,
  CodexStructuredLaunch
} from '../session-lifecycle/codex-structured-session-state'
import { agentModelCatalogSessionAccess } from '../../../native-chat/agent-model-catalog/agent-model-catalog-fingerprint'
import { CODEX_STRUCTURED_AGENT } from '../launch/codex-structured-agent-definition'

export function codexAcquireCatalogAccess(
  deps: Pick<
    CodexStructuredSessionAdapterDeps,
    'modelCatalog' | 'readModelCatalog' | 'demandModelCatalog'
  >,
  launch: Pick<CodexStructuredLaunch, 'codexHome' | 'codexLaunchProfile'>,
  sessionId?: string
): CodexSessionCatalogAccess | undefined {
  const access = agentModelCatalogSessionAccess(
    deps.modelCatalog,
    CODEX_STRUCTURED_AGENT,
    launch.codexHome,
    codexLaunchProfileCatalogKey(launch.codexLaunchProfile)
  )
  const demand = deps.demandModelCatalog
  return access && sessionId
    ? {
        ...access,
        ...(deps.readModelCatalog
          ? {
              read: (verifiedOnly?: boolean) =>
                deps.readModelCatalog?.(sessionId, verifiedOnly) ?? null
            }
          : {}),
        ...(demand ? { demand: (legacy?: boolean) => demand(sessionId, legacy) } : {})
      }
    : access
}
