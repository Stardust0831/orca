import type { AgentSessionLaunchEnv } from './agent-session-record'

const MAX_LAUNCH_ENV_ENTRIES = 256
const MAX_LAUNCH_ENV_VALUE_LENGTH = 65_536
const MAX_ID_LENGTH = 512
const isBoundedString = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max

export function isAgentSessionLaunchEnv(value: unknown): value is AgentSessionLaunchEnv {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const entries = Object.entries(value)
  return (
    entries.length <= MAX_LAUNCH_ENV_ENTRIES &&
    entries.every(
      ([key, entry]) =>
        isBoundedString(key, MAX_ID_LENGTH) &&
        typeof entry === 'string' &&
        entry.length <= MAX_LAUNCH_ENV_VALUE_LENGTH
    )
  )
}
