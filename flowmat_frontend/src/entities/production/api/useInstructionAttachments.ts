import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'
import { readAttachments, uploadInstructionAttachment, type AttachmentUpload, type InstructionAttachment } from './instructionAttachments'
export function useInstructionAttachments(instructionId:string) {
 const client=useQueryClient(), key=['instruction-attachments',instructionId]
 const base=`/work-instructions/${encodeURIComponent(instructionId)}/attachments`
 const query=useQuery({queryKey:key,enabled:!!instructionId,queryFn:async()=>readAttachments(unwrapApiResponse(await httpClient.get<ApiEnvelope<unknown>>(base)),instructionId)})
 const upload=useMutation({retry:false,mutationFn:(input:AttachmentUpload)=>uploadInstructionAttachment(instructionId,input),onSuccess:async row=>{
  await client.cancelQueries({queryKey:key})
  client.setQueryData<InstructionAttachment[]>(key,previous=>[...(previous??[]).filter(a=>a.attachmentId!==row.attachmentId),row])
  await client.invalidateQueries({queryKey:key})
 }})
 const remove=useMutation({retry:false,mutationFn:async(id:string)=>unwrapApiVoidResponse(await httpClient.delete<ApiEnvelope<null>>(`${base}/${encodeURIComponent(id)}`)),onSuccess:async(_,id)=>{
  await client.cancelQueries({queryKey:key})
  client.setQueryData<InstructionAttachment[]>(key,previous=>(previous??[]).filter(a=>a.attachmentId!==id))
  await client.invalidateQueries({queryKey:key})
 }})
 return {query,upload,remove}
}
