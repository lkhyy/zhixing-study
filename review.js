/* 简单分阶段复习；日期以北京时间展示，间隔按实际经过时长计算。 */
(() => {
 'use strict';
 const DAY=86400000,intervals=[1,3,7,14,30,60];
 const learned=r=>!!(r&&(r.review?.attempts>0||r.reps>0||r.grade!=null||r.last));
 function info(record,now=Date.now()){
  const r=record||{},v=r.review||{},seen=learned(r);
  const oldDue=r.due?Date.parse(r.due+'T00:00:00+08:00'):NaN;
  return {learned:seen,stage:Number.isInteger(v.stage)?Math.max(0,Math.min(6,v.stage)):0,dueAt:seen?(Number.isFinite(v.dueAt)?v.dueAt:Number.isFinite(oldDue)?oldDue:now):null,attempts:v.attempts||r.reps||(seen?1:0),lapses:v.lapses||0,lastAt:v.lastAt||0};
 }
 function schedule(record,grade,now=Date.now()){
  if(![0,1,2].includes(grade))throw Error('无效的记忆评价');
  const p=info(record,now);let stage=p.stage,dueAt;
  if(grade===0){stage=0;dueAt=now+600000}
  else if(grade===1){stage=Math.max(0,stage-1);dueAt=now+DAY}
  else if(p.learned&&p.dueAt>now){dueAt=p.dueAt}
  else{stage=Math.min(6,stage+1);dueAt=now+intervals[Math.max(0,stage-1)]*DAY}
  return {...record,grade,reps:Math.min(100000,p.attempts+1),due:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(dueAt),updatedAt:now,review:{stage,dueAt,lastAt:now,firstAt:record?.review?.firstAt||now,attempts:Math.min(100000,p.attempts+1),lapses:Math.min(100000,p.lapses+(grade===0?1:0))}};
 }
 const due=(r,now=Date.now())=>learned(r)&&info(r,now).dueAt<=now;
 const shuffle=items=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 window.ZXReview={info,learned,due,schedule,shuffle,intervals};
})();
