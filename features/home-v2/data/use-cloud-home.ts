"use client"
import { useMemo, useSyncExternalStore } from "react"
import { cloudHomeModels, createCloudHomeStore, type CloudHomeState } from "./cloud-home"

const INITIAL: CloudHomeState = { result: null, networkError: false, checkedAt: 0 }
export function useCloudHome(chamberId?: string) {
  const store = useMemo(() => createCloudHomeStore(chamberId), [chamberId])
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => INITIAL)
  return { ...cloudHomeModels(state), state, retry: store.refresh }
}
