import type { EvaluationMetadata } from '../types/config'

export async function recordEvaluation(metadata: EvaluationMetadata): Promise<void> {
  const payload: EvaluationMetadata = {
    criterion: metadata.criterion,
    ...(metadata.passed === undefined ? {} : { passed: metadata.passed }),
    ...(metadata.wordErrorRate === undefined ? {} : { wordErrorRate: metadata.wordErrorRate }),
    ...(metadata.durationMs === undefined ? {} : { durationMs: metadata.durationMs }),
    terminologyPackId: metadata.terminologyPackId,
    namePackId: metadata.namePackId,
    accentProfileId: metadata.accentProfileId,
    noiseSuppressionEnabled: metadata.noiseSuppressionEnabled,
  }
  const response = await fetch('/api/evaluations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Evaluation result was not accepted (${response.status})`)
}
