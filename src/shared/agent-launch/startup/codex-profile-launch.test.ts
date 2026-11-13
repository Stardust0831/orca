import { expect, it } from 'vitest'
import { resolveAgentStartupPlanInputs } from './agent-startup-plan-inputs'
import { buildAgentStartupPlan } from './tui-agent-startup'
import { buildAgentResumeStartupPlan } from './tui-agent-resume-startup'
import { tokenizeStartupCommand, type AgentStartupShell } from './tui-agent-startup-shell'
import { resolveResumeLaunchRecipe } from '../choices/resume-launch-recipe'

it.each<{ platform: NodeJS.Platform; shell: AgentStartupShell }>([
  { platform: 'linux', shell: 'posix' },
  { platform: 'darwin', shell: 'posix' },
  { platform: 'win32', shell: 'powershell' },
  { platform: 'win32', shell: 'cmd' }
])(
  'keeps a named home/provider through a saved terminal resume on $platform/$shell',
  ({ platform, shell }) => {
    const homePath = platform === 'win32' ? 'C:\\Users\\Test User\\codex' : '/homes/test user/codex'
    const plan = buildAgentStartupPlan({
      ...resolveAgentStartupPlanInputs({
        agent: 'codex',
        platform,
        shell,
        isRemote: false,
        settings: {
          agentPermissionDefault: 'own',
          agentDefaultArgs: { codex: '-m wrong-model' },
          agentLaunchChoices: { codex: { model: 'another-wrong-model' } },
          agentDefaultEnv: { codex: { CODEX_HOME: '/wrong-home' } },
          codexLaunchProfiles: [
            { id: 'work', label: 'Work', homePath, modelProvider: 'work', model: 'work-model' }
          ]
        },
        sessionOptions: { launchProfileId: 'work' }
      }),
      prompt: '',
      allowEmptyPromptLaunch: true
    })!
    expect(plan.env?.CODEX_HOME).toBe(homePath)
    expect(plan.launchCommand).not.toContain('wrong-model')
    const providerSession = { key: 'session_id', id: 'saved-thread' } as const
    const saved = JSON.parse(JSON.stringify(plan.launchConfig))
    const resumed = buildAgentResumeStartupPlan({
      agent: 'codex',
      platform,
      shell,
      providerSession,
      cmdOverrides: {},
      ...resolveResumeLaunchRecipe(saved, 'codex', providerSession)
    })!
    expect(resumed.env?.CODEX_HOME).toBe(homePath)
    expect(tokenizeStartupCommand(resumed.launchCommand, shell)).toMatchObject({
      ok: true,
      tokens: expect.arrayContaining([
        'resume',
        'saved-thread',
        '-c',
        'model_provider="work"',
        '-m',
        'work-model'
      ])
    })
  }
)

it('refuses a removed profile instead of launching the default account', () => {
  expect(() =>
    resolveAgentStartupPlanInputs({
      agent: 'codex',
      platform: 'linux',
      shell: 'posix',
      isRemote: false,
      settings: { codexLaunchProfiles: [] },
      sessionOptions: { launchProfileId: 'removed' }
    })
  ).toThrow('profile is unavailable')
})
