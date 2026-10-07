import type { Plugin } from 'vite';
import type { IncomingMessage } from 'node:http';
import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { applyAssociationEdits, updateAssociationEdit, validateEdits } from '../src/domain/association-edits';
import type { EditOperation } from '../src/domain/association-edits';
import { validateLibrary, validateSnapshot } from '../src/domain/validation';

/** Local Vite development middleware. Preview/production registers no write API. */
export function musicLinkEditor():Plugin{
  let root='',outDir='',build=false;let writes:Promise<void>=Promise.resolve();
  let editsFile='data/association-edits.json';
  async function readState(){
    const snapshot=validateSnapshot(JSON.parse(await readFile(resolve(root,'public/data/kongying-map.json'),'utf8')));
    const base=validateLibrary(JSON.parse(await readFile(resolve(root,'public/data/music-library.json'),'utf8')),new Set(snapshot.anchors.map(a=>a.id)),snapshot);
    const edits=validateEdits(JSON.parse(await readFile(resolve(root,editsFile),'utf8')),base,snapshot);
    return {snapshot,base,edits,library:applyAssociationEdits(base,snapshot,edits)};
  }
  async function readBody(req:IncomingMessage){
    let size=0;const chunks:Buffer[]=[];
    for await(const chunk of req){const buffer=Buffer.from(chunk);size+=buffer.length;if(size>4096)throw new Error('请求过大');chunks.push(buffer);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  return {
    name:'local-music-link-editor',
    configResolved(config){
      root=config.root;outDir=resolve(root,config.build.outDir);build=config.command==='build';
      const testFile=process.env.GS_MUSIC_TEST_EDITS;
      if(!build&&testFile){
        if(!testFile.startsWith('.local/')||testFile.includes('..'))throw new Error('测试编辑文件必须位于.local');
        editsFile=testFile;
      }
    },
    configureServer(server){
      server.middlewares.use('/__dev/music-links',(req,res)=>{
        const respond=(status:number,value:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
        const host=req.headers.host??'';
        if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin&&req.headers.origin!==`http://${host}`||req.headers['sec-fetch-site']==='cross-site'){respond(403,{message:'仅限本机开发页面编辑'});return;}
        if(req.method!=='GET'&&req.method!=='POST'){respond(405,{message:'不支持此操作'});return;}
        if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json')){respond(415,{message:'请选择页面中的关联编辑操作'});return;}
        void (async()=>{
          if(req.method==='GET'){
            await writes;const {library,edits}=await readState();respond(200,{library,edits});return;
          }
          const input=await readBody(req);
          const operation=writes.then(async()=>{
            const {snapshot,base,edits}=await readState();
            const next=updateAssociationEdit(edits,base,snapshot,input.op as EditOperation,input.trackId,input.anchorId);
            const library=applyAssociationEdits(base,snapshot,next);
            const target=resolve(root,editsFile),temporary=target+'.tmp';
            await mkdir(dirname(target),{recursive:true});
            try{await writeFile(temporary,JSON.stringify(next,null,2)+'\n','utf8');await rename(temporary,target);}
            finally{await unlink(temporary).catch(()=>{});}
            respond(200,{library,edits:next});
          });
          writes=operation.then(()=>{},()=>{});await operation;
        })().catch(()=>respond(400,{message:'关联请求无效或本机记录无法保存；当前记录未被替换。'}));
      });
    },
    async closeBundle(){
      if(!build)return;
      // The built site sees reviewed edits as static data, without editor endpoints.
      const {library}=await readState();
      const target=resolve(outDir,'data/music-library.json');await mkdir(dirname(target),{recursive:true});
      await writeFile(target,JSON.stringify(library,null,2)+'\n','utf8');
    },
  };
}
