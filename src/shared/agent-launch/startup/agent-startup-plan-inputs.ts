import {
  requireCodexLaunchProfile,
  codexLaunchProfileArgs,
  CODEX_PROFILE_HOME_ENV
} from '../choices/codex-launch-profiles'
import type { GlobalSettings } from '../../global-settings-types'
import type { SessionOptionValue } from '../../native-chat/input/native-chat-session-options'
import type { TuiAgent } from '../catalog/tui-agent'
import {
  agentLaunchPermissionSettings,
  resolveTuiAgentLaunchEnv
} from '../choices/tui-agent-launch-defaults'
import {
  quoteStartupArg,
  resolveStartupShell,
  type AgentStartupShell
} from './tui-agent-startup-shell'
import { terminalSessionOptionInputs } from './tui-agent-launch-command'
import { resolveLocalWindowsAgentStartupShell } from '../../windows-terminal-shell'

/** The settings slice a launch reads; hosts pass their whole `GlobalSettings` row. */
export type AgentStartupSettings = Partial<
  Pick<
    GlobalSettings,
    | 'agentCmdOverrides'
    | 'codexLaunchProfiles'
    | 'agentDefaultArgs'
    | 'agentLaunchChoices'
    | 'agentDefaultEnv'
    | 'agentPermissionDefault'
    | 'agentPermissionOverrides'
    | 'terminalWindowsShell'
  >
>

/** Exactly the `buildAgentStartupPlan` / `buildAgentDraftLaunchPlan` inputs that settings decide. */
export type AgentStartupPlanInputs = {
  agent: TuiAgent
  cmdOverrides: Partial<Record<TuiAgent, string>>
  agentArgs: string | null
  agentEnv: Record<string, string>
  platform: NodeJS.Platform
  shell: AgentStartupShell | undefined
  isRemote: boolean
  sessionOptions?: Record<string, SessionOptionValue>
  sessionOptionsOverrideAgentArgs: boolean
  suppressStartupUpdatePrompt?: boolean
}

/** Share settings-to-launch mapping so hosts cannot omit precedence flags and let configured args override explicit model picks. Keep host, actual PTY shell and launch overrides as parameters. */
export function resolveAgentStartupPlanInputs(args: {
  agent: TuiAgent
  settings: AgentStartupSettings
  platform: NodeJS.Platform
  isRemote: boolean
  /** Replaces the configured default args for this launch; `null` is "no arguments". */
  agentArgs?: string | null
  /** An automation's saved extras, merged over the resolved args; invalid extras throw. */
  extraAgentArgs?: string
  /** Pass the actual PTY shell; omission is valid only when the Settings shell is what the PTY receives. */
  shell: AgentStartupShell | undefined
  sessionOptions?: Readonly<Record<string, SessionOptionValue>> | undefined
  sessionOptionsYieldToAgentArgs?: boolean
  /** Orca types into this launch after start (worker, automation, handoff), not a user. */
  suppressStartupUpdatePrompt?: boolean
}): AgentStartupPlanInputs {
  const { agent, platform, isRemote, sessionOptions } = args
  const profileId = sessionOptions?.launchProfileId
  const profile =
    profileId !== undefined
      ? requireCodexLaunchProfile(
          agent === 'codex' ? args.settings.codexLaunchProfiles : [],
          profileId
        )
      : undefined
  const profileSettings = profile
    ? {
        ...args.settings,
        agentLaunchChoices: undefined,
        agentDefaultArgs: { ...args.settings.agentDefaultArgs, codex: '' }
      }
    : args.settings
  const settings = agentLaunchPermissionSettings(agent, profileSettings, sessionOptions)
  const shell =
    args.shell ??
    resolveLocalWindowsAgentStartupShell({
      platform,
      isRemote,
      terminalWindowsShell: settings.terminalWindowsShell
    })
  const options = terminalSessionOptionInputs({
    agent,
    settings,
    agentArgs: args.agentArgs,
    sessionOptions,
    yieldToAgentArgs: args.sessionOptionsYieldToAgentArgs,
    command: settings.agentCmdOverrides?.[agent],
    extraAgentArgs: args.extraAgentArgs,
    shell: resolveStartupShell(platform, shell)
  })
  const profileArgs = profile
    ? codexLaunchProfileArgs({
        ...profile,
        model: typeof sessionOptions?.model === 'string' ? undefined : profile.model
      })
        .map((arg) => quoteStartupArg(arg, resolveStartupShell(platform, shell)))
        .join(' ')
    : ''
  return {
    agent,
    cmdOverrides: settings.agentCmdOverrides ?? {},
    agentArgs: options.agentArgs ?? null,
    agentEnv: resolveTuiAgentLaunchEnv(agent, settings, platform),
    platform,
    shell,
    isRemote,
    sessionOptionsOverrideAgentArgs: false,
    ...options,
    ...(profile
      ? {
          agentArgs: [options.agentArgs, profileArgs].filter(Boolean).join(' '),
          agentEnv: {
            ...resolveTuiAgentLaunchEnv(agent, settings, platform),
            CODEX_HOME: profile.homePath,
            [CODEX_PROFILE_HOME_ENV]: profile.homePath
          }
        }
      : {}),
    ...(args.suppressStartupUpdatePrompt ? { suppressStartupUpdatePrompt: true } : {})
  }
}
