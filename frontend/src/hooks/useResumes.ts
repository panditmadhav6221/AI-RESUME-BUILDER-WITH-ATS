'use client'

import { useCallback, useEffect, useState } from 'react'
import { resumesApi } from '@/lib/api'
import { getUserId } from '@/lib/user-id'
import type { ResumeData, ResumeMeta } from '@/types'

export interface ActiveResume {
  refId: string | null
  title: string
  targetRole: string
  data: ResumeData | null
  loading: boolean
  error: string
  setData: (data: ResumeData) => void
  reload: () => Promise<void>
}

/**
 * Resolves the resume an AI tool should operate on: the one passed by route
 * (`?id=`) when present, otherwise the most recently updated resume.
 */
export function useActiveResume(resumeId?: string | null): ActiveResume {
  const [refId, setRefId] = useState<string | null>(null)
  const [title, setTitle] = useState('Active Resume')
  const [targetRole, setTargetRole] = useState('')
  const [data, setData] = useState<ResumeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchActive = useCallback(async () => {
    try {
      const userId = getUserId()
      let full: ResumeMeta | null = null
      if (resumeId) {
        full = await resumesApi.get(userId, resumeId)
      } else {
        const list = await resumesApi.list(userId)
        if (list.length > 0) full = list[0].data ? list[0] : await resumesApi.get(userId, list[0].id)
      }
      if (full) {
        setRefId(full.id)
        setTitle(full.title)
        setTargetRole(full.targetRole ?? '')
        setData(full.data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your resume')
    } finally {
      setLoading(false)
    }
  }, [resumeId])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    await fetchActive()
  }, [fetchActive])

  useEffect(() => {
    void fetchActive()
  }, [fetchActive])

  return {
    refId,
    title,
    targetRole,
    data,
    loading,
    error,
    setData,
    reload: load,
  }
}

export function useResumeList() {
  const [resumes, setResumes] = useState<ResumeMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchResumes = useCallback(async () => {
    try {
      setResumes(await resumesApi.list(getUserId()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your resumes')
    } finally {
      setLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setError('')
    await fetchResumes()
  }, [fetchResumes])

  useEffect(() => {
    void fetchResumes()
  }, [fetchResumes])

  return { resumes, loading, error, reload: load }
}
