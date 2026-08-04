(function(){
"use strict";

/* ---------------- Constants ---------------- */
const COLORS = [
  {name:"Electric Violet", hex:"#B624FF"},
  {name:"Magenta Rose", hex:"#E23E8B"},
  {name:"Sunset Orange", hex:"#F2734C"},
  {name:"Amber", hex:"#D9A214"},
  {name:"Emerald", hex:"#16A36B"},
  {name:"Ocean Blue", hex:"#2373E0"},
  {name:"Indigo", hex:"#5B4FE8"},
  {name:"Slate", hex:"#5D6478"},
];
const EMOJIS = ["📝","✅","🔥","💡","📌","🛒","💪","🎯","📚","💻","🏡","❤️","🎵","🧘","🍎","✈️","💰","📅","⏰","🎨"];
const STATUSES = [
  {id:"todo", label:"To Do", short:"To Do", icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="8.5"/></svg>'},
  {id:"progress", label:"In Progress", short:"Progress", icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="8.5"/><path d="M12 12L12 5"/></svg>'},
  {id:"done", label:"Completed", short:"Completed", icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'}
];
function statusOf(id){ return STATUSES.find(s=>s.id===id) || STATUSES[0]; }
const DEFAULT_CATEGORIES = [
  {id:"cat-personal", name:"Personal", color:"#B624FF"},
  {id:"cat-work", name:"Work", color:"#2373E0"},
  {id:"cat-shopping", name:"Shopping", color:"#D9A214"},
  {id:"cat-health", name:"Health", color:"#16A36B"},
];
const SUBTITLES = [
  "Happy to see you back.",
  "Make every moment count.",
  "Be efficient, be productive.",
  "Unlock your productivity potential.",
  "One task at a time.",
  "Small steps, big progress."
];

let state = {
  tasks: [],
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  profile: {name:"", avatar:"", registered: Date.now()},
  settings: {theme:"light", bannerDismissed:false, sort:"created", subtitleIdx:0}
};
let editingTaskId = null;
let activeCategoryFilter = "all";
let activeStatusFilter = "all";
let storageVersion = "new";
let saveTimer = null;

/* ---------------- Utilities ---------------- */
function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8);
    return v.toString(16);
  });
}
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}
function timeAgoOrDate(ts){
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  if(sameDay) return "today " + time;
  const yest = new Date(now); yest.setDate(now.getDate()-1);
  if(d.toDateString() === yest.toDateString()) return "yesterday " + time;
  return d.toLocaleDateString([], {month:'short', day:'numeric'}) + " " + time;
}
function fullDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric', year:'numeric'}) + " at " + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function hexToRgb(hex){
  const v = hex.replace('#','');
  const n = parseInt(v,16);
  return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
}
function darken(hex, amt){
  const {r,g,b} = hexToRgb(hex);
  const f = (c)=> Math.max(0, Math.min(255, Math.round(c*(1-amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function catById(id){ return state.categories.find(c=>c.id===id); }
function setTaskStatus(task, status){
  task.status = status;
  task.done = status === 'done';
}
function initials(name){
  if(!name) return "U";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?parts[1][0]:'')).toUpperCase();
}

/* ---------------- Storage ---------------- */
async function loadState(){
  try{
    const res = await window.storage.get('app-state', false);
    if(res && res.value){
      const parsed = JSON.parse(res.value);
      state = Object.assign(state, parsed);
      if(!state.categories || !state.categories.length) state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      if(!state.settings) state.settings = {theme:"light", bannerDismissed:false, sort:"created", subtitleIdx:0};
      if(!state.profile) state.profile = {name:"", avatar:"", registered: Date.now()};
      (state.tasks||[]).forEach(t=>{
        if(!t.status) t.status = t.done ? 'done' : 'todo';
        t.done = t.status === 'done';
      });
    } else {
      state.profile.registered = Date.now();
      await persist();
    }
  }catch(e){
    console.warn("No existing state, starting fresh.", e);
    state.profile.registered = Date.now();
  }
}
async function persist(){
  clearTimeout(saveTimer);
  return new Promise((resolve)=>{
    saveTimer = setTimeout(async ()=>{
      try{
        const result = await window.storage.set('app-state', JSON.stringify(state), false);
        resolve(result);
      }catch(e){
        console.error("Save failed", e);
        showToast("⚠️ Could not save — check connection");
        resolve(null);
      }
    }, 150);
  });
}

/* ---------------- Toast ---------------- */
function showToast(msg){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(10px)'; el.style.transition='all .25s'; setTimeout(()=>el.remove(), 260); }, 2200);
}

/* ---------------- Confetti ---------------- */
function burstConfetti(){
  const colors = ['#B624FF','#E23E8B','#F2734C','#D9A214','#16A36B','#2373E0'];
  for(let i=0;i<36;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 6+Math.random()*6;
    p.style.width = size+'px';
    p.style.height = (size*0.4+4)+'px';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.left = (Math.random()*100)+'vw';
    p.style.transform = `rotate(${Math.random()*360}deg)`;
    document.body.appendChild(p);
    const duration = 1400+Math.random()*900;
    const drift = (Math.random()-0.5)*200;
    p.animate([
      {transform:`translate(0,0) rotate(0deg)`, opacity:1},
      {transform:`translate(${drift}px, 100vh) rotate(${360+Math.random()*360}deg)`, opacity:0}
    ], {duration, easing:'cubic-bezier(.25,.46,.45,.94)'});
    setTimeout(()=>p.remove(), duration+50);
  }
}

/* ---------------- Greeting ---------------- */
function updateGreeting(){
  const h = new Date().getHours();
  let g = "Good morning", emoji="👋";
  if(h>=12 && h<17){ g="Good afternoon"; emoji="☀️"; }
  else if(h>=17 && h<21){ g="Good evening"; emoji="🌆"; }
  else if(h>=21 || h<5){ g="Good night"; emoji="🌙"; }
  const name = state.profile.name ? `, ${state.profile.name.split(' ')[0]}` : "";
  document.getElementById('greetingText').innerHTML = `${emoji} ${g}${name}`;
  document.getElementById('greetingSub').textContent = SUBTITLES[state.settings.subtitleIdx % SUBTITLES.length];
}

/* ---------------- Render: Progress ---------------- */
function renderProgress(){
  const total = state.tasks.length;
  const done = state.tasks.filter(t=>t.done).length;
  const pct = total ? Math.round((done/total)*100) : 0;
  const card = document.getElementById('progressCard');
  card.style.display = state.settings.bannerDismissed ? 'none' : 'flex';

  const circumference = 150.8;
  const offset = circumference - (pct/100)*circumference;
  document.getElementById('ringFg').style.strokeDashoffset = offset;
  document.getElementById('ringLabel').textContent = pct + '%';

  const remaining = total - done;
  document.getElementById('progressHeadline').textContent =
    total===0 ? "You have no tasks yet." : `You have ${remaining} task${remaining!==1?'s':''} to complete.`;
  let sub = "No tasks completed yet. Keep going!";
  if(pct===100 && total>0) sub = "🎉 All done! You're unstoppable.";
  else if(done>0) sub = `${done} of ${total} tasks completed. Keep going!`;
  document.getElementById('progressSub').textContent = sub;

  if(pct===100 && total>0 && !state._confettiFired){
    state._confettiFired = true;
    burstConfetti();
  } else if(pct!==100){
    state._confettiFired = false;
  }
}

/* ---------------- Render: Status Tabs ---------------- */
function renderStatusTabs(){
  const wrap = document.getElementById('statusTabs');
  const counts = {
    all: state.tasks.length,
    todo: state.tasks.filter(t=>t.status==='todo').length,
    progress: state.tasks.filter(t=>t.status==='progress').length,
    done: state.tasks.filter(t=>t.status==='done').length
  };
  const tabs = [
    {id:'all', label:'All'},
    {id:'todo', label:'To Do'},
    {id:'progress', label:'Progress'},
    {id:'done', label:'Completed'}
  ];
  wrap.innerHTML = tabs.map(tb=>`
    <button class="status-tab ${activeStatusFilter===tb.id?'active':''}" data-status="${tb.id}">
      ${escapeHtml(tb.label)} <span class="count">${counts[tb.id]}</span>
    </button>
  `).join('');
  wrap.querySelectorAll('.status-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeStatusFilter = btn.dataset.status;
      renderStatusTabs();
      renderTasks();
    });
  });
}

/* ---------------- Render: Chips ---------------- */
function renderChips(){
  const row = document.getElementById('chipRow');
  let html = `<button class="chip ${activeCategoryFilter==='all'?'active':''}" data-cat="all" style="${activeCategoryFilter==='all'?'background:linear-gradient(135deg,var(--accent),var(--accent-2))':''}">All Tasks</button>`;
  state.categories.forEach(c=>{
    const active = activeCategoryFilter===c.id;
    html += `<button class="chip ${active?'active':''}" data-cat="${c.id}" style="${active?`background:${c.color}`:''}">
      <span class="dot" style="background:${c.color}"></span>${escapeHtml(c.name)}
    </button>`;
  });
  row.innerHTML = html;
  row.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeCategoryFilter = btn.dataset.cat;
      renderChips();
      renderTasks();
    });
  });
}

/* ---------------- Render: Task List ---------------- */
function getFilteredSortedTasks(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  let list = state.tasks.filter(t=>{
    if(activeCategoryFilter!=='all' && t.categoryId!==activeCategoryFilter) return false;
    if(activeStatusFilter!=='all' && t.status!==activeStatusFilter) return false;
    if(q && !(t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q))) return false;
    return true;
  });
  const sortMode = state.settings.sort;
  list.sort((a,b)=>{
    if(!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    if(sortMode==='due'){
      if(!a.deadline && !b.deadline) return b.createdAt-a.createdAt;
      if(!a.deadline) return 1;
      if(!b.deadline) return -1;
      return new Date(a.deadline)-new Date(b.deadline);
    }
    if(sortMode==='az') return a.title.localeCompare(b.title);
    if(sortMode==='color'){
      const ca = catById(a.categoryId), cb = catById(b.categoryId);
      return (ca?ca.color:'').localeCompare(cb?cb.color:'');
    }
    return b.createdAt - a.createdAt;
  });
  return list;
}

function renderTasks(){
  const listEl = document.getElementById('taskList');
  const list = getFilteredSortedTasks();
  if(list.length===0){
    const hasAny = state.tasks.length>0;
    listEl.innerHTML = `<div class="empty-state">
      <div class="icon">${hasAny?'🔍':'🗒️'}</div>
      <b>${hasAny?'No matching tasks':"You don't have any tasks yet"}</b>
      <span>${hasAny?'Try a different search or filter':'Click on the + button to add one'}</span>
    </div>`;
  } else {
    listEl.innerHTML = list.map(t=>{
      const cat = catById(t.categoryId);
      const color = cat ? cat.color : '#5D6478';
      const overdue = t.deadline && t.status!=='done' && new Date(t.deadline) < new Date();
      const st = statusOf(t.status);
      return `<div class="task-card ${t.status==='done'?'done':''}" data-id="${t.id}" style="background:linear-gradient(135deg, ${color}, ${darken(color,-0.15)});">
        <div class="texture"></div>
        ${t.pinned ? `<div class="flag-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 17v5M8 3h8l-1 6 3 3H6l3-3-1-6z"/></svg>Pinned</div>` : ''}
        <div class="status-badge">${st.icon}${escapeHtml(st.label)}</div>
        <div class="title-row">
          ${t.emoji ? `<span class="emoji">${t.emoji}</span>` : ''}
          <h3 class="${t.status==='done'?'strike':''}">${escapeHtml(t.title)}</h3>
        </div>
        ${t.description ? `<p>${escapeHtml(t.description.slice(0,80))}${t.description.length>80?'…':''}</p>` : ''}
        <div class="meta">
          <span>${escapeHtml(cat?cat.name:'Uncategorized')}</span>
          ${t.deadline ? `<span>${overdue?'⏰':'📅'} ${new Date(t.deadline).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>` : `<span>${timeAgoOrDate(t.createdAt)}</span>`}
        </div>
        <button class="kebab" data-kebab="${t.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        ${t.status==='done' ? `<div class="check-badge"><svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>` : ''}
      </div>`;
    }).join('');
  }
  listEl.querySelectorAll('.task-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest('[data-kebab]')) return;
      openTaskDetails(card.dataset.id);
    });
  });
  listEl.querySelectorAll('[data-kebab]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openKebabMenu(btn.dataset.kebab, btn);
    });
  });
  document.getElementById('navTaskCount').textContent = state.tasks.filter(t=>!t.done).length;
}

/* ---------------- Kebab Menu ---------------- */
function openKebabMenu(taskId, anchorEl){
  const task = state.tasks.find(t=>t.id===taskId);
  if(!task) return;
  const menu = document.getElementById('kebabMenu');
  menu.innerHTML = `
    <div style="padding:10px 15px 6px; font-size:10.5px; font-weight:700; letter-spacing:.04em; color:var(--ink-faint); text-transform:uppercase;">Status</div>
    ${STATUSES.map(s=>`
      <button data-status="${s.id}" style="${task.status===s.id?'color:var(--accent);font-weight:700;':''}">
        ${s.icon}${escapeHtml(s.label)} ${task.status===s.id?'✓':''}
      </button>
    `).join('')}
    <hr>
    <button data-act="togglePin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5M8 3h8l-1 6 3 3H6l3-3-1-6z"/></svg>
      ${task.pinned ? 'Unpin' : 'Pin'}
    </button>
    <button data-act="move">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l7-7 7 7M5 15l7 7 7-7"/></svg>
      Move to Category
    </button>
    <button data-act="details">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      Task Details
    </button>
    <button data-act="read">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>
      Read Aloud
    </button>
    <button data-act="share">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
      Share
    </button>
    <hr>
    <button data-act="edit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
      Edit
    </button>
    <button data-act="duplicate">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      Duplicate
    </button>
    <button data-act="delete" class="danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
      Delete
    </button>
  `;
  const rect = anchorEl.getBoundingClientRect();
  const menuWidth = Math.min(230, window.innerWidth - 20);
  let left = rect.right - menuWidth;
  if(left < 10) left = 10;
  if(left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
  let top = rect.bottom + 6;
  document.body.appendChild(menu);
  menu.style.maxWidth = menuWidth + 'px';
  requestAnimationFrame(()=>{
    const menuH = menu.offsetHeight;
    const viewportH = window.innerHeight;
    // Prefer opening below the anchor; flip above only if there's more room there.
    if(top + menuH > viewportH - 10){
      const spaceAbove = rect.top - 10;
      const spaceBelow = viewportH - rect.bottom - 10;
      if(spaceAbove > spaceBelow){
        top = rect.top - menuH - 6;
      }
    }
    // Always clamp fully inside the viewport, never letting it get cropped off-screen.
    if(top < 10) top = 10;
    if(top + menuH > viewportH - 10) top = Math.max(10, viewportH - menuH - 10);
    menu.style.left = left+'px';
    menu.style.top = top+'px';
    menu.classList.add('show');
  });

  menu.querySelectorAll('button[data-act]').forEach(b=>{
    b.onclick = async ()=>{
      closeKebabMenu();
      await handleKebabAction(b.dataset.act, task);
    };
  });
  menu.querySelectorAll('button[data-status]').forEach(b=>{
    b.onclick = async ()=>{
      closeKebabMenu();
      setTaskStatus(task, b.dataset.status);
      await persist(); renderAll();
      showToast(`${statusOf(b.dataset.status).label} set`);
    };
  });

  setTimeout(()=>{
    document.addEventListener('click', kebabOutsideHandler);
  },0);
}
function kebabOutsideHandler(e){
  const menu = document.getElementById('kebabMenu');
  if(!menu.contains(e.target)){ closeKebabMenu(); }
}
function closeKebabMenu(){
  const menu = document.getElementById('kebabMenu');
  menu.classList.remove('show');
  document.removeEventListener('click', kebabOutsideHandler);
}

async function handleKebabAction(act, task){
  switch(act){
    case 'togglePin':
      task.pinned = !task.pinned;
      await persist(); renderAll();
      showToast(task.pinned ? '📌 Pinned to top' : 'Unpinned');
      break;
    case 'move':
      openMoveSheet(task);
      break;
    case 'details':
      openTaskDetails(task.id);
      break;
    case 'read':
      readAloud(task);
      break;
    case 'share':
      shareTask(task);
      break;
    case 'edit':
      openTaskSheet(task);
      break;
    case 'duplicate':
      const clone = Object.assign({}, task, {id: uuid(), createdAt: Date.now(), title: task.title + ' (copy)'});
      state.tasks.unshift(clone);
      await persist(); renderAll();
      showToast('📄 Task duplicated');
      break;
    case 'delete':
      askConfirm({
        title:'Delete this task?',
        text:`"${task.title}" will be permanently removed.`,
        icon:'🗑️',
        okLabel:'Delete',
        onOk: async ()=>{
          state.tasks = state.tasks.filter(t=>t.id!==task.id);
          await persist(); renderAll();
          showToast('🗑️ Task deleted');
        }
      });
      break;
  }
}

function readAloud(task){
  if(!('speechSynthesis' in window)){
    showToast('Read aloud not supported on this device');
    return;
  }
  window.speechSynthesis.cancel();
  const text = task.title + (task.description ? '. ' + task.description : '');
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.98;
  window.speechSynthesis.speak(utter);
  showToast('🔊 Reading task aloud');
}

async function shareTask(task){
  const cat = catById(task.categoryId);
  const text = `${task.title}${task.description ? '\n' + task.description : ''}${task.deadline ? '\nDue: ' + new Date(task.deadline).toLocaleString() : ''}\nCategory: ${cat?cat.name:'Uncategorized'}`;
  if(navigator.share){
    try{ await navigator.share({title: task.title, text}); }catch(e){ /* cancelled */ }
  } else if(navigator.clipboard){
    await navigator.clipboard.writeText(text);
    showToast('🔗 Task copied to clipboard');
  } else {
    showToast('Sharing not supported on this device');
  }
}

function openMoveSheet(task){
  const options = state.categories.map(c=>`<button class="cat-pill ${task.categoryId===c.id?'selected':''}" data-cat="${c.id}" style="${task.categoryId===c.id?`background:${c.color}`:''}"><span class="dot" style="background:${c.color}"></span>${escapeHtml(c.name)}</button>`).join('');
  const menu = document.getElementById('kebabMenu');
  menu.innerHTML = `<div style="padding:14px;">
    <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--ink-muted);">MOVE "${escapeHtml(task.title.slice(0,20))}" TO</div>
    <div class="cat-select-row">${options}</div>
  </div>`;
  const menuWidth = Math.min(280, window.innerWidth - 20);
  menu.style.minWidth = Math.min(260, menuWidth) + 'px';
  menu.style.maxWidth = menuWidth + 'px';
  const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, window.innerWidth/2 - menuWidth/2));
  const top = Math.max(10, window.innerHeight/2 - 100);
  document.body.appendChild(menu);
  menu.style.left = left+'px';
  menu.style.top = top+'px';
  menu.classList.add('show');
  menu.querySelectorAll('[data-cat]').forEach(btn=>{
    btn.onclick = async ()=>{
      task.categoryId = btn.dataset.cat;
      await persist(); renderAll();
      closeKebabMenu();
      showToast('📁 Task moved');
    };
  });
  setTimeout(()=>document.addEventListener('click', kebabOutsideHandler),0);
}

/* ---------------- Task Details ---------------- */
function openTaskDetails(taskId){
  const t = state.tasks.find(x=>x.id===taskId);
  if(!t) return;
  const cat = catById(t.categoryId);
  document.getElementById('detailTitle').textContent = 'Task: ' + t.title;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row"><b>Emoji</b><span>${t.emoji || 'none'}</span></div>
    <div class="detail-row"><b>ID</b><span class="mono" style="font-size:11.5px;">${t.id}</span></div>
    <div class="detail-row"><b>Description</b><span>${t.description ? escapeHtml(t.description) : '—'}</span></div>
    <div class="detail-row"><b>Status</b><span>${statusOf(t.status).label}</span></div>
    <div class="detail-row"><b>Category</b><span>${cat?escapeHtml(cat.name):'Uncategorized'}</span></div>
    <div class="detail-row"><b>Color</b><span>${cat?cat.color:'—'}</span></div>
    <div class="detail-row"><b>Deadline</b><span>${t.deadline ? fullDate(t.deadline) : 'No deadline'}</span></div>
    <div class="detail-row"><b>Created</b><span>${fullDate(t.createdAt)}</span></div>
    <div class="detail-row"><b>Done</b><span class="${t.done}">${t.done}</span></div>
    <div class="detail-row"><b>Pinned</b><span class="${!!t.pinned}">${!!t.pinned}</span></div>
  `;
  openSheet('detailSheet');
}

/* ---------------- Add / Edit Task Sheet ---------------- */
function buildFormOptions(selectedCat, selectedColor, selectedEmoji, selectedStatus){
  const statusRow = document.getElementById('fStatusRow');
  statusRow.innerHTML = STATUSES.map(s=>
    `<button type="button" class="cat-pill ${selectedStatus===s.id?'selected':''}" data-status="${s.id}" style="${selectedStatus===s.id?'background:var(--accent)':''}">${s.icon}${escapeHtml(s.label)}</button>`
  ).join('');
  statusRow.querySelectorAll('.cat-pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      statusRow.querySelectorAll('.cat-pill').forEach(b=>{b.classList.remove('selected'); b.style.background='';});
      btn.classList.add('selected');
      btn.style.background = 'var(--accent)';
      statusRow.dataset.selected = btn.dataset.status;
    });
  });
  statusRow.dataset.selected = selectedStatus || 'todo';

  const catRow = document.getElementById('fCatRow');
  catRow.innerHTML = state.categories.map(c=>
    `<button type="button" class="cat-pill ${selectedCat===c.id?'selected':''}" data-cat="${c.id}" style="${selectedCat===c.id?`background:${c.color}`:''}"><span class="dot" style="background:${c.color}"></span>${escapeHtml(c.name)}</button>`
  ).join('');
  catRow.querySelectorAll('.cat-pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      catRow.querySelectorAll('.cat-pill').forEach(b=>{b.classList.remove('selected'); b.style.background='';});
      btn.classList.add('selected');
      const c = catById(btn.dataset.cat);
      btn.style.background = c.color;
      catRow.dataset.selected = btn.dataset.cat;
    });
  });
  catRow.dataset.selected = selectedCat;

  const colorGrid = document.getElementById('fColorGrid');
  colorGrid.innerHTML = COLORS.map(c=>
    `<button type="button" class="color-opt ${selectedColor===c.hex?'selected':''}" data-hex="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`
  ).join('');
  colorGrid.querySelectorAll('.color-opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      colorGrid.querySelectorAll('.color-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      colorGrid.dataset.selected = btn.dataset.hex;
    });
  });
  colorGrid.dataset.selected = selectedColor || COLORS[0].hex;

  const emojiGrid = document.getElementById('fEmojiGrid');
  emojiGrid.innerHTML = EMOJIS.map(e=>
    `<button type="button" class="emoji-opt ${selectedEmoji===e?'selected':''}" data-emoji="${e}">${e}</button>`
  ).join('');
  emojiGrid.querySelectorAll('.emoji-opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const already = btn.classList.contains('selected');
      emojiGrid.querySelectorAll('.emoji-opt').forEach(b=>b.classList.remove('selected'));
      if(!already){ btn.classList.add('selected'); emojiGrid.dataset.selected = btn.dataset.emoji; }
      else emojiGrid.dataset.selected = '';
    });
  });
  emojiGrid.dataset.selected = selectedEmoji || '';
}

function openTaskSheet(task){
  editingTaskId = task ? task.id : null;
  document.getElementById('taskSheetTitle').textContent = task ? 'Edit Task' : 'Add New Task';
  document.getElementById('fSubmitBtn').textContent = task ? 'Save Changes' : 'Create Task';
  document.getElementById('fTitle').value = task ? task.title : '';
  document.getElementById('fDesc').value = task ? (task.description||'') : '';
  document.getElementById('fDeadline').value = task && task.deadline ? toLocalInputValue(task.deadline) : '';
  const defaultCat = state.categories[0] ? state.categories[0].id : '';
  buildFormOptions(task ? task.categoryId : defaultCat, task ? (catById(task.categoryId)||{}).color : COLORS[0].hex, task ? task.emoji : '', task ? task.status : 'todo');
  openSheet('taskSheet');
  setTimeout(()=>document.getElementById('fTitle').focus(), 350);
}
function toLocalInputValue(iso){
  const d = new Date(iso);
  const pad = n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function submitTaskForm(){
  const title = document.getElementById('fTitle').value.trim();
  if(!title){ showToast('⚠️ Give your task a title'); document.getElementById('fTitle').focus(); return; }
  const desc = document.getElementById('fDesc').value.trim();
  const deadlineRaw = document.getElementById('fDeadline').value;
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
  const categoryId = document.getElementById('fCatRow').dataset.selected || (state.categories[0]||{}).id;
  const emoji = document.getElementById('fEmojiGrid').dataset.selected || '';
  const status = document.getElementById('fStatusRow').dataset.selected || 'todo';

  if(editingTaskId){
    const t = state.tasks.find(x=>x.id===editingTaskId);
    Object.assign(t, {title, description:desc, deadline, categoryId, emoji});
    setTaskStatus(t, status);
    showToast('✏️ Task updated');
  } else {
    const t = {
      id: uuid(), title, description:desc, deadline, categoryId, emoji,
      pinned:false, createdAt: Date.now()
    };
    setTaskStatus(t, status);
    state.tasks.unshift(t);
    showToast('✅ Task created');
  }
  await persist();
  closeSheet('taskSheet');
  renderAll();
}

/* ---------------- Categories management ---------------- */
function renderCategoriesSheet(){
  const list = document.getElementById('catList');
  list.innerHTML = state.categories.map(c=>{
    const count = state.tasks.filter(t=>t.categoryId===c.id).length;
    return `<div class="cat-manage-item">
      <span class="dot" style="background:${c.color}"></span>
      <span class="name">${escapeHtml(c.name)}</span>
      <span class="count">${count} task${count!==1?'s':''}</span>
      <button data-del="${c.id}" aria-label="Delete category">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
      </button>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(state.categories.length<=1){ showToast('⚠️ Keep at least one category'); return; }
      askConfirm({
        title:'Delete this category?',
        text:'Tasks in this category will move to the first remaining category.',
        icon:'📁',
        okLabel:'Delete',
        onOk: async ()=>{
          const id = btn.dataset.del;
          state.categories = state.categories.filter(c=>c.id!==id);
          const fallback = state.categories[0].id;
          state.tasks.forEach(t=>{ if(t.categoryId===id) t.categoryId = fallback; });
          if(activeCategoryFilter===id) activeCategoryFilter='all';
          await persist(); renderAll(); renderCategoriesSheet();
          showToast('🗑️ Category deleted');
        }
      });
    });
  });

  const grid = document.getElementById('newCatColorGrid');
  grid.innerHTML = COLORS.map((c,i)=>`<button type="button" class="color-opt ${i===0?'selected':''}" data-hex="${c.hex}" style="background:${c.hex}"></button>`).join('');
  grid.dataset.selected = COLORS[0].hex;
  grid.querySelectorAll('.color-opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      grid.querySelectorAll('.color-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      grid.dataset.selected = btn.dataset.hex;
    });
  });
}

async function addCategory(){
  const nameInput = document.getElementById('newCatName');
  const name = nameInput.value.trim();
  if(!name){ showToast('⚠️ Give the category a name'); return; }
  const color = document.getElementById('newCatColorGrid').dataset.selected || COLORS[0].hex;
  state.categories.push({id:'cat-'+uuid(), name, color});
  await persist();
  nameInput.value = '';
  renderCategoriesSheet();
  renderChips();
  showToast('📁 Category added');
}

/* ---------------- Purge ---------------- */
async function purgeCompleted(){
  const n = state.tasks.filter(t=>t.done).length;
  if(n===0){ showToast('No completed tasks to clear'); return; }
  askConfirm({
    title:'Clear completed tasks?',
    text:`${n} completed task${n!==1?'s':''} will be permanently deleted.`,
    icon:'🧹', okLabel:'Clear',
    onOk: async ()=>{
      state.tasks = state.tasks.filter(t=>!t.done);
      await persist(); renderAll();
      showToast('🧹 Completed tasks cleared');
    }
  });
}
async function purgeAll(){
  if(state.tasks.length===0){ showToast('You have no tasks to delete'); return; }
  askConfirm({
    title:'Delete ALL tasks?',
    text:'Every task will be permanently removed. This cannot be undone.',
    icon:'🗑️', okLabel:'Delete All',
    onOk: async ()=>{
      state.tasks = [];
      await persist(); renderAll();
      showToast('🗑️ All tasks deleted');
    }
  });
}

/* ---------------- Transfer (export/import) ---------------- */
function exportBackup(){
  const payload = {tasks: state.tasks, categories: state.categories, profile: state.profile, exportedAt: new Date().toISOString()};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flux-todo-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('⬇ Backup downloaded');
}
function importBackup(file){
  const reader = new FileReader();
  reader.onload = async (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!data.tasks || !Array.isArray(data.tasks)) throw new Error('Invalid file');
      askConfirm({
        title:'Import backup?',
        text:`This will add ${data.tasks.length} task(s) and ${data.categories?data.categories.length:0} categories to your current list.`,
        icon:'⬆', okLabel:'Import',
        onOk: async ()=>{
          if(data.categories){
            data.categories.forEach(c=>{
              if(!state.categories.find(existing=>existing.id===c.id)) state.categories.push(c);
            });
          }
          data.tasks.forEach(t=>{
            if(!state.tasks.find(existing=>existing.id===t.id)) state.tasks.push(t);
            else t.id = uuid(), state.tasks.push(t);
          });
          await persist(); renderAll(); renderCategoriesSheet();
          showToast('✅ Backup imported');
        }
      });
    }catch(err){
      showToast('⚠️ Could not read that file');
    }
  };
  reader.readAsText(file);
}

/* ---------------- Profile ---------------- */
function renderProfile(){
  const av = document.getElementById('profileAvatarBig');
  const avSmall = document.getElementById('avatarBtn');
  if(state.profile.avatar){
    av.innerHTML = `<img src="${state.profile.avatar}">`;
    avSmall.innerHTML = `<img src="${state.profile.avatar}">`;
  } else {
    const init = initials(state.profile.name);
    av.textContent = init;
    avSmall.textContent = init;
  }
  document.getElementById('profileName').textContent = state.profile.name || 'User';
  document.getElementById('profileNameInput').value = state.profile.name || '';
  const mins = Math.max(1, Math.round((Date.now()-state.profile.registered)/60000));
  let regText;
  if(mins < 60) regText = `Registered ${mins} minute${mins!==1?'s':''} ago`;
  else if(mins < 1440) regText = `Registered ${Math.round(mins/60)} hour${Math.round(mins/60)!==1?'s':''} ago`;
  else regText = `Registered ${Math.round(mins/1440)} day${Math.round(mins/1440)!==1?'s':''} ago`;
  document.getElementById('profileRegistered').textContent = regText;

  document.getElementById('statTotal').textContent = state.tasks.length;
  document.getElementById('statDone').textContent = state.tasks.filter(t=>t.done).length;

  const isDark = state.settings.theme==='dark';
  document.getElementById('themeSwitch').classList.toggle('on', isDark);
}

/* ---------------- Sync sheet stats ---------------- */
function renderSyncStats(){
  document.getElementById('syncTaskCount').textContent = state.tasks.length;
  document.getElementById('syncCatCount').textContent = state.categories.length;
}

/* ---------------- Theme ---------------- */
function applyTheme(){
  document.body.setAttribute('data-theme', state.settings.theme);
  document.getElementById('themeNavLabel').textContent = state.settings.theme==='dark' ? 'Light Mode' : 'Dark Mode';
}
async function toggleTheme(){
  state.settings.theme = state.settings.theme==='dark' ? 'light' : 'dark';
  applyTheme();
  document.getElementById('themeSwitch').classList.toggle('on', state.settings.theme==='dark');
  await persist();
}

/* ---------------- Sheets / Sidebar / Overlay ---------------- */
function openSheet(id){
  closeAllSheets();
  document.getElementById('overlay').classList.add('show');
  document.getElementById(id).classList.add('show');
}
function closeSheet(id){
  document.getElementById(id).classList.remove('show');
  if(!anySheetOpen() && !document.getElementById('sidebar').classList.contains('show')){
    document.getElementById('overlay').classList.remove('show');
  }
}
function closeAllSheets(){
  document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));
}
function anySheetOpen(){
  return !!document.querySelector('.sheet.show');
}
function openSidebar(){
  document.getElementById('sidebar').classList.add('show');
  document.getElementById('overlay').classList.add('show');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('show');
  if(!anySheetOpen()) document.getElementById('overlay').classList.remove('show');
}

document.getElementById('overlay').addEventListener('click', ()=>{
  closeAllSheets();
  closeSidebar();
  document.getElementById('overlay').classList.remove('show');
});

/* ---------------- Confirm modal ---------------- */
let confirmCallback = null;
function askConfirm({title, text, icon, okLabel, onOk}){
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmIcon').textContent = icon || '⚠️';
  document.getElementById('confirmOk').textContent = okLabel || 'Confirm';
  confirmCallback = onOk;
  document.getElementById('confirmModal').classList.add('show');
}
document.getElementById('confirmCancel').addEventListener('click', ()=>{
  document.getElementById('confirmModal').classList.remove('show');
  confirmCallback = null;
});
document.getElementById('confirmOk').addEventListener('click', async ()=>{
  document.getElementById('confirmModal').classList.remove('show');
  if(confirmCallback) await confirmCallback();
  confirmCallback = null;
});

/* ---------------- Render all ---------------- */
function renderAll(){
  updateGreeting();
  renderProgress();
  renderStatusTabs();
  renderChips();
  renderTasks();
  renderProfile();
  renderSyncStats();
}

/* ---------------- Event wiring ---------------- */
document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('avatarBtn').addEventListener('click', ()=>{ renderProfile(); openSheet('profileSheet'); });

document.getElementById('progressClose').addEventListener('click', async ()=>{
  state.settings.bannerDismissed = true;
  await persist();
  renderProgress();
});

document.getElementById('searchInput').addEventListener('input', renderTasks);

document.getElementById('sortBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('sortMenu').classList.toggle('open');
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.sort-box')) document.getElementById('sortMenu').classList.remove('open');
});
document.getElementById('sortMenu').querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    state.settings.sort = btn.dataset.sort;
    document.getElementById('sortLabel').textContent = btn.textContent;
    document.getElementById('sortMenu').classList.remove('open');
    await persist();
    renderTasks();
  });
});

document.getElementById('fabBtn').addEventListener('click', ()=>openTaskSheet(null));
document.getElementById('taskSheetClose').addEventListener('click', ()=>closeSheet('taskSheet'));
document.getElementById('fSubmitBtn').addEventListener('click', submitTaskForm);
document.getElementById('detailSheetClose').addEventListener('click', ()=>closeSheet('detailSheet'));

document.querySelectorAll('[data-nav]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    btn.classList.add('active');
    const nav = btn.dataset.nav;
    closeSidebar();
    document.getElementById('overlay').classList.remove('show');
    if(nav==='tasks'){ /* already home */ }
    else if(nav==='add'){ openTaskSheet(null); }
    else if(nav==='categories'){ renderCategoriesSheet(); openSheet('catSheet'); }
    else if(nav==='purge'){ openSheet('purgeSheet'); }
    else if(nav==='transfer'){ openSheet('transferSheet'); }
    else if(nav==='sync'){ renderSyncStats(); openSheet('syncSheet'); }
    else if(nav==='profile'){ renderProfile(); openSheet('profileSheet'); }
  });
});
document.getElementById('themeNavBtn').addEventListener('click', toggleTheme);
document.getElementById('resetBtn').addEventListener('click', ()=>{
  askConfirm({
    title:'Log out & reset?',
    text:'This clears your name and dismisses banners on this device. Your tasks stay saved.',
    icon:'↩', okLabel:'Reset',
    onOk: async ()=>{
      state.profile.name = '';
      state.profile.avatar = '';
      state.settings.bannerDismissed = false;
      await persist(); renderAll();
      closeSidebar(); document.getElementById('overlay').classList.remove('show');
      showToast('↩ Logged out');
    }
  });
});

document.getElementById('catSheetClose').addEventListener('click', ()=>closeSheet('catSheet'));
document.getElementById('addCatBtn').addEventListener('click', addCategory);
document.getElementById('purgeSheetClose').addEventListener('click', ()=>closeSheet('purgeSheet'));
document.getElementById('purgeCompletedBtn').addEventListener('click', purgeCompleted);
document.getElementById('purgeAllBtn').addEventListener('click', purgeAll);

document.getElementById('transferSheetClose').addEventListener('click', ()=>closeSheet('transferSheet'));
document.getElementById('exportBtn').addEventListener('click', exportBackup);
document.getElementById('importFile').addEventListener('change', (e)=>{
  if(e.target.files[0]) importBackup(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('syncSheetClose').addEventListener('click', ()=>closeSheet('syncSheet'));

document.getElementById('profileSheetClose').addEventListener('click', ()=>closeSheet('profileSheet'));
document.getElementById('saveNameBtn').addEventListener('click', async ()=>{
  const val = document.getElementById('profileNameInput').value.trim();
  state.profile.name = val;
  await persist();
  renderProfile(); updateGreeting();
  showToast('✅ Name saved');
});
document.getElementById('avatarFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 1.5*1024*1024){ showToast('⚠️ Please choose an image under 1.5MB'); return; }
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    state.profile.avatar = ev.target.result;
    await persist();
    renderProfile();
    showToast('🖼️ Avatar updated');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});
document.getElementById('themeSwitch').addEventListener('click', toggleTheme);
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  askConfirm({
    title:'Log out?',
    text:'Your name and photo will be cleared from this device. Your tasks remain saved.',
    icon:'↩', okLabel:'Log Out',
    onOk: async ()=>{
      state.profile.name = '';
      state.profile.avatar = '';
      await persist(); renderAll();
      closeSheet('profileSheet');
      showToast('↩ Logged out');
    }
  });
});

document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape'){
    closeAllSheets(); closeSidebar();
    document.getElementById('overlay').classList.remove('show');
    closeKebabMenu();
  }
});

/* ---------------- Init ---------------- */
async function init(){
  await loadState();
  applyTheme();
  renderAll();
  document.getElementById('sortLabel').textContent =
    {created:'Date Created', due:'Due Date', az:'Alphabetical', color:'Category Color'}[state.settings.sort] || 'Date Created';
}
init();

})();

(function(){
"use strict";
/* Ambient twinkling sparkle field — purely decorative, additive to the app above */
function seedSparkles(){
  const field = document.getElementById('sparkleField');
  if(!field) return;
  const count = window.innerWidth < 480 ? 16 : 26;
  let html = '';
  for(let i=0;i<count;i++){
    const size = (Math.random()*2.4 + 1.2).toFixed(2);
    const top = (Math.random()*100).toFixed(2);
    const left = (Math.random()*100).toFixed(2);
    const dur = (Math.random()*4 + 3.5).toFixed(2);
    const delay = (Math.random()*6).toFixed(2);
    const op = (Math.random()*0.5 + 0.4).toFixed(2);
    html += `<span class="spark" style="width:${size}px;height:${size}px;top:${top}%;left:${left}%;--spark-o:${op};animation-duration:${dur}s;animation-delay:${delay}s;"></span>`;
  }
  field.innerHTML = html;
}
seedSparkles();
window.addEventListener('resize', ()=>{
  clearTimeout(window.__sparkleResizeTimer);
  window.__sparkleResizeTimer = setTimeout(seedSparkles, 300);
});

/* Extra gold sparkle glyphs whenever progress hits 100% — observes the DOM directly
   so it works alongside the app's own confetti without touching its internals. */
(function(){
  const label = document.getElementById('ringLabel');
  if(!label) return;
  let lastFired = '';
  function goldBurst(){
    for(let i=0;i<10;i++){
      const s = document.createElement('div');
      s.textContent = '✨';
      s.style.position = 'fixed';
      s.style.top = '-20px';
      s.style.left = (Math.random()*100)+'vw';
      s.style.fontSize = (12+Math.random()*10)+'px';
      s.style.zIndex = '200';
      s.style.pointerEvents = 'none';
      document.body.appendChild(s);
      const duration = 1500+Math.random()*900;
      const drift = (Math.random()-0.5)*160;
      s.animate([
        {transform:'translate(0,0) rotate(0deg)', opacity:1},
        {transform:`translate(${drift}px, 100vh) rotate(${180+Math.random()*180}deg)`, opacity:0}
      ], {duration, easing:'ease-in'});
      setTimeout(()=>s.remove(), duration+50);
    }
  }
  const obs = new MutationObserver(()=>{
    const txt = label.textContent;
    if(txt === '100%' && lastFired !== '100%') goldBurst();
    lastFired = txt;
  });
  obs.observe(label, {childList:true, characterData:true, subtree:true});
})();
})();