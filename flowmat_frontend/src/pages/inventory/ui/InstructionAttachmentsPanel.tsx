import { useState } from 'react'
import { useInstructionAttachments } from '../../../entities/production/api/useInstructionAttachments'
import { downloadInstructionAttachment, type AttachmentUpload, type InstructionAttachment } from '../../../entities/production/api/instructionAttachments'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import { useProjectMembersQuery } from '../../../entities/project/api/useProjectMembersQuery'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
export function InstructionAttachmentsPanel({projectId,instructionId,editable=false}:{projectId:string;instructionId:string;editable?:boolean}) {
 const {query,upload,remove}=useInstructionAttachments(instructionId)
 const {data:user}=useCurrentUserQuery(),{data:members=[]}=useProjectMembersQuery(projectId)
 const canWrite=editable && members.some(m=>m.userId===user?.userId && m.memberStatus==='active' && (m.projectRole==='owner'||m.projectRole==='editor'))
 const [selected,setSelected]=useState<AttachmentUpload|null>(null)
 const [unconfirmed,setUnconfirmed]=useState(false)
 const [message,setMessage]=useState<string|null>(null)
 const [downloading,setDownloading]=useState<string|null>(null)
 const locked=upload.isPending||remove.isPending||unconfirmed
 async function save() {
  if(!selected||!canWrite) return
  setMessage(null)
  try {await upload.mutateAsync(selected);setSelected(null);setUnconfirmed(false)}
  catch(error) {
   const status=errorStatus(error)
   if(status===null||status>=500) {setUnconfirmed(true);setMessage('Upload is unconfirmed. Retry with the same file to recover the result.')}
   else {setUnconfirmed(false);setMessage(errorMessage(error,'File could not be uploaded.'))}
  }
 }
 async function download(row:InstructionAttachment) {
  setDownloading(row.attachmentId);setMessage(null)
  try {
   const blob=await downloadInstructionAttachment(row),url=URL.createObjectURL(blob)
   const link=document.createElement('a');link.href=url;link.download=row.fileName;document.body.append(link);link.click();link.remove()
   window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  } catch(error) {setMessage(errorMessage(error,'File could not be downloaded.'))}
  finally {setDownloading(null)}
 }
 return <section aria-label="Instruction attachments" style={{marginTop:16,minWidth:0}}>
  <h4>Attachments</h4>
  {query.isLoading&&<p>Loading attachments…</p>}
  {query.isError&&<div role="alert">{errorMessage(query.error,'Attachments could not be loaded.')} <button type="button" onClick={()=>void query.refetch()}>Retry attachment list</button></div>}
  {query.isSuccess&&query.data.length===0&&<p>No attachments.</p>}
  {(query.data??[]).map(row=><div key={row.attachmentId} style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center',marginBottom:8}}>
   <span style={{overflowWrap:'anywhere'}}>{row.fileName} · {Math.ceil(row.sizeBytes/1024)} KB</span>
   <button type="button" aria-label={`Download ${row.fileName}`} disabled={downloading!==null} onClick={()=>void download(row)}>Download</button>
   {canWrite&&<button type="button" aria-label={`Remove ${row.fileName}`} disabled={locked} onClick={()=>remove.mutate(row.attachmentId)}>Remove</button>}
  </div>)}
  {canWrite&&<div style={{display:'grid',gap:8}}>
   <label>Attachment file <input key={selected?.attachmentId??'empty'} type="file" disabled={locked} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv" onChange={event=>{
    const file=event.target.files?.[0];setSelected(file?{attachmentId:crypto.randomUUID(),file}:null);setMessage(null);upload.reset()
   }}/></label>
   {selected&&<span style={{overflowWrap:'anywhere'}}>{selected.file.name}</span>}
   <button type="button" disabled={!selected||upload.isPending||remove.isPending} onClick={()=>void save()}>{unconfirmed?'Retry upload':'Upload attachment'}</button>
  </div>}
  {message&&<p role="alert">{message}</p>}
  {remove.error&&<p role="alert">{errorMessage(remove.error,'Attachment removal could not be confirmed. Retry removal.')}</p>}
 </section>
}
