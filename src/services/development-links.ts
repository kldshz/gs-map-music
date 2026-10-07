import type { MusicLibrary } from '../domain/contracts';
import type { AssociationEdits, EditOperation } from '../domain/association-edits';

export interface DevelopmentLibrary {library:MusicLibrary;edits:AssociationEdits}
export async function developmentLibrary(operation?:{op:EditOperation;trackId:string;anchorId:string}):Promise<DevelopmentLibrary>{
  const response=await fetch('/__dev/music-links',operation?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(operation)}:undefined);
  const result=await response.json();
  if(!response.ok)throw new Error(result.message??'本机编辑服务不可用');
  return result;
}
