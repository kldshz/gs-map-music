import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import type { PlaybackResource } from '../src/domain/contracts';

const run=promisify(execFile);
const types:Record<string,string>={mp3:'audio/mpeg',flac:'audio/flac',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'};
interface DatabaseTrack {id:string;title:string;neteaseId:string|null;encryptedId:string|null}
const unavailable=(reason:'missing'|'authentication'|'permission'|'network',message:string):PlaybackResource=>({status:'unavailable',reason,message});

/** Only the documented CLI is used. No signature extraction, URL interception or hidden API. */
export function officialAvailability(records:unknown,id:string):PlaybackResource{
  if(!Array.isArray(records))return unavailable('network','网易接口没有返回有效歌曲信息，请重试');
  const song=records.find(r=>r&&String(r.originalId)===id);
  if(!song)return unavailable('missing','网易查询没有找到当前数据库歌曲；未替换为同名歌曲');
  if(song.visible===false||song.playFlag===false)return unavailable('permission','网易当前应用不允许播放此曲，且未找到本机音频');
  return unavailable('permission','网易个人 CLI 不提供浏览器播放 URL；请使用本机音频或开通网页播放 API');
}

export function parseRange(header:string|undefined,size:number):{start:number;end:number}|null|false{
  if(!header)return null;
  const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2]))return false;
  let start:number,end:number;
  if(!match[1]){const length=Number(match[2]);if(!Number.isSafeInteger(length)||length<=0)return false;start=Math.max(0,size-length);end=size-1;}
  else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return false;
  return {start,end};
}

/** Localhost-only backend, registered for dev and production preview. Static hosting has no credentials. */
export function playbackService():Plugin{
  let root='';
  const cached=new Map<string,{until:number,result:PlaybackResource}>(),pending=new Map<string,Promise<PlaybackResource>>();
  const dbCached=new Map<string,{until:number,track:DatabaseTrack}>();
  let rateBlockedUntil=0;
  async function databaseTrack(id:string):Promise<DatabaseTrack|null>{
    if(!/^netease:\d{1,20}$/.test(id))return null;
    const existing=dbCached.get(id);if(existing&&existing.until>Date.now())return existing.track;
    const mysql=process.env.MYSQL_BIN??'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe';
    // Whitelist against current Genshin library before accessing the database or provider.
    const library=JSON.parse(await readFile(resolve(root,'public/data/music-library.json'),'utf8'));
    if(!library.tracks.some((t:{id:string})=>t.id===id))return null;
    const {stdout}=await run(mysql,[`--defaults-extra-file=${resolve(root,'.local/mysql-client.ini')}`,'--default-character-set=utf8mb4','--batch','--raw','--skip-column-names','-e',
      `USE gs_map_music; SELECT JSON_OBJECT('id',id,'title',title,'neteaseId',netease_id,'encryptedId',netease_encrypted_id) FROM music_track WHERE id='${id}';`],{windowsHide:true,maxBuffer:1024*1024,timeout:10000});
    if(!stdout.trim())return null;const track=JSON.parse(stdout.trim()) as DatabaseTrack;
    if(track.id!==id||!track.neteaseId||!/^\d{1,20}$/.test(track.neteaseId))return null;
    dbCached.set(id,{until:Date.now()+60000,track});return track;
  }
  async function localFile(track:DatabaseTrack){
    for(const [ext,mime] of Object.entries(types)){
      const path=resolve(root,'resources/local/audio/genshin',`${track.neteaseId}.${ext}`);
      try{const info=await stat(path);if(info.isFile()&&info.size>0)return {path,mime,size:info.size};}
      catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    }
    return null;
  }
  async function resolveTrack(track:DatabaseTrack):Promise<PlaybackResource>{
    if(await localFile(track))return {status:'ready',provider:'local',url:`/api/playback/audio?trackId=${encodeURIComponent(track.id)}`,expiresAt:null,preview:false};
    const saved=cached.get(track.id);if(saved&&saved.until>Date.now())return saved.result;
    if(rateBlockedUntil>Date.now())return unavailable('permission','网易接口请求总量超限，请稍后再试；没有替代音源');
    const inFlight=pending.get(track.id);if(inFlight)return inFlight;
    const task=(async()=>{
      try{
        const cli=resolve(process.env.LOCALAPPDATA??'', 'gs-map-music-tools/node_modules/@music163/ncm-cli/dist/index.js');
        const {stdout}=await run(process.execPath,[cli,'search','song','--keyword',track.title,'--userInput','用户请求在原神地图音乐播放器中核实数据库歌曲播放权限，仅检索此原神曲目，不上传或下载'],{windowsHide:true,maxBuffer:8*1024*1024,timeout:20000});
        if(/请求总量超限/.test(stdout)){rateBlockedUntil=Date.now()+60000;return unavailable('permission','网易接口请求总量超限，请稍后再试');}
        const value=JSON.parse(stdout);
        let result:PlaybackResource;
        if(/未登录|请先登录|未授权|授权过期/.test(String(value.message??'')))result=unavailable('authentication','网易登录已失效，请在本机官方 CLI 重新登录');
        else if(value.code!==200)result=unavailable('permission','网易接口未允许此请求，请检查本机应用权限');
        else result=officialAvailability(value.data?.records,track.neteaseId!);
        cached.set(track.id,{until:Date.now()+5*60000,result});return result;
      }catch{return unavailable('network','网易官方 CLI 请求失败，请检查本机配置、登录与网络');}
      finally{pending.delete(track.id);}
    })();pending.set(track.id,task);return task;
  }
  const json=(res:ServerResponse,status:number,value:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
  async function handle(req:IncomingMessage,res:ServerResponse){
    const host=req.headers.host??'';
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||req.headers.origin&&req.headers.origin!==`http://${host}`||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{message:'仅限本机页面'});return;}
    if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{message:'仅支持读取'});return;}
    const url=new URL(req.url??'/',`http://${host}`),id=url.searchParams.get('trackId')??'';
    if(!['/resolve','/audio'].includes(url.pathname)){json(res,404,{message:'不存在的播放入口'});return;}
    try{
      const track=await databaseTrack(id);
      if(!track){json(res,200,unavailable('missing','数据库中没有对应原神歌曲或网易 ID'));return;}
      if(url.pathname==='/resolve'){json(res,200,await resolveTrack(track));return;}
      const file=await localFile(track);if(!file){json(res,404,{message:'本机音频不存在或已移除'});return;}
      const range=parseRange(req.headers.range,file.size);
      if(range===false){res.statusCode=416;res.setHeader('Content-Range',`bytes */${file.size}`);res.end();return;}
      const start=range?.start??0,end=range?.end??file.size-1;
      res.statusCode=range?206:200;res.setHeader('Content-Type',file.mime);res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
      if(range)res.setHeader('Content-Range',`bytes ${start}-${end}/${file.size}`);
      if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(file.path,{start,end});res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
    }catch{json(res,503,unavailable('network','本机数据库或音频服务读取失败，请检查 MySQL 与本机配置'));}
  }
  return {name:'local-playback-service',configResolved(config){root=config.root;},configureServer(server){server.middlewares.use('/api/playback',(req,res)=>void handle(req,res));},configurePreviewServer(server){server.middlewares.use('/api/playback',(req,res)=>void handle(req,res));}};
}
