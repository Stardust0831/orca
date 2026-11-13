import { expect, it } from 'vitest'
import { AgentModelCatalogStore } from './agent-model-catalog-store'
import { createAgentModelCatalogService } from './agent-model-catalog-service'
import type { AgentModelCatalogProbe } from './agent-model-catalog-discovery'
import { agentSessionRecordFixture } from '../testing/agent-session-record-test-fixture'
import { agentSessionConversationView } from '../../../shared/agent-session/lifecycle/agent-session-conversation-view'

it('probes the saved provider and keeps catalogs separate within one home', async () => {
  const store = new AgentModelCatalogStore()
  const records = ['work', 'personal'].map((modelProvider) =>
    agentSessionRecordFixture({
      sessionId: modelProvider,
      provider: 'codex',
      accountHome: { variable: 'CODEX_HOME', path: '/same/home' },
      codexLaunchProfile: {
        id: modelProvider,
        label: modelProvider,
        modelProvider,
        homePath: '/same/home'
      }
    })
  )
  const probe: AgentModelCatalogProbe = Object.assign(
    async () => ({ origin: 'probe' as const, models: [] }),
    {
      resolve: async (_home, _cwd, _lookup, _operation, _launchDirectory, profile) => ({
        identity: profile?.modelProvider ?? 'default',
        run: async () => ({
          origin: 'probe' as const,
          complete: true,
          models: [
            {
              id: `${profile?.modelProvider ?? 'wrong-default'}-model`,
              label: 'Model',
              isDefault: true,
              efforts: []
            }
          ]
        })
      })
    }
  )
  const service = createAgentModelCatalogService({
    store,
    getConversation: (id) => {
      const record = records.find((r) => r.sessionId === id)
      return record ? agentSessionConversationView(record) : undefined
    },
    getRecord: (id) => records.find((r) => r.sessionId === id),
    drivesRecord: () => true,
    recordWorkspacePath: async () => '/project',
    probes: { codex: probe },
    resolveAccountHome: async () => ({ variable: 'CODEX_HOME', path: '/same/home' })
  })
  try {
    expect(
      await service.read({ agent: 'codex', sessionId: 'work', waitForListing: true })
    ).toMatchObject({
      origin: 'probe',
      models: [{ id: 'work-model' }]
    })
    expect(
      await service.read({ agent: 'codex', sessionId: 'personal', waitForListing: true })
    ).toMatchObject({
      origin: 'probe',
      models: [{ id: 'personal-model' }]
    })
  } finally {
    await service.stop()
  }
})
