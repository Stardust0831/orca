import {
  normalizeCodexLaunchProfiles,
  type CodexLaunchProfile
} from '../../../../../../shared/agent-launch/choices/codex-launch-profiles'

export function createCodexLaunchProfileId(
  label: string,
  profiles: readonly CodexLaunchProfile[]
): string {
  const slug =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'profile'
  const base = `codex-${slug}`
  const existingIds = new Set(profiles.map((profile) => profile.id))
  if (!existingIds.has(base)) {
    return base
  }
  for (let index = 2; ; index += 1) {
    const candidate = `${base}-${index}`
    if (!existingIds.has(candidate)) {
      return candidate
    }
  }
}

export function upsertCodexLaunchProfile(
  profiles: readonly CodexLaunchProfile[],
  profile: CodexLaunchProfile
): CodexLaunchProfile[] {
  const normalized = normalizeCodexLaunchProfiles(profiles)
  const index = normalized.findIndex((entry) => entry.id === profile.id)
  return normalizeCodexLaunchProfiles(
    index === -1
      ? [...normalized, profile]
      : [...normalized.slice(0, index), profile, ...normalized.slice(index + 1)]
  )
}
