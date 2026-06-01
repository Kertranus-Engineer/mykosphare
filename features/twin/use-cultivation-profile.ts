"use client"

import { useState, useCallback, useEffect } from "react"
import {
  createCultivationProfile,
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  type CultivationProfile,
} from "@/lib/twin/cultivation-profile"

interface UseCultivationProfileResult {
  profiles: CultivationProfile[]
  activeProfile: CultivationProfile | null
  setActiveProfile: (id: string) => void
  addProfile: (profile: Omit<CultivationProfile, "id">) => CultivationProfile
  removeProfile: (id: string) => void
  updateProfile: (id: string, updates: Partial<CultivationProfile>) => void
}

export function useCultivationProfile(): UseCultivationProfileResult {
  const [profiles, setProfiles] = useState<CultivationProfile[]>(() => loadProfiles())
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveProfileId())

  useEffect(() => {
    saveProfiles(profiles)
  }, [profiles])

  const activeProfile = activeId
    ? profiles.find((p) => p.id === activeId) ?? (profiles.length > 0 ? profiles[0] : null)
    : profiles.length > 0 ? profiles[0] : null

  const setActiveProfile = useCallback((id: string) => {
    setActiveId(id)
    saveActiveProfileId(id)
  }, [])

  const addProfile = useCallback(
    (input: Omit<CultivationProfile, "id">) => {
      const profile = createCultivationProfile(
        input.name,
        input.species,
        input.inoculationDate,
        input.strain,
        input.expectedHarvestDate,
        input.notes,
      )
      setProfiles((prev) => [...prev, profile])
      if (!activeId) {
        setActiveId(profile.id)
        saveActiveProfileId(profile.id)
      }
      return profile
    },
    [activeId],
  )

  const removeProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    if (activeId === id) {
      const nextActiveId = null
      setActiveId(nextActiveId)
      saveActiveProfileId(nextActiveId)
    }
  }, [activeId])

  const updateProfile = useCallback((id: string, updates: Partial<CultivationProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    )
  }, [])

  return {
    profiles,
    activeProfile,
    setActiveProfile,
    addProfile,
    removeProfile,
    updateProfile,
  }
}
