/* 用户记录与教材内容分开。沿用首版键，未知历史ID仍保留。 */
(() => {
 'use strict';
 const KEY='zhixing-study-v1',SNAP='zhixing-recovery-snapshots';let issue='',lastSnapshot=0;
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),id=s=>/^[a-zA-Z0-9_-]{1,120}$/.test(s)&&!['__proto__','constructor','prototype'].includes(s),date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
 const defaults=()=>({version:2,settings:{name:'研途同学',hours:4,exam:'2026-12-19',progress:{}},cards:{},days:{},notes:{},nodeNotes:{},outlineChecks:{},pageRefs:{},bookmarks:{},materials:[],timer:{remaining:1500,running:false,deadline:0},meta:{createdAt:Date.now(),contentVersion:window.KNOWLEDGE_VERSION}});
 function validate(s){
  if(!obj(s)||![1,2].includes(s.version)||!obj(s.settings)||!obj(s.cards)||!obj(s.days)||!obj(s.notes))throw Error('不是有效的知行备份');
  if(typeof s.settings.name!=='string'||s.settings.name.length>100||![4,5].includes(Number(s.settings.hours))||!date(s.settings.exam))throw Error('设置无效');
  for(const [k,r] of Object.entries(s.cards))if(!id(k)||!obj(r)||(r.grade!=null&&![0,1,2].includes(r.grade))||(r.favorite!=null&&typeof r.favorite!=='boolean')||(r.due!=null&&!date(r.due))||(r.reps!=null&&(!Number.isInteger(r.reps)||r.reps<0||r.reps>100000)))throw Error('复习记录无效');
  for(const r of Object.values(s.cards))if(r.review!=null){const v=r.review;if(!obj(v)||!Number.isInteger(v.stage)||v.stage<0||v.stage>6||!Number.isFinite(v.dueAt)||v.dueAt<0||v.dueAt>8640000000000000||!Number.isFinite(v.lastAt)||v.lastAt<0||!Number.isInteger(v.attempts)||v.attempts<1||v.attempts>100000||!Number.isInteger(v.lapses)||v.lapses<0||v.lapses>100000)throw Error('复习记录无效')}
  for(const [k,n] of Object.entries(s.notes))if(!id(k)||typeof n!=='string'||n.length>50000)throw Error('回答记录无效');
  for(const [d,r] of Object.entries(s.days))if(!date(d)||!obj(r)||!Array.isArray(r.ids)||r.ids.some(k=>typeof k!=='string'||!id(k))||!Number.isFinite(r.focusSeconds)||r.focusSeconds<0)throw Error('每日记录无效');
  for(const name of ['nodeNotes','pageRefs','bookmarks','outlineChecks'])if(s[name]!=null&&!obj(s[name]))throw Error('教材记录无效');
  for(const [k,r] of Object.entries(s.outlineChecks||{}))if(!id(k)||!obj(r)||typeof r.read!=='boolean'||!Number.isFinite(r.updatedAt))throw Error('目录阅读记录无效');
  for(const [k,n] of Object.entries(s.nodeNotes||{}))if(!id(k)||typeof n!=='string'||n.length>50000)throw Error('笔记无效');
  for(const [k,r] of Object.entries(s.pageRefs||{}))if(!id(k)||!obj(r)||typeof r.paper!=='string'||r.paper.length>80||!Number.isInteger(r.pdf)||r.pdf<0||r.pdf>100000)throw Error('页码无效');
  for(const [k,v] of Object.entries(s.bookmarks||{}))if(!id(k)||typeof v!=='string'||v.length>120)throw Error('阅读位置无效');
  if(s.timer&&(!obj(s.timer)||!Number.isFinite(s.timer.remaining)||s.timer.remaining<0||s.timer.remaining>1500||!Number.isFinite(s.timer.deadline)||typeof s.timer.running!=='boolean'))throw Error('计时记录无效');
  if(Object.keys(s.cards).length>20000||Object.keys(s.notes).length>20000||Object.keys(s.days).length>10000)throw Error('备份过大');return s;
 }
 function normalize(s){validate(s);const d=defaults();return{...s,version:2,settings:{...d.settings,...s.settings,progress:s.settings.progress||{}},nodeNotes:s.nodeNotes||{},outlineChecks:s.outlineChecks||{},pageRefs:s.pageRefs||{},bookmarks:s.bookmarks||{},materials:Array.isArray(s.materials)?s.materials:[],timer:{...d.timer,...s.timer},meta:{...d.meta,...s.meta,contentVersion:window.KNOWLEDGE_VERSION}}}
 function snapshots(){try{const x=JSON.parse(localStorage.getItem(SNAP)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
 function snapshot(raw,reason){if(!raw)return;try{const list=snapshots();if(list[0]?.raw===raw)return;list.unshift({time:Date.now(),reason,raw});localStorage.setItem(SNAP,JSON.stringify(list.slice(0,5)));lastSnapshot=Date.now()}catch{}}
 function fail(text){issue=text;window.dispatchEvent(new CustomEvent('zx-storage-error',{detail:text}))}
 function load(){try{const raw=localStorage.getItem(KEY);if(!raw)return defaults();try{const parsed=JSON.parse(raw),s=normalize(parsed);if(parsed.version===1){snapshot(raw,'首版升级前');save(s)}return s}catch{snapshot(raw,'无法解析的原始记录');fail('旧记录读取失败，原始数据未覆盖。请先下载原始记录，再导入有效备份。');return{...defaults(),recoveryBlocked:true}}}catch{fail('浏览器暂时不能保存，请在关闭页面前导出记录。');return defaults()}}
 function save(s){if(s.recoveryBlocked)return false;try{if(Date.now()-lastSnapshot>1800000)snapshot(localStorage.getItem(KEY),'自动保护快照');s.meta.updatedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(s));issue='';return true}catch{fail('保存失败，当前页面中的记录仍在。请立即导出备份。');return false}}
 function join(a,b){if(!a)return b||'';if(!b||a===b||a.includes(b))return a;if(b.includes(a))return b;return a+'\n\n—— 导入备份中的另一份笔记 ——\n'+b}
 function merge(current,raw){const incoming=normalize(raw),next={...current,recoveryBlocked:false,version:2,settings:incoming.settings,cards:{...current.cards},days:{...current.days},notes:{...current.notes},nodeNotes:{...current.nodeNotes},outlineChecks:{...current.outlineChecks},pageRefs:{...current.pageRefs,...incoming.pageRefs},bookmarks:{...current.bookmarks,...incoming.bookmarks},meta:{...current.meta,lastImport:Date.now()},materials:[...(current.materials||[])]};
  for(const [k,r] of Object.entries(incoming.outlineChecks))if(!next.outlineChecks[k]||r.updatedAt>=next.outlineChecks[k].updatedAt)next.outlineChecks[k]=r;
  for(const [k,r] of Object.entries(incoming.cards)){const a=next.cards[k],newer=!a||(r.updatedAt||Date.parse(r.last||'')||0)>=(a.updatedAt||Date.parse(a.last||'')||0);next.cards[k]={...(newer?a:r),...(newer?r:a),favorite:!!(a?.favorite||r.favorite)}}
  for(const [k,n] of Object.entries(incoming.notes))next.notes[k]=join(next.notes[k],n);for(const [k,n] of Object.entries(incoming.nodeNotes))next.nodeNotes[k]=join(next.nodeNotes[k],n);
  for(const [d,r] of Object.entries(incoming.days)){const a=next.days[d];next.days[d]={ids:[...new Set([...(a?.ids||[]),...r.ids])],focusSeconds:Math.max(a?.focusSeconds||0,r.focusSeconds)}}
  for(const m of incoming.materials)if(!next.materials.some(a=>a.id===m.id))next.materials.push(m);validate(next);snapshot(localStorage.getItem(KEY),'导入备份前');return next}
 window.ZXStore={KEY,load,save,validate,merge,snapshots,getIssue:()=>issue,raw:()=>localStorage.getItem(KEY)};
})();
