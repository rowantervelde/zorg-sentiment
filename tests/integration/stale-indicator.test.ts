import { describe, it } from 'vitest'

/** Placeholder failing test to enforce stale indicator behaviour. */
describe('Integration: Stale indicator', () => {
  it('should flag stale data when age exceeds 30 minutes', async () => {
    await simulateStaleIndicator()
  })
})

async function simulateStaleIndicator(): Promise<void> {
  throw new Error('Integration scaffold not implemented. Provide stale indicator test logic.')
}
