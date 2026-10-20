(() => {
'use strict';
const C=window.STUDY_CARDS,L=window.LEGACY_CARDS||[],B=window.STUDY_BOOKS,S=window.ZXStore,R=window.ZXReview;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=new Map([...C,...L].map(c=>[c.id,c])),book=id=>B.find(b=>b.id===id);
const day=(n=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(n);
let state=S.load(),session=null,toastTimer,updating=false,grading=false,lastClock='';
const preferences={today:{book:'all',type:'all',query:'',page:1,status:'all',library:false},favorites:{book:'all',type:'all',query:'',page:1,status:'all',library:true}},pageSize=24;
function current(){const n=location.hash.slice(1);if(n==='favorites')return n;if(n!=='today')history.replaceState(null,'','#today');return 'today'}
const learned=c=>R.learned(state.cards[c.id]),due=c=>R.due(state.cards[c.id]);
const pool=()=>[...C,...L.filter(c=>learned(c))];
const isFavorite=id=>!!state.cards[id]?.favorite;
const favorites=()=>[...C,...L].filter(c=>isFavorite(c.id));
function save(){const ok=S.save(state);warning();return ok}
function warning(){const t=S.getIssue();$('#storage-warning').hidden=!t;$('#storage-warning').textContent=t||''}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600)}
function scoped(items,view=current()){const f=preferences[view];return items.filter(c=>f.book==='all'||c.book===f.book)}
function filtered(view=current()){
 const f=preferences[view],source=view==='favorites'?favorites():pool(),q=f.query.toLowerCase().replace(/\s+/g,'');
 return scoped(source,view).filter(c=>(f.type==='all'||c.type===f.type)&&(!q||[c.q,c.topic,c.subtopic,c.location,...c.answer].join('').toLowerCase().replace(/\s+/g,'').includes(q))&&(f.status==='all'||f.status==='learned'&&learned(c)||f.status==='due'&&due(c)||f.status==='new'&&!learned(c)));
}
function favoriteButton(c){const active=isFavorite(c.id);return `<button class="favorite-button ${active?'selected':''}" data-action="favorite" data-id="${c.id}" aria-pressed="${active}" aria-label="${active?'取消收藏':'收藏卡片'}：${esc(c.q)}"><span aria-hidden="true">${active?'★':'☆'}</span> ${active?'已收藏':'收藏'}</button>`}
const provenance=c=>c.generation==='extractive_cloze'?'教材细点 · 正文抽取':c.generation==='extractive_recall'?'教材细目 · 节选回顾':c.generation==='authored_detail'?'细分问答 · 教材依据':c.status==='textbook_based'?'据教材正文重编':c.status==='legacy'?'历史旧题 · 未核验正文':'辅导练习 · 待核验正文';
function nextLabel(at){const now=Date.now(),diff=at-now;if(diff<=0)return '现在可复习';if(diff<3600000)return `约 ${Math.ceil(diff/60000)} 分钟后`;if(day(at)===day())return '今天稍后';const tomorrow=day(now+86400000);if(day(at)===tomorrow)return '明天';return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(at)}
function progressLabel(c){if(!learned(c))return '未学习';const p=R.info(state.cards[c.id]);return due(c)?'已到复习时间':`下次复习 · ${nextLabel(p.dueAt)}`}
function card(c){return `<article class="question-card"><div class="card-top"><span style="--subject:${book(c.book).color}">${book(c.book).short}</span><small class="${due(c)?'due-tag':''}">${progressLabel(c)}</small></div><h2>${esc(c.q)}</h2><p class="card-location">${esc(c.location)}</p><p class="card-provenance ${c.status==='textbook_based'?'verified':''}">${provenance(c)}</p><div class="card-bottom">${favoriteButton(c)}<button class="read-button" data-action="open" data-id="${c.id}">${learned(c)?'再练一次':'开始学习'} <span aria-hidden="true">↗</span></button></div></article>`}
function subjectTabs(view){const f=preferences[view],items=view==='favorites'?favorites():pool();return `<div class="subject-tabs" aria-label="选择学习科目">${[{id:'all',short:'全部科目'},...B].map(b=>`<button class="subject-tab ${f.book===b.id?'active':''}" data-action="subject" data-book="${b.id}" aria-pressed="${f.book===b.id}">${b.short}<span>${b.id==='all'?items.length:items.filter(c=>c.book===b.id).length}</span></button>`).join('')}</div>`}
function library(view){
 const f=preferences[view],list=filtered(view),pages=Math.max(1,Math.ceil(list.length/pageSize));f.page=Math.min(f.page,pages);const rows=list.slice((f.page-1)*pageSize,f.page*pageSize);
 const names={all:'全部卡片',learned:'已学卡片',due:'到期复习',new:'未学卡片'};
 return `<section id="card-library" class="card-library"><div class="section-title"><div><span class="eyebrow">YOUR CARDS</span><h2>${view==='favorites'?'收藏的卡片':names[f.status]}</h2></div><button class="text-button" data-action="practice" ${list.length?'':'disabled'}>随机练习这些卡片 →</button></div>
 <div class="state-tabs" aria-label="卡片学习状态">${Object.entries(names).map(([id,name])=>`<button data-action="status" data-status="${id}" aria-pressed="${f.status===id}" class="${f.status===id?'active':''}">${name}</button>`).join('')}</div>
 <div class="filter-bar"><div class="search-wrap"><span aria-hidden="true">⌕</span><input id="card-search" type="search" value="${esc(f.query)}" aria-label="搜索卡片" placeholder="搜索问题、知识点或章节…"></div><select id="type-filter" aria-label="按题型筛选"><option value="all">全部题型</option>${[...new Set([...C,...L].map(c=>c.type))].map(t=>`<option value="${esc(t)}" ${f.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
 <div class="results-meta"><span>${list.length?`${(f.page-1)*pageSize+1}–${Math.min(f.page*pageSize,list.length)} / ${list.length} 张卡片`:'0 张卡片'}</span><button class="text-button" data-action="reset-filters">清除筛选</button></div>
 <div class="card-grid">${rows.map(card).join('')}</div>${rows.length?'':`<section class="empty"><div class="empty-star" aria-hidden="true">${view==='favorites'?'☆':'◫'}</div><h2>${view==='favorites'&&!favorites().length?'收藏夹还是空的':f.status==='due'?'现在没有到期的卡片':'这里暂时没有卡片'}</h2><p>${view==='favorites'&&!favorites().length?'学习时点一下收藏，就能在这里找到。':f.status==='due'?'复习安排会自动保留。也可以在“已学卡片”中提前再练。':'试试其他科目或筛选条件。'}</p><button class="secondary" data-action="${f.status==='due'?'status':'reset-filters'}" ${f.status==='due'?'data-status="learned"':''}>${f.status==='due'?'查看已学卡片':'查看全部卡片'}</button></section>`}
 ${pages>1?`<nav class="pagination" aria-label="卡片分页"><button class="secondary" data-action="previous-page" ${f.page===1?'disabled':''}>← 上一页</button><span>第 ${f.page} / ${pages} 页</span><button class="secondary" data-action="next-page" ${f.page===pages?'disabled':''}>下一页 →</button></nav>`:''}</section>`;
}
function home(){
 const all=scoped(pool(),'today'),active=scoped(C,'today'),seen=all.filter(learned),pending=all.filter(due),fresh=active.filter(c=>!learned(c));
 const todayIds=new Set(state.days[day()]?.ids||[]),today=all.filter(c=>todayIds.has(c.id)).length,percent=all.length?Math.round(seen.length/all.length*100):0;
 const bookName=preferences.today.book==='all'?'全部科目':book(preferences.today.book).short;
 return `<div class="home-intro"><div><div class="eyebrow">A LITTLE, EVERY DAY</div><h1>把知识，一张张记住。</h1><p>先回忆，再对照；学过的，每一张都能回来复习。</p></div><span class="date-chip">${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',weekday:'long'}).format(new Date())}</span></div>
 ${subjectTabs('today')}
 <section class="learn-hero"><div class="hero-copy"><span class="hero-kicker">${bookName} · 今天从这里开始</span><h2>${fresh.length?'给新知识<br>留一点时间。':'让学过的知识<br>记得更牢。'}</h2><p>${fresh.length?`还有 ${fresh.length} 道未学卡片，随机抽取，每组最多 20 道。`:'这门课的新卡片已经学完，可以继续随机巩固。'}</p><button class="primary start-learning" data-action="learn">${fresh.length?'开始学习':'随机巩固'} <span aria-hidden="true">→</span></button><small>查看答案后，选择记忆程度，才计入已学。</small></div><div class="hero-art" aria-hidden="true"><div class="paper-card paper-back"></div><div class="paper-card paper-middle"></div><div class="paper-card paper-front"><span>知行 · 每日一问</span><i>知</i><p>把读过的，<br>变成记住的。</p><div>RECALL · UNDERSTAND · REMEMBER</div></div></div></section>
 <section class="learning-stats" aria-label="学习进度">
 <button class="stat" data-action="show-library" data-status="learned"><span>累计已学 <i>↗</i></span><strong data-stat="learned">${seen.length}<small> 道</small></strong><em>每道题只计一次</em></button>
 <button class="stat" data-action="show-library" data-status="due"><span>到期待复习 <i>↗</i></span><strong data-stat="due">${pending.length}<small> 道</small></strong><em>${seen.length-pending.length} 道已安排后续复习</em></button>
 <button class="stat" data-action="show-library" data-status="new"><span>尚未学习 <i>↗</i></span><strong data-stat="new">${fresh.length}<small> 道</small></strong><em>随时开始一组</em></button>
 <div class="stat today-stat"><span>今天学过</span><strong data-stat="today">${today}<small> 道</small></strong><em>含新学与复习，按题去重</em></div></section>
 <div class="overall-progress"><div><span>${bookName} · 已学 ${percent}%</span><button class="text-button" data-action="show-library" data-status="all">查找全部卡片 →</button></div><div class="progress-track" role="progressbar" aria-label="已学比例" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div></div>
 <section class="review-entry"><div class="review-icon" aria-hidden="true">↺</div><div><h2>${pending.length?`${pending.length} 道卡片，到了再见一面的时间。`:'复习进度，已经为你记下。'}</h2><p>${pending.length?'优先复习已到期的卡片，再继续学习新题。':'每次评价都会安排下一次复习，也可以随时提前巩固。'}</p></div><button class="secondary" data-action="${pending.length?'review':'consolidate'}" ${seen.length?'':'disabled'}>${pending.length?'开始复习':'复习已学'} →</button></section>
 ${preferences.today.library?library('today'):''}
 <details class="source-details"><summary>题库来源、细分范围与复习说明</summary><p>马原 ${C.filter(c=>c.book==='principles').length} 道、毛概 ${C.filter(c=>c.book==='mao').length} 道，依据已提供的2023年版教材正文整理。习概 ${C.filter(c=>c.book==='xi').length} 道，据 DD15311072概.pdf 更新，覆盖导论与17章的目录细目；该文件目录及后记对应2023年版，但缺少可核验的版权页。</p><p>思政原理 ${C.filter(c=>c.book==='education').length} 道，依据陈万柏、张耀灿《思想政治教育学原理》第三版更新，含${window.BANK_COVERAGE?.educationQA||0}道核心问答、${window.BANK_COVERAGE?.educationRecall||0}道细目回顾和${window.BANK_COVERAGE?.educationCloze||0}道填空，覆盖12章117项目录细目。版权页确认为2015年7月第三版，ISBN 9787040428490。正文为批注扫描件；已筛查识别句，13处关键定义对照原页补录，每题附PDF页码。识别错漏仍可能存在，并未逐题逐字核对原件。涉及历史时点的表述按2015年版保留，须结合最新教材和考试大纲。</p><p>细目回顾展示部分正文要点，填空考查局部表述；题量及目录覆盖均不代表穷尽所有考点，也不是官方真题。旧习概及思政原理辅导题退出常规新题池，已收藏、作答或学过的旧题记录仍保留；新题使用独立编号。</p><p>复习间隔：“不会”约10分钟后，“模糊”次日，“记住了”在到期复习后逐步安排1、3、7、14、30、60天。提前巩固答对不会直接跳过阶段，每题可在“已学卡片”中再练。记录保存在本设备当前浏览器；相同网址覆盖更新会保留记录，换设备、浏览器或清除浏览器数据不会自动同步。</p></details>`;
}
function render(){
 lastClock=day()+'|'+pool().filter(due).map(c=>c.id).join(',');
 const view=current(),fav=favorites();document.title=(view==='favorites'?'收藏夹':'开始学习')+' · 知行';
 document.querySelectorAll('[data-nav]').forEach(a=>{const on=a.dataset.nav===view;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 $('#favorite-count').textContent=fav.length;$('#card-count').textContent=pool().length;$('#breadcrumb').textContent=view==='favorites'?'收藏夹':'开始学习';
 $('#main').innerHTML=view==='today'?home():`<header class="page-heading"><div><div class="eyebrow">KEEP WHAT MATTERS</div><h1>把想再看的，放在这里。</h1><p>共 ${fav.length} 张收藏，学习记录和复习安排会一并保留。</p></div></header>${subjectTabs('favorites')}${library('favorites')}`;
 warning();
}
function showLibrary(status){const f=preferences[current()];Object.assign(f,{status,page:1,library:true,query:'',type:'all'});render();$('#card-library')?.scrollIntoView({behavior:'smooth',block:'start'})}
function toggleFavorite(id){if(!byId.has(id))return;const active=!isFavorite(id);state.cards[id]={...state.cards[id],favorite:active,updatedAt:Date.now()};save();render();if(session&&!session.complete)showStudy(true);toast(active?'已放入收藏夹':'已移出收藏夹')}
function start(ids,mode='free'){
 const unique=[...new Set(ids)].filter(id=>byId.has(id));if(!unique.length){toast('当前没有可学习的卡片');return}
 session={ids:R.shuffle(unique).slice(0,20),index:0,reveal:false,mode,completed:new Set(),ratings:[0,0,0],complete:false};showStudy();if(!$('#study-dialog').open)$('#study-dialog').showModal();
}
function begin(mode){
 const all=scoped(pool(),'today'),fresh=scoped(C,'today').filter(c=>!learned(c));
 if(mode==='learn')start((fresh.length?fresh:all.filter(learned)).map(c=>c.id),fresh.length?'learn':'consolidate');
 if(mode==='review')start(all.filter(due).map(c=>c.id),'review');
 if(mode==='consolidate')start(all.filter(learned).map(c=>c.id),'consolidate');
}
function source(c){return c.citation?`<details class="textbook-evidence"><summary>回到教材 · 查看正文依据</summary><p>${esc(c.citation.filename)} · ISBN ${esc(c.citation.isbn)}</p><p>正文依据位置：${esc(c.citation.location)}</p>${c.evidence.map(e=>`<blockquote><p>${esc(e.text)}</p><cite>${esc(e.location)}${e.method==='visual_transcription'?' · 原页补录':e.method==='ocr_screened'?' · 扫描识别，已筛选':''}</cite></blockquote>`).join('')}<small>原文件含OCR错字，节选只展示部分依据，请对照教材原件；毛概按Word非空段落提取顺序定位。</small></details>`:''}
function showStudy(keepScroll=false){
 if(!session||session.complete)return;const c=byId.get(session.ids[session.index]),r=R.info(state.cards[c.id]),oldTop=$('.dialog-content')?.scrollTop||0,sourceOpen=$('.textbook-evidence')?.open,draftOpen=$('.draft-details')?.open;
 const estimated=[0,1,2].map(g=>nextLabel(R.schedule(state.cards[c.id],g).review.dueAt));
 $('#study-dialog').classList.add('study-session');$('#study-dialog').setAttribute('aria-labelledby','study-title');
 $('#study-dialog').innerHTML=`<header class="dialog-header"><div><span>${({learn:'学习新题',review:'到期复习',consolidate:'随机巩固',free:'卡片练习'})[session.mode]} · ${session.index+1} / ${session.ids.length}</span><div class="session-progress"><span style="width:${session.index/session.ids.length*100}%"></span></div></div><button class="close-button" data-action="close" aria-label="结束本次学习">×</button></header>
 <div class="dialog-content recall-content"><div class="recall-meta"><span class="dialog-subject" style="color:${book(c.book).color}">${book(c.book).short} · ${book(c.book).edition}</span><span>${r.learned?`已练 ${r.attempts} 次`:'初次见面'}</span></div><p class="question-topic">${esc(c.subtopic||c.topic)}</p><h2 id="study-title">${esc(c.q)}</h2><p class="dialog-location">${esc(c.location)}</p><p class="card-provenance ${c.status==='textbook_based'?'verified':''}">${provenance(c)}</p>
 <details class="draft-details" ${state.notes[c.id]?'open':''}><summary>写下我的回答（选填）</summary><label class="sr-only" for="answer-draft">我的回答</label><textarea id="answer-draft" maxlength="50000" placeholder="先回忆，再写下你的理解…">${esc(state.notes[c.id]||'')}</textarea><small class="save-hint">自动保存在当前设备</small></details>
 ${session.reveal?`<section class="reference"><h3>${c.generation==='extractive_cloze'?'参考填空与完整表述':'参考要点'}</h3><ol>${c.answer.map(a=>`<li>${esc(a)}</li>`).join('')}</ol><p class="answer-note">${esc(c.note||'请对照所考教材补充规范表述。')}</p><p class="answer-source">${esc(c.source)}</p>${source(c)}</section>`:`<div class="recall-prompt"><span aria-hidden="true">◌</span><p>先在心里组织一下答案。</p><small>想不起也没关系，展开后再认真看一遍。</small></div>`}</div>
 <footer class="study-footer"><div class="study-tools">${favoriteButton(c)}<button class="text-button" data-action="skip">暂时跳过</button></div>${session.reveal?`<div class="rating-buttons" aria-label="评价记忆程度">${[{g:0,label:'不会',kind:'again'},{g:1,label:'模糊',kind:'hard'},{g:2,label:'记住了',kind:'remember'}].map(({g,label,kind})=>`<button class="rating ${kind}" data-action="rate" data-grade="${g}"><b>${label}</b><small>${estimated[g]}复习</small></button>`).join('')}</div>`:'<button class="primary reveal-main" data-action="reveal">想好了，查看答案 <span aria-hidden="true">↓</span></button>'}<p class="rating-hint">${session.reveal?'根据这次实际回忆评价，系统会保存并安排下次复习。':'查看答案后评价记忆程度，才会记录为已学。'}</p></footer>`;
 if(keepScroll){$('.dialog-content').scrollTop=oldTop;if(sourceOpen&&$('.textbook-evidence'))$('.textbook-evidence').open=true;if(draftOpen&&$('.draft-details'))$('.draft-details').open=true}
}
function finish(){
 session.complete=true;render();$('#study-dialog').innerHTML=`<header class="dialog-header"><span>本组学习结束</span><button class="close-button" data-action="close" aria-label="结束本次学习">×</button></header><div class="session-summary dialog-content"><div class="summary-seal" aria-hidden="true">✓</div><div class="eyebrow">ONE STEP FORWARD</div><h2 id="study-title">又向前走了一点。</h2><p>本组完成 <strong>${session.completed.size}</strong> 道卡片，已保存回答和下次复习时间。</p><div class="summary-counts"><span>不会<b>${session.ratings[0]}</b></span><span>模糊<b>${session.ratings[1]}</b></span><span>记住了<b>${session.ratings[2]}</b></span></div><p class="summary-footnote">跳过的卡片不计入已学，可随时回来再练。</p><button class="primary" data-action="home">返回学习首页 →</button></div>`;
}
function advance(){if(session.index+1<session.ids.length){session.index++;session.reveal=false;showStudy();$('.dialog-content').scrollTop=0}else finish()}
function rate(grade){
 if(!session||session.complete||!session.reveal||grading)return;grading=true;
 const id=session.ids[session.index],now=Date.now();state.cards[id]={...R.schedule(state.cards[id],grade,now),last:day(now)};
 const d=state.days[day(now)]||={ids:[],focusSeconds:0};if(!d.ids.includes(id))d.ids.push(id);
 session.completed.add(id);session.ratings[grade]++;save();render();advance();setTimeout(()=>{grading=false},250);
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action,f=preferences[current()];
 if(a==='favorite')toggleFavorite(el.dataset.id);
 if(a==='open')start([el.dataset.id]);
 if(a==='learn'||a==='review'||a==='consolidate')begin(a);
 if(a==='practice')start(filtered().map(c=>c.id));
 if(a==='subject'){f.book=el.dataset.book;f.page=1;render()}
 if(a==='show-library'||a==='status')showLibrary(el.dataset.status);
 if(a==='reset-filters'){Object.assign(f,{book:'all',type:'all',query:'',status:'all',page:1,library:true});render()}
 if(a==='next-page'||a==='previous-page'){f.page+=a==='next-page'?1:-1;render();$('#card-library')?.scrollIntoView({block:'start'})}
 if(a==='reveal'&&session){session.reveal=true;showStudy();$('.reference')?.scrollIntoView({behavior:'smooth',block:'start'})}
 if(a==='close')$('#study-dialog').close();
 if(a==='home'){$('#study-dialog').close();location.hash='#today';render();window.scrollTo(0,0)}
 if(a==='skip'&&session&&!session.complete)advance();
 if(a==='rate')rate(Number(el.dataset.grade));
 if(a==='apply-update'){save();updating=true;navigator.serviceWorker.getRegistration().then(r=>r?.waiting?.postMessage({type:'SKIP_WAITING'}))}
});
document.addEventListener('input',e=>{if(e.target.id==='answer-draft'&&session&&!session.complete){state.notes[session.ids[session.index]]=e.target.value;save()}if(e.target.id==='card-search'){const f=preferences[current()],position=e.target.selectionStart;f.query=e.target.value;f.page=1;const scrollY=window.scrollY;render();$('#card-search').focus({preventScroll:true});try{$('#card-search').setSelectionRange(position,position)}catch{}window.scrollTo(0,scrollY)}});
document.addEventListener('change',e=>{if(e.target.id==='type-filter'){const f=preferences[current()];f.type=e.target.value;f.page=1;render()}});
$('#study-dialog').addEventListener('close',()=>{session=null;grading=false;render()});
window.addEventListener('hashchange',()=>{if($('#study-dialog').open)$('#study-dialog').close();render();window.scrollTo(0,0)});
window.addEventListener('zx-storage-error',warning);window.addEventListener('pagehide',()=>save());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('#study-dialog').open)render()});
setInterval(()=>{const clock=day()+'|'+pool().filter(due).map(c=>c.id).join(',');if(clock!==lastClock&&!document.hidden&&!$('#study-dialog').open&&!$('#card-search')?.matches(':focus'))render()},30000);
function updateNotice(){const el=$('#update-banner');el.hidden=false;el.innerHTML='<span>新版学习与复习功能已就绪，原记录会保留。</span><button class="secondary" data-action="apply-update">更新并重新打开</button>'}
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js').then(r=>{if(r.waiting)updateNotice();r.addEventListener('updatefound',()=>{const i=r.installing;i?.addEventListener('statechange',()=>{if(i.state==='installed'&&navigator.serviceWorker.controller)updateNotice()})})}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload()})}
render();
})();
