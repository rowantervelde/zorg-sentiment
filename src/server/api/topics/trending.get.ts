import { defineEventHandler } from 'h3'

function buildTimestamp(now: Date, hoursAgo: number): string {
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
}

export default defineEventHandler(() => {
  const now = new Date()
  const firstSeen = buildTimestamp(now, 2)
  const lastSeen = now.toISOString()

  return {
    topics: [
      {
        name: 'Premium relief pilot',
        currentMentions3h: 128,
        prevMentions3h: 64,
        positivePct: 48,
        neutralPct: 27,
        negativePct: 25,
        firstSeen,
        lastSeen,
      },
      {
        name: 'Pharmacy wait times',
        currentMentions3h: 96,
        prevMentions3h: 48,
        positivePct: 18,
        neutralPct: 33,
        negativePct: 49,
        firstSeen,
        lastSeen,
      },
      {
        name: 'Nursing staffing sprint',
        currentMentions3h: 72,
        prevMentions3h: 30,
        positivePct: 41,
        neutralPct: 29,
        negativePct: 30,
        firstSeen,
        lastSeen,
      },
    ],
  }
})
