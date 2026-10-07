import { ref } from 'vue';

const STORAGE_KEY='gs-map-music.personal-notes.v1';

/** Browser-only personal overrides. Imported source text remains untouched. */
export function usePersonalNotes(){
  const overrides=ref<Record<string,string>>({});
  const noteMessage=ref('');
  let unreadable=false;
  try{
    if(typeof localStorage!=='undefined'){
      const raw=localStorage.getItem(STORAGE_KEY);
      if(raw){
        const saved=JSON.parse(raw);
        if(saved?.schemaVersion!==1||!saved.notes||Array.isArray(saved.notes)||typeof saved.notes!=='object')throw new Error('评价存储格式不支持');
        const valid:Record<string,string>={};
        for(const [id,note] of Object.entries(saved.notes)){
          if(typeof note!=='string'||note.length>20000)throw new Error('评价存储内容无效');
          valid[id]=note;
        }
        overrides.value=valid;
      }
    }
  }catch{unreadable=true;noteMessage.value='个人评价无法读取，原存储保留；请先备份并修复本机存储，再刷新页面。';}
  function personalNoteFor(id:string,sourceNote=''){return Object.prototype.hasOwnProperty.call(overrides.value,id)?overrides.value[id]:sourceNote;}
  function persist(next:Record<string,string>){
    if(unreadable){noteMessage.value='保存被阻止：原评价存储无法读取，请先备份并修复再刷新。';return false;}
    try{
      if(typeof localStorage==='undefined')throw new Error('本机存储不可用');
      localStorage.setItem(STORAGE_KEY,JSON.stringify({schemaVersion:1,notes:next}));
      overrides.value=next;noteMessage.value='个人评价已保存到此浏览器；来源信息保持独立。';return true;
    }catch{noteMessage.value='个人评价保存失败，请复制文字备份；已保存内容保持不变。';return false;}
  }
  function savePersonalNote(id:string,note:string){
    if(note.length>20000){noteMessage.value='个人评价不能超过20000字。';return false;}
    return persist({...overrides.value,[id]:note});
  }
  function clearPersonalNote(id:string){const next={...overrides.value};delete next[id];return persist(next);}
  return {personalNoteFor,savePersonalNote,clearPersonalNote,noteMessage};
}
