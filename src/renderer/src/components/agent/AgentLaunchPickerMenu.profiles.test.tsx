// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AgentLaunchPickerMenu } from './AgentLaunchPickerMenu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  agentPickerLaunchInputs,
  expandCodexPickerEntries,
  type AgentPickerEntry
} from '../../../../shared/agent-launch/picker/agent-launch-picker'
vi.mock('@/hooks/useShortcutLabel', () => ({ useOptionalShortcutLabel: () => null }))
afterEach(cleanup)
it.each([false, true])(
  'clicks both native Codex entries with their own profile (setup disabled: %s)',
  (setupDisabled) => {
    const base: AgentPickerEntry = {
      agent: 'codex',
      label: 'Codex',
      rows: [{ agent: 'codex', kind: 'chat' }],
      surfaces: ['chat', 'terminal'],
      defaultSurface: 'chat',
      terminal: {},
      structured: {},
      catalog: { origin: 'unknown' },
      codexLaunchProfiles: [
        { id: 'codex-a', label: 'Codex A', homePath: '/homes/shared', modelProvider: 'work' },
        { id: 'codex-b', label: 'Codex B', homePath: '/homes/shared', modelProvider: 'personal' }
      ]
    }
    const launches: unknown[] = []
    render(
      <DropdownMenu open modal={false}>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <AgentLaunchPickerMenu
            entries={expandCodexPickerEntries([base])}
            setupDisabled={setupDisabled}
            runLaunch={(row, draft, entry) => {
              launches.push({
                agent: row.agent,
                profile:
                  draft && agentPickerLaunchInputs(draft, entry).sessionOptions?.launchProfileId
              })
              return false
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    )
    fireEvent.click(screen.getByText('Codex A'))
    fireEvent.click(screen.getByText('Codex B'))
    expect(launches).toEqual([
      { agent: 'codex', profile: 'codex-a' },
      { agent: 'codex', profile: 'codex-b' }
    ])
  }
)
