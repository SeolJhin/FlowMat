import {test,expect} from '@playwright/test'
import {answerAuth,mockedLogin,ok} from './support/mockApi'
for(const mode of ['lost-reply','viewer','released'] as const) test(`instruction attachments ${mode}`,async({page})=>{
 const projectId='attachment-project', instructionId='instruction-fixture'
 const item={itemId:'product',projectId,itemCode:'GUARD',itemName:'Guard',itemStatus:'active',unitId:'unit-ea',lotManageYn:'N'}
 const wi={instructionId,projectId,itemId:item.itemId,itemCode:item.itemCode,itemName:item.itemName,revisionNo:1,status:mode==='released'?'released':'draft',title:'Guard setup',body:null,documentUrl:null,blocksFinish:false,steps:[],releasedBy:null,releasedAt:null,updatedAt:null}
 const rows:{attachmentId:string,instructionId:string,fileName:string,contentType:string,sizeBytes:number,sha256:string,createdBy:string,createdAt:null}[]=[]
 const uploads:{path:string,body:Buffer}[]=[]
 if(mode!=='lost-reply') rows.push({attachmentId:'00000000-0000-4000-8000-000000000001',instructionId,fileName:'Guard.txt',contentType:'text/plain',sizeBytes:5,sha256:'a'.repeat(64),createdBy:'demo-owner',createdAt:null})
 await page.route(/^https?:\/\/[^/]+\/api\//,async route=>{
  const request=route.request(),path=new URL(request.url()).pathname
  if(await answerAuth(route,path)) return
  if(path.endsWith('/download')) return route.fulfill({contentType:'text/plain',body:'Guard',headers:{'Content-Disposition':'attachment; filename="Guard.txt"'}})
  if(path.includes('/attachments')) {
   if(request.method()==='GET') return ok(route,rows)
   if(request.method()==='PUT') {
    uploads.push({path,body:request.postDataBuffer()!})
    if(!rows.length) rows.push({attachmentId:path.split('/').at(-1)!,instructionId,fileName:'Guard.txt',contentType:'text/plain',sizeBytes:5,sha256:'a'.repeat(64),createdBy:'demo-owner',createdAt:null})
    if(uploads.length===1) return route.abort('failed')
    return ok(route,rows[0])
   }
   if(request.method()==='DELETE') { rows.splice(0);return ok(route,null) }
  }
  if(request.method()!=='GET') throw new Error(`Unexpected write ${path}`)
  if(path==='/api/project-members') return ok(route,[{projectMemberId:'membership',projectId,userId:'demo-owner',projectRole:mode==='viewer'?'viewer':'owner',memberStatus:'active'}])
  if(path==='/api/items') return ok(route,[item])
  if(path==='/api/work-instructions') return ok(route,[wi])
  if(path==='/api/projects') return ok(route,[{projectId,projectName:'Attachment fixture',projectStatus:'active'}])
  return ok(route,[])
 })
 await mockedLogin(page);await page.goto(`/projects/${projectId}/inventory?tab=instructions`)
 await page.getByRole('combobox',{name:'Product',exact:true}).selectOption('product')
 const panel=page.getByRole('region',{name:'Instruction attachments'})
 await expect(panel).toBeVisible()
 if(mode==='lost-reply') {
  await panel.getByLabel('Attachment file').setInputFiles({name:'Guard.txt',mimeType:'text/plain',buffer:Buffer.from('Guard')})
  await panel.getByRole('button',{name:'Upload attachment',exact:true}).click()
  await expect(panel.getByText(/Upload is unconfirmed/)).toBeVisible()
  await expect(panel.getByLabel('Attachment file')).toBeDisabled()
  await panel.getByRole('button',{name:'Retry upload',exact:true}).click()
  await expect(panel.getByRole('button',{name:'Download Guard.txt'})).toBeVisible()
  expect(uploads).toHaveLength(2);expect(uploads[1].path).toBe(uploads[0].path)
  expect(uploads[0].body.toString()).toContain('Guard');expect(uploads[1].body.toString()).toContain('Guard')
  await panel.getByRole('button',{name:'Remove Guard.txt'}).click()
  await expect(panel.getByText('No attachments.')).toBeVisible()
 } else {
  await expect(panel.getByLabel('Attachment file')).toHaveCount(0)
  await expect(panel.getByRole('button',{name:'Remove Guard.txt'})).toHaveCount(0)
 }
 if(rows.length) { const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Download Guard.txt'}).click();expect((await download).suggestedFilename()).toBe('Guard.txt')}
})
