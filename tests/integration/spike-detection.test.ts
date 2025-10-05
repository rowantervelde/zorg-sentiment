import { describe, it } from 'vitest'

/** Placeholder failing test to validate spike detection UI marker. */
describe('Integration: Spike detection marker', () => {
  it('should highlight spike when score deviates >= 2 std dev from prior 12 hours', async () => {
    await assertSpikeFlag()
  })
})

async function assertSpikeFlag(): Promise<void> {
  throw new Error('Integration scaffold not implemented. Add spike detection test implementation.')
}
