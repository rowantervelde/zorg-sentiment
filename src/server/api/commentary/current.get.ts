import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const now = new Date().toISOString()

  return {
    status: 'success',
    text: 'Upbeat vibe: citizens are cheering a relief pilot while keeping an eye on pharmacy wait times.',
    createdAt: now,
    sentimentLabel: 'Upbeat',
    includesTopics: ['Premium relief pilot', 'Pharmacy wait times'],
  }
})
