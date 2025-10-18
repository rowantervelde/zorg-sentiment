import { ref } from 'vue'

export const ONBOARDING_STORAGE_KEY = 'zs_onboard_v1'
export const ONBOARDING_DISMISSED_STATUS = 'dismissed'
export const ONBOARDING_EXPIRY_DAYS = 90

const EXPIRY_MS = ONBOARDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

interface OnboardingRecord {
  status: typeof ONBOARDING_DISMISSED_STATUS
  timestamp: string
}

export interface UseOnboardingHintOptions {
  storage?: StorageLike | null
  immediate?: boolean
  now?: () => Date
}

export interface UseOnboardingHintReturn {
  isVisible: ReturnType<typeof ref<boolean>>
  dismissedAt: ReturnType<typeof ref<Date | null>>
  dismiss: () => void
  reset: () => void
  refresh: () => void
}

function getStorageInstance(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return null
}

function parseRecord(value: string | null): OnboardingRecord | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<OnboardingRecord>
    if (parsed && parsed.status === ONBOARDING_DISMISSED_STATUS && typeof parsed.timestamp === 'string') {
      return { status: ONBOARDING_DISMISSED_STATUS, timestamp: parsed.timestamp }
    }
  } catch {
    if (value === ONBOARDING_DISMISSED_STATUS) {
      return {
        status: ONBOARDING_DISMISSED_STATUS,
        timestamp: new Date().toISOString(),
      }
    }
  }

  return null
}

function isExpired(record: OnboardingRecord, now: Date): boolean {
  const dismissedAt = Date.parse(record.timestamp)
  if (Number.isNaN(dismissedAt)) {
    return true
  }

  return now.getTime() - dismissedAt >= EXPIRY_MS
}

export function useOnboardingHint(options: UseOnboardingHintOptions = {}): UseOnboardingHintReturn {
  const storage = getStorageInstance(options.storage)
  const nowFn = options.now ?? (() => new Date())

  const isVisibleRef = ref(true)
  const dismissedAtRef = ref<Date | null>(null)

  const refresh = (): void => {
    const now = nowFn()

    if (!storage) {
      isVisibleRef.value = true
      dismissedAtRef.value = null
      return
    }

    const record = parseRecord(storage.getItem(ONBOARDING_STORAGE_KEY))

    if (!record) {
      isVisibleRef.value = true
      dismissedAtRef.value = null
      return
    }

    const expired = isExpired(record, now)

    if (expired) {
      storage.removeItem(ONBOARDING_STORAGE_KEY)
      isVisibleRef.value = true
      dismissedAtRef.value = null
      return
    }

    isVisibleRef.value = false
    dismissedAtRef.value = new Date(record.timestamp)
  }

  const dismiss = (): void => {
    if (storage) {
      const now = nowFn()
      const record: OnboardingRecord = {
        status: ONBOARDING_DISMISSED_STATUS,
        timestamp: now.toISOString(),
      }
      storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(record))
      dismissedAtRef.value = now
    }

    isVisibleRef.value = false
  }

  const reset = (): void => {
    if (storage) {
      storage.removeItem(ONBOARDING_STORAGE_KEY)
    }

    isVisibleRef.value = true
    dismissedAtRef.value = null
  }

  if (options.immediate !== false) {
    refresh()
  }

  return {
    isVisible: isVisibleRef,
    dismissedAt: dismissedAtRef,
    dismiss,
    reset,
    refresh,
  }
}
