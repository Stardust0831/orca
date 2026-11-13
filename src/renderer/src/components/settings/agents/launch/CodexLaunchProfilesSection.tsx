import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SettingsGroup } from '../../section-layout/SettingsGroup'
import { SettingsRow } from '../../form-controls/SettingsFormControls'
import { useTranslate } from '@/i18n/use-translate'
import type { CodexLaunchProfile } from '../../../../../../shared/agent-launch/choices/codex-launch-profiles'
import { createCodexLaunchProfileId, upsertCodexLaunchProfile } from './codex-launch-profile-draft'

type Props = {
  profiles: readonly CodexLaunchProfile[]
  save: (profiles: CodexLaunchProfile[]) => Promise<void>
}

export function CodexLaunchProfilesSection({ profiles, save }: Props): React.JSX.Element {
  const t = useTranslate()
  const [editing, setEditing] = useState<CodexLaunchProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const persist = async (next: CodexLaunchProfile[]) => {
    setBusy(true)
    setError(null)
    try {
      await save(next)
      setEditing(null)
    } catch {
      setError(
        t('settings.agents.codexProfiles.saveFailed', 'Profiles could not be saved. Try again.')
      )
    } finally {
      setBusy(false)
    }
  }
  const field = (
    key: 'label' | 'homePath' | 'modelProvider' | 'model',
    label: string,
    placeholder?: string
  ) => (
    <SettingsRow
      label={label}
      labelId={`${id}-${key}`}
      control={
        <Input
          aria-labelledby={`${id}-${key}`}
          value={editing?.[key] ?? ''}
          placeholder={placeholder}
          disabled={busy}
          maxLength={key === 'homePath' ? 4096 : key === 'label' ? 80 : key === 'model' ? 256 : 128}
          onChange={(event) =>
            setEditing((value) => (value ? { ...value, [key]: event.target.value } : value))
          }
        />
      }
    />
  )
  return (
    <SettingsGroup
      title={t('settings.agents.codexProfiles.title', 'Codex profiles')}
      description={t(
        'settings.agents.codexProfiles.description',
        'Choose a Codex home and one of its providers for each named entry. Several entries can share the same home.'
      )}
      action={
        <Button
          size="xs"
          variant="outline"
          disabled={busy || profiles.length >= 64}
          onClick={() => {
            setError(null)
            setEditing({ id: '', label: '', homePath: '', modelProvider: '' })
          }}
        >
          {t('settings.agents.codexProfiles.add', 'Add profile')}
        </Button>
      }
    >
      {profiles.map((profile) => (
        <SettingsRow
          key={profile.id}
          label={profile.label}
          description={`${profile.modelProvider} · ${profile.homePath}`}
          control={
            <div className="flex gap-1">
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError(null)
                  setEditing({ ...profile })
                }}
              >
                {t('settings.agents.codexProfiles.edit', 'Edit')}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() => void persist(profiles.filter((entry) => entry.id !== profile.id))}
              >
                {t('settings.agents.codexProfiles.remove', 'Remove')}
              </Button>
            </div>
          }
        />
      ))}
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (
              !editing.label.trim() ||
              !editing.homePath.trim() ||
              !editing.modelProvider.trim()
            ) {
              return
            }
            const profile = {
              ...editing,
              id: editing.id || createCodexLaunchProfileId(editing.label, profiles),
              model: editing.model?.trim() || undefined
            }
            void persist(upsertCodexLaunchProfile(profiles, profile))
          }}
        >
          {field('label', t('settings.agents.codexProfiles.name', 'Name'))}
          {field('homePath', t('settings.agents.codexProfiles.home', 'Codex home'))}
          {field(
            'modelProvider',
            t('settings.agents.codexProfiles.provider', 'Provider ID'),
            'openai'
          )}
          {field('model', t('settings.agents.codexProfiles.model', 'Model (optional)'))}
          <p className="py-2 text-settings-detail text-muted-foreground">
            {t(
              'settings.agents.codexProfiles.providerHint',
              'Use an absolute home path on this host and a provider ID from its config.toml. Credentials stay in the Codex configuration or host environment.'
            )}
          </p>
          <div className="flex justify-end gap-2 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              {t('settings.agents.codexProfiles.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                busy ||
                !editing.label.trim() ||
                !editing.homePath.trim() ||
                !editing.modelProvider.trim()
              }
            >
              {busy
                ? t('settings.agents.codexProfiles.saving', 'Saving…')
                : t('settings.agents.codexProfiles.save', 'Save')}
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="py-3 text-settings-detail text-destructive">
          {error}
        </p>
      ) : null}
    </SettingsGroup>
  )
}
