import { API_URL, ApiError, apiFetch, getAccessToken } from '@/lib/api'
import type { DemGrid } from '@/lib/dem-fetcher'

export type SurveyState = 'queued' | 'running' | 'done' | 'failed'

export interface SurveyStats {
  photos_total: number
  photos_used: number
  dense_points: number
  measured_pct: number
  resolution_m: number
  width_m: number
  depth_m: number
  gps_fit_m: number
  flying_height_m: number
  ground_relief_m: number
  tallest_objects_m: number
  lowest_ground_m: number
  seconds: number
}

export interface DroneSurvey {
  id: string
  site_id: string
  label: string
  photo_count: number
  state: SurveyState
  stage: string
  progress: number
  message: string
  error: string
  stats: SurveyStats | null
  created_at: string
  completed_at: string | null
}

export interface SurveyModel {
  ground: DemGrid
  surface: DemGrid
  cloud: { points: [number, number, number][]; colors: [number, number, number][]; cameras: [number, number, number][] }
  stats: SurveyStats
}

export const STAGE_LABEL: Record<string, string> = {
  queued: 'Waiting in line',
  photos: 'Reading photos',
  features: 'Finding features',
  matching: 'Matching photos',
  cameras: 'Solving camera positions',
  dense: 'Measuring depth (dense stereo)',
  surface: 'Building the surface',
  ground: 'Removing trees and boulders',
  ortho: 'Making the orthophoto',
  done: 'Finished',
}

/** Sites the current user may upload a survey for (their organisation's own). */
export function listUploadableSites() {
  return apiFetch<{ id: string; name: string }[]>('/drone-surveys/sites')
}

export function listSurveys(siteId?: string) {
  return apiFetch<DroneSurvey[]>(`/drone-surveys/${siteId ? `?site_id=${encodeURIComponent(siteId)}` : ''}`)
}

export function getSurvey(id: string) {
  return apiFetch<DroneSurvey>(`/drone-surveys/${id}`)
}

export function getSurveyModel(id: string) {
  return apiFetch<SurveyModel>(`/drone-surveys/${id}/model`)
}

export function deleteSurvey(id: string) {
  return apiFetch<void>(`/drone-surveys/${id}`, { method: 'DELETE' })
}

/** The orthophoto as an object URL (the endpoint needs the auth header, so
 *  an <img src> or texture loader can't fetch it directly). */
export async function fetchOrthoUrl(id: string): Promise<string> {
  const res = await fetch(`${API_URL}/drone-surveys/${id}/ortho.jpg`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  })
  if (!res.ok) throw new ApiError(res.status, 'Orthophoto not available', null)
  return URL.createObjectURL(await res.blob())
}

/** Upload with progress (fetch can't report upload progress; XHR can). */
export function uploadSurvey(
  siteId: string, label: string, photos: Blob[], names: string[], onProgress: (fraction: number) => void,
): Promise<DroneSurvey> {
  const form = new FormData()
  form.append('site_id', siteId)
  form.append('label', label)
  photos.forEach((p, i) => form.append('files', p, names[i]))
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/drone-surveys/`)
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken() ?? ''}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let body: unknown = null
      try { body = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as DroneSurvey)
      else {
        const detail = (body as { detail?: unknown } | null)?.detail
        reject(new ApiError(xhr.status, typeof detail === 'string' ? detail : `Upload failed (${xhr.status})`, body))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, 'Network error during upload. Check your connection and try again.', null))
    xhr.send(form)
  })
}
