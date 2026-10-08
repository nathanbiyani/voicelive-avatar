import { describe, expect, it, vi } from 'vitest'
import { recordEvaluation } from './evaluations'

describe('evaluation telemetry', () => {
  it('posts only the metadata contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await recordEvaluation({
      criterion: 'complex_names',
      passed: true,
      wordErrorRate: 0.1,
      durationMs: 1250,
      terminologyPackId: 'general-radiography',
      namePackId: 'multicultural-names-v1',
      accentProfileId: 'en-IN',
      noiseSuppressionEnabled: true,
      ...({ transcript: 'must not be sent', expectedNames: ['must not be sent'], audio: 'must not be sent' } as object),
    })
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(fetchMock).toHaveBeenCalledWith('/api/evaluations', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(options.body as string)).toEqual({
      criterion: 'complex_names',
      passed: true,
      wordErrorRate: 0.1,
      durationMs: 1250,
      terminologyPackId: 'general-radiography',
      namePackId: 'multicultural-names-v1',
      accentProfileId: 'en-IN',
      noiseSuppressionEnabled: true,
    })
  })
})
