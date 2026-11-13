export const CODEX_PROFILE_HOME_ENV = 'ORCA_CODEX_PROFILE_HOME'

export type CodexLaunchProfileSettings = { codexLaunchProfiles?: CodexLaunchProfile[] }

export type CodexLaunchProfile = {
  id: string
  label: string
  homePath: string
  modelProvider: string
  model?: string
}

export function isCodexLaunchProfileId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)
}

function text(value: unknown, limit: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= limit &&
    Array.from(value).every(
      (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127
    )
  )
}

export function isCodexLaunchProfile(value: unknown): value is CodexLaunchProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  return (
    'id' in value &&
    isCodexLaunchProfileId(value.id) &&
    'label' in value &&
    text(value.label, 80) &&
    'homePath' in value &&
    text(value.homePath, 4096) &&
    'modelProvider' in value &&
    text(value.modelProvider, 128) &&
    (!('model' in value) || value.model === undefined || text(value.model, 256))
  )
}

export function normalizeCodexLaunchProfiles(value: unknown): CodexLaunchProfile[] {
  if (!Array.isArray(value)) {
    return []
  }
  const profiles: CodexLaunchProfile[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isCodexLaunchProfile(entry) || seen.has(entry.id)) {
      continue
    }
    seen.add(entry.id)
    profiles.push({
      id: entry.id,
      label: entry.label.trim(),
      homePath: entry.homePath.trim(),
      modelProvider: entry.modelProvider.trim(),
      ...(entry.model ? { model: entry.model.trim() } : {})
    })
  }
  return profiles.slice(0, 64)
}

export function requireCodexLaunchProfile(value: unknown, id: unknown): CodexLaunchProfile {
  const profile = normalizeCodexLaunchProfiles(value).find((entry) => entry.id === id)
  if (!profile) {
    throw new Error(
      'The selected Codex launch profile is unavailable. Choose a profile in Settings → Agents.'
    )
  }
  return profile
}

export function codexLaunchProfileArgs(profile: CodexLaunchProfile): string[] {
  return [
    '-c',
    `model_provider=${JSON.stringify(profile.modelProvider)}`,
    ...(profile.model ? ['-m', profile.model] : [])
  ]
}

export function codexLaunchProfileCatalogKey(
  profile: CodexLaunchProfile | undefined
): string | undefined {
  return profile
    ? JSON.stringify([profile.id, profile.modelProvider, profile.model ?? null])
    : undefined
}

export function codexLaunchProfileSeedOptions(
  profile: CodexLaunchProfile | undefined,
  defaults: Record<string, string> | undefined
): Record<string, string> | undefined {
  return profile
    ? {
        ...(defaults?.permissionMode ? { permissionMode: defaults.permissionMode } : {}),
        ...(profile.model ? { model: profile.model } : {})
      }
    : defaults
}
