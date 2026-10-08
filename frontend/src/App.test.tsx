import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const config = {
  defaultModel: 'gpt-realtime',
  defaultVoice: 'en-US-AvaMultilingualNeural',
  telemetryEnabled: true,
  voiceLiveConfigured: true,
  terminologyPacks: [{ id: 'none', name: 'None', description: '' }, { id: 'general-radiography', name: 'General radiography', description: '' }],
  namePacks: [{ id: 'none', name: 'None', description: '' }, { id: 'multicultural-names-v1', name: 'Multicultural synthetic names', description: '', phrases: ['private expected name'] }],
  accentProfiles: [{ id: 'auto', name: 'Automatic language detection', locale: 'auto', description: '' }, { id: 'en-IN', name: 'English (India)', locale: 'en-IN', description: '' }],
}

afterEach(() => vi.restoreAllMocks())

describe('core evaluation UI', () => {
  it('renders a conversation-first experience without exposing the workbook matrix', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => config }))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Talk with your imaging assistant' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Live conversation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start voice session' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'All 47 evaluation criteria' })).not.toBeInTheDocument()
    expect(screen.queryByText('private expected name')).not.toBeInTheDocument()
  })

  it('opens session settings on demand and applies a preset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => config }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Session settings' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply Complex names preset' }))
    expect(await screen.findByText('Multicultural synthetic names', { selector: 'dd' })).toBeInTheDocument()
  })

  it('keeps advanced transcript controls in the settings drawer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => config }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByText('Audio & turn detection'))
    await user.click(screen.getByRole('checkbox', { name: 'Developer transcript' }))
    expect(screen.getByRole('log', { name: 'Developer transcript' })).toBeInTheDocument()
  })
})
