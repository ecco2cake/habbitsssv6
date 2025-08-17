// Полная версия v5: CSP + cache-control + безопасное рендеринг (textContent), экспорт/импорт, редактирование, удаление, сегодня-кнопка, авто-пропуски
const LS_KEY='habit_cards_full_v5';
const state={ date:new Date(), habits:[], data:{} };

function ymKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function dim(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function todayIndex(){ const t=new Date(); if(t.getFullYear()===state.date.getFullYear() && t.getMonth()===state.date.getMonth()) return t.getDate()-1; return -1; }
function uid(){ return Math.random().toString(36).slice(2,9); }

function load(){ const raw=localStorage.getItem(LS_KEY); if(raw){ try{ const o=JSON.parse(raw); state.date=new Date(o.date||Date.now()); state.habits=o.habits||[]; state.data=o.data||{}; }catch{} } if(!state.habits.length){ const now=Date.now(); state.habits=[{id:uid(),name:'Медитация',note:'15 минут',color:'#c084fc',parts:1,createdAt:now},{id:uid(),name:'Вода',note:'3 литра',color:'#f6c85f',parts:1,createdAt:now}]; } }

function save(){ localStorage.setItem(LS_KEY, JSON.stringify({date:state.date, habits:state.habits, data:state.data})); }

function ensureMonth(){ const key=ymKey(state.date), d=dim(state.date); if(!state.data[key]) state.data[key]={}; for(const h of state.habits){ if(!state.data[key][h.id]) state.data[key][h.id]=Array.from({length:d},()=>({done:0})); const arr=state.data[key][h.id]; if(arr.length!==d){ if(arr.length<d){ while(arr.length<d) arr.push({done:0}); } else state.data[key][h.id]=arr.slice(0,d); } } }

function setSafeText(el, txt){ el.textContent = txt === undefined || txt === null ? '' : String(txt); }

function render(){ document.getElementById('monthLabel').textContent = state.date.toLocaleString('ru-RU',{month:'long',year:'numeric'}); ensureMonth(); const list=document.getElementById('list'); list.innerHTML=''; const key=ymKey(state.date); const days=dim(state.date); const tIndex=todayIndex(); const now = new Date();

 for(const h of state.habits){
   const tpl=document.getElementById('habitCardTpl').content.cloneNode(true);
   const dot=tpl.querySelector('.dot'), title=tpl.querySelector('.title'), subtitle=tpl.querySelector('.subtitle');
   const grid=tpl.querySelector('.grid'), stats=tpl.querySelector('.stats');
   dot.style.background=h.color;
   setSafeText(title, h.name);
   setSafeText(subtitle, h.note || '');
   grid.style.gridTemplateColumns = `repeat(7, minmax(10px,1fr))`;
   const arr=state.data[key][h.id];

   let ok=0, skips=0;
   const created = h.createdAt ? new Date(h.createdAt) : new Date(state.date.getFullYear(), state.date.getMonth(), 1);
   for(let i=0;i<days;i++){
     const cell=document.createElement('div'); cell.className='cell'; cell.dataset.habitId=h.id; cell.dataset.dayIndex=String(i);
     const v=arr[i]; const parts = h.parts || 1;
     updateCellVisual(cell, v, parts, h.color);
     cell.title = `${i+1} • ${v.done+'/'+parts}`;
     grid.appendChild(cell);

     const dayDate = new Date(state.date.getFullYear(), state.date.getMonth(), i+1, 12);
     if(dayDate >= new Date(created.getFullYear(), created.getMonth(), created.getDate()) && dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())){
       if(!v.done || v.done < parts) skips++;
     }
     if(v.done >= parts) ok++;
   }

   stats.textContent = `Готово: ${ok}/${days} • Пропусков: ${skips}`;

   const todayBtn = tpl.querySelector('.todayBtn');
   function updateTodayBtnVisual(){
     if(tIndex<0){ todayBtn.style.opacity=0.4; todayBtn.disabled=true; return; }
     const v = state.data[ymKey(state.date)][h.id][tIndex];
     const parts = h.parts || 1;
     if(v.done>=parts){ todayBtn.textContent='✖'; todayBtn.title='Отменить сегодняшнюю отметку'; } else { todayBtn.textContent='✅'; todayBtn.title='Отметить сегодня'; }
   }
   todayBtn.addEventListener('click', ()=>{
     if(tIndex<0) return;
     const v = state.data[ymKey(state.date)][h.id][tIndex];
     const parts = h.parts || 1;
     if(v.done>=parts){ v.done=0; } else { v.done = parts; }
     save(); render();
   });
   updateTodayBtnVisual();

   tpl.querySelector('.edit').addEventListener('click', ()=>openDialog(h));
   list.appendChild(tpl);
 }

}

function updateCellVisual(cell,v,parts,color){
  const ratio = v.done/parts;
  cell.removeAttribute('data-r');
  cell.innerHTML = '';
  cell.style.background = '';
  if(ratio<=0) return;
  if(ratio>=1){ cell.dataset.r='full'; cell.style.background = color; }
  else { cell.dataset.r='part'; const b=document.createElement('div'); b.className='badge'; b.textContent=`${v.done}/${parts}`; cell.appendChild(b); try{ cell.style.background = hexWithAlpha(color,0.28); }catch{ cell.style.background = color; } }
}

function hexWithAlpha(hex,alpha){ if(!hex || !hex.startsWith('#')) return hex; const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${alpha})`; }

function prevMonth(){ state.date = new Date(state.date.getFullYear(), state.date.getMonth()-1,1); save(); render(); }
function nextMonth(){ state.date = new Date(state.date.getFullYear(), state.date.getMonth()+1,1); save(); render(); }

function openDialog(habit){
  const dlg=document.getElementById('habitDialog');
  const name=document.getElementById('habitName'), color=document.getElementById('habitColor'), note=document.getElementById('habitNote');
  const deleteBtn = document.getElementById('dlgDelete'), cancelBtn = document.getElementById('dlgCancel');
  document.getElementById('dlgTitle').textContent = habit? 'Редактирование' : 'Новая привычка';
  name.value = habit?.name || ''; color.value = habit?.color || '#6c5ce7'; note.value = habit?.note || '';
  if(habit){ deleteBtn.style.display = 'inline-block'; } else { deleteBtn.style.display='none'; }
  cancelBtn.onclick = ()=>{ dlg.returnValue = 'cancel'; dlg.close(); };
  deleteBtn.onclick = ()=>{
    if(!habit) return;
    if(!confirm('Удалить привычку и все её отметки?')) return;
    state.habits = state.habits.filter(x=>x.id!==habit.id);
    for(const k of Object.keys(state.data)){ if(state.data[k] && state.data[k][habit.id]) delete state.data[k][habit.id]; }
    save(); dlg.close(); render();
  };
  dlg.showModal();
  dlg.onclose = ()=>{
    if(dlg.returnValue!=='ok') return;
    const item = { id: habit?.id || uid(), name: (name.value||'').trim() || 'Без названия', color: color.value||'#6c5ce7', note: (note.value||'').trim(), parts: habit?.parts || 1, createdAt: habit?.createdAt || Date.now() };
    if(habit){ const idx = state.habits.findIndex(x=>x.id===habit.id); state.habits[idx] = Object.assign({}, state.habits[idx], item); } else { item.parts = 1; item.createdAt = Date.now(); state.habits.push(item); }
    ensureMonth(); save(); render();
  };
}

document.addEventListener('DOMContentLoaded', ()=>{
  load(); ensureMonth(); render();
  document.getElementById('prevMonth').addEventListener('click', prevMonth);
  document.getElementById('nextMonth').addEventListener('click', nextMonth);
  document.getElementById('addHabitBtn').addEventListener('click', ()=>openDialog(null));
  document.getElementById('settingsBtn').addEventListener('click', ()=>{ document.getElementById('settingsDialog').showModal(); });
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    const blob = new Blob([localStorage.getItem(LS_KEY)||'{}'], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='habits.json'; a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById('importBtn').addEventListener('click', ()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', e=>{ const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = ()=>{ try{ const o = JSON.parse(r.result); state.habits = o.habits || []; state.data = o.data || {}; save(); render(); }catch{ alert('Не удалось импортировать JSON'); } }; r.readAsText(f); });
  document.getElementById('clearAll').addEventListener('click', ()=>{ if(confirm('Удалить все данные?')){ localStorage.removeItem(LS_KEY); state.habits=[]; state.data={}; load(); save(); render(); document.getElementById('settingsDialog').close(); } });
});
