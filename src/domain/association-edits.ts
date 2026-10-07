import type { MapSnapshot, MusicLibrary, TrackAnchor } from './contracts';
import { validateLibrary } from './validation';

export interface AssociationEdit {trackId:string;anchorId:string;action:'add'|'remove';updatedAt:string}
export interface AssociationEdits {schemaVersion:1;edits:AssociationEdit[]}
export type EditOperation = 'add'|'remove'|'restore';
const key=(trackId:string,anchorId:string)=>JSON.stringify([trackId,anchorId]);

export function validateEdits(value:unknown,base:MusicLibrary,snapshot:MapSnapshot):AssociationEdits{
  const v=value as AssociationEdits;
  if(!v||v.schemaVersion!==1||!Array.isArray(v.edits)||v.edits.length>50000)throw new Error('手动关联记录格式错误');
  const tracks=new Set(base.tracks.map(t=>t.id)),anchors=new Set(snapshot.anchors.map(a=>a.id)),seen=new Set<string>();
  const edits=v.edits.map(e=>{
    if(!e||!tracks.has(e.trackId)||!anchors.has(e.anchorId)||!['add','remove'].includes(e.action)||typeof e.updatedAt!=='string'||!Number.isFinite(Date.parse(e.updatedAt)))throw new Error('手动关联记录有无效引用或字段');
    const pair=key(e.trackId,e.anchorId);if(seen.has(pair))throw new Error('手动关联记录重复');seen.add(pair);
    return {trackId:e.trackId,anchorId:e.anchorId,action:e.action,updatedAt:e.updatedAt};
  });
  return {schemaVersion:1,edits};
}

export function applyAssociationEdits(base:MusicLibrary,snapshot:MapSnapshot,raw:unknown):MusicLibrary{
  const edits=validateEdits(raw,base,snapshot);
  const links=new Map(base.associations.map(a=>[key(a.trackId,a.anchorId),a]));
  for(const e of edits.edits){
    const pair=key(e.trackId,e.anchorId);
    if(e.action==='remove'){links.delete(pair);continue;}
    if(links.has(pair))continue; // Adding an existing relation never replaces source evidence.
    const track=base.tracks.find(t=>t.id===e.trackId)!,anchor=snapshot.anchors.find(a=>a.id===e.anchorId)!;
    const association:TrackAnchor={id:`manual:${track.id}:${anchor.sourceId}`,trackId:e.trackId,anchorId:e.anchorId,evidenceStatus:'pending',matchType:'manual',
      evidenceNote:`用户在开发环境手动挂载（${e.updatedAt}）。出处：${track.sceneInfo?.originText??'未知'}。点位原说明：${anchor.content}。人工整理关系，实际音乐触发待核实。`,sourceUrl:track.sceneInfo?.wikiSourceUrl??track.sourceUrl};
    links.set(pair,association);
  }
  return validateLibrary({...base,associations:[...links.values()]},new Set(snapshot.anchors.map(a=>a.id)),snapshot);
}

export function updateAssociationEdit(current:AssociationEdits,base:MusicLibrary,snapshot:MapSnapshot,op:EditOperation,trackId:string,anchorId:string):AssociationEdits{
  if(!['add','remove','restore'].includes(op)||!base.tracks.some(t=>t.id===trackId)||!snapshot.anchors.some(a=>a.id===anchorId))throw new Error('请选择有效的歌曲和点位');
  const edits=current.edits.filter(e=>key(e.trackId,e.anchorId)!==key(trackId,anchorId));
  if(op!=='restore')edits.push({trackId,anchorId,action:op,updatedAt:new Date().toISOString()});
  return validateEdits({schemaVersion:1,edits},base,snapshot);
}
