import { useMutation } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, CanvasAnnotationDto } from '../../../shared/types/api'

export interface CreateCanvasAnnotationInput {
  annotationType: 'shape' | 'freehand' | 'text'
  shapeKind?: 'rectangle' | 'ellipse' | 'diamond'
  posX: number
  posY: number
  width?: number
  height?: number
  rotation?: number
  points?: number[][]
  textContent?: string
  style?: Record<string, unknown>
  zIndex?: string
  groupId?: string | null
}

export interface PatchCanvasAnnotationInput {
  posX?: number
  posY?: number
  width?: number
  height?: number
  rotation?: number
  points?: number[][]
  textContent?: string
  style?: Record<string, unknown>
  zIndex?: string
  groupId?: string | null
  lockedYn?: 'Y' | 'N'
  version?: number
  versionNonce?: number
}

export interface BatchCanvasAnnotationInput {
  items: Array<{
    annotationId: string
    posX?: number
    posY?: number
    width?: number
    height?: number
    rotation?: number
    zIndex?: string
    groupId?: string | null
  }>
}

async function createCanvasAnnotation(workflowId: string, input: CreateCanvasAnnotationInput) {
  const envelope = await httpClient.post<ApiEnvelope<CanvasAnnotationDto>>(`/workflows/${workflowId}/annotations`, input)
  return unwrapApiResponse(envelope)
}

async function patchCanvasAnnotation(workflowId: string, annotationId: string, input: PatchCanvasAnnotationInput) {
  const envelope = await httpClient.patch<ApiEnvelope<CanvasAnnotationDto>>(
    `/workflows/${workflowId}/annotations/${annotationId}`,
    input
  )
  return unwrapApiResponse(envelope)
}

async function deleteCanvasAnnotation(workflowId: string, annotationId: string) {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/workflows/${workflowId}/annotations/${annotationId}`)
  unwrapApiVoidResponse(envelope)
}

async function batchCanvasAnnotations(workflowId: string, input: BatchCanvasAnnotationInput) {
  const envelope = await httpClient.post<ApiEnvelope<CanvasAnnotationDto[]>>(
    `/workflows/${workflowId}/annotations/batch`,
    input
  )
  return unwrapApiResponse(envelope)
}

export function useCreateCanvasAnnotationMutation(workflowId: string) {
  return useMutation({
    mutationFn: (input: CreateCanvasAnnotationInput) => createCanvasAnnotation(workflowId, input),
  })
}

export function usePatchCanvasAnnotationMutation(workflowId: string) {
  return useMutation({
    mutationFn: ({ annotationId, input }: { annotationId: string; input: PatchCanvasAnnotationInput }) =>
      patchCanvasAnnotation(workflowId, annotationId, input),
  })
}

export function useDeleteCanvasAnnotationMutation(workflowId: string) {
  return useMutation({
    mutationFn: (annotationId: string) => deleteCanvasAnnotation(workflowId, annotationId),
  })
}

export function useBatchCanvasAnnotationMutation(workflowId: string) {
  return useMutation({
    mutationFn: (input: BatchCanvasAnnotationInput) => batchCanvasAnnotations(workflowId, input),
  })
}
