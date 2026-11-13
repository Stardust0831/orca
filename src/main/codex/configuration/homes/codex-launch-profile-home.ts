import { stat } from 'node:fs/promises'
import { isAbsolute, join, normalize } from 'node:path'
import {
  requireCodexLaunchProfile,
  type CodexLaunchProfile
} from '../../../../shared/agent-launch/choices/codex-launch-profiles'

export async function resolveCodexLaunchProfileHome(
  profile: CodexLaunchProfile
): Promise<CodexLaunchProfile> {
  if (!isAbsolute(profile.homePath)) {
    throw new Error('The Codex home must be an absolute path on the execution host.')
  }
  const homePath = normalize(profile.homePath)
  try {
    if (
      !(await stat(homePath)).isDirectory() ||
      !(await stat(join(homePath, 'config.toml'))).isFile()
    ) {
      throw new Error('missing configuration')
    }
  } catch {
    throw new Error(
      `Codex profile "${profile.label}" needs an existing home containing config.toml.`
    )
  }
  return { ...profile, homePath }
}

export async function resolveCodexSessionLaunchProfile(
  input: { agent: string; launchProfileId?: string; resumeFrom?: unknown; forkFrom?: unknown },
  profiles: unknown,
  saved: CodexLaunchProfile | undefined
): Promise<CodexLaunchProfile | undefined> {
  if (!input.launchProfileId) {
    return undefined
  }
  if (saved && saved.id !== input.launchProfileId) {
    throw new Error('The conversation already belongs to a different Codex launch profile.')
  }
  if (input.agent !== 'codex' || input.resumeFrom || input.forkFrom) {
    throw new Error('A Codex launch profile can only start a new Codex conversation.')
  }
  return (
    saved ??
    resolveCodexLaunchProfileHome(requireCodexLaunchProfile(profiles, input.launchProfileId))
  )
}
