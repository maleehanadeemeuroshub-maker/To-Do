/* ==========================================================================
   Flux Todo — core.js
   Shared on every page: constants, state, storage, utilities, toast,
   confirm modal, theme, and sidebar/topbar chrome. Each page's own script
   (tasks.js, task-form.js, categories.js, purge.js, transfer.js, sync.js,
   profile.js) calls into window.Flux for everything below.
   ========================================================================== */
(function(){
"use strict";

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
  profile: {name:"", avatar:"", registered: Date.now(), email:"", role:"", phone:"", bio:""},
  settings: {theme:"light", bannerDismissed:false, sort:"created", subtitleIdx:0, viewMode:"list", sidebarCollapsed:true}
};
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
const LOCAL_KEY = 'flux-todo-app-state';
const hasCloudStorage = typeof window.storage !== 'undefined' && window.storage && typeof window.storage.get === 'function';

async function storageGet(){
  if(hasCloudStorage){
    return await window.storage.get('app-state', false);
  }
  const raw = localStorage.getItem(LOCAL_KEY);
  return raw ? {key:'app-state', value:raw, shared:false} : null;
}
async function storageSet(value){
  if(hasCloudStorage){
    return await window.storage.set('app-state', value, false);
  }
  localStorage.setItem(LOCAL_KEY, value);
  return {key:'app-state', value, shared:false};
}

async function loadState(){
  try{
    const res = await storageGet();
    if(res && res.value){
      const parsed = JSON.parse(res.value);
      state = Object.assign(state, parsed);
      if(!state.categories || !state.categories.length) state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      if(!state.settings) state.settings = {theme:"light", bannerDismissed:false, sort:"created", subtitleIdx:0};
      if(state.settings.viewMode===undefined) state.settings.viewMode = "list";
      if(state.settings.sidebarCollapsed===undefined) state.settings.sidebarCollapsed = true;
      if(!state.profile) state.profile = {name:"", avatar:"", registered: Date.now()};
      ["email","role","phone","bio"].forEach(k=>{ if(state.profile[k]===undefined) state.profile[k] = ""; });
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
        const result = await storageSet(JSON.stringify(state));
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
  if(!wrap) return;
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

/* ---------------- Confirm modal (present on every page) ---------------- */
let confirmCallback = null;
function askConfirm({title, text, icon, okLabel, onOk}){
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmIcon').textContent = icon || '⚠️';
  document.getElementById('confirmOk').textContent = okLabel || 'Confirm';
  confirmCallback = onOk;
  document.getElementById('confirmModal').classList.add('show');
}
function wireConfirmModal(){
  document.getElementById('confirmCancel').addEventListener('click', ()=>{
    document.getElementById('confirmModal').classList.remove('show');
    confirmCallback = null;
  });
  document.getElementById('confirmOk').addEventListener('click', async ()=>{
    document.getElementById('confirmModal').classList.remove('show');
    if(confirmCallback) await confirmCallback();
    confirmCallback = null;
  });
}

/* ---------------- Theme ---------------- */
function applyTheme(){
  document.body.setAttribute('data-theme', state.settings.theme);
  const label = document.getElementById('themeNavLabel');
  if(label) label.textContent = state.settings.theme==='dark' ? 'Light Mode' : 'Dark Mode';
  const sw = document.getElementById('themeSwitch');
  if(sw) sw.classList.toggle('on', state.settings.theme==='dark');
}
async function toggleTheme(){
  state.settings.theme = state.settings.theme==='dark' ? 'light' : 'dark';
  applyTheme();
  await persist();
}

/* ---------------- Sidebar / overlay ---------------- */
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
function applySidebarCollapsed(){
  const collapsed = !!state.settings.sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', collapsed);
  document.body.classList.toggle('sidebar-collapsed', collapsed);
}

/* ---------------- Shared topbar bits ---------------- */
function renderAvatarChrome(){
  const avSmall = document.getElementById('avatarBtn');
  if(!avSmall) return;
  if(state.profile.avatar){
    avSmall.innerHTML = `<img src="${state.profile.avatar}">`;
  } else {
    avSmall.textContent = initials(state.profile.name);
  }
}
function updateGreeting(){
  const greetEl = document.getElementById('greetingText');
  if(!greetEl) return;
  const h = new Date().getHours();
  let g = "Good morning", emoji="👋";
  if(h>=12 && h<17){ g="Good afternoon"; emoji="☀️"; }
  else if(h>=17 && h<21){ g="Good evening"; emoji="🌆"; }
  else if(h>=21 || h<5){ g="Good night"; emoji="🌙"; }
  const name = state.profile.name ? `, ${state.profile.name.split(' ')[0]}` : "";
  greetEl.innerHTML = `${emoji} ${g}${name}`;
  const sub = document.getElementById('greetingSub');
  if(sub) sub.textContent = SUBTITLES[state.settings.subtitleIdx % SUBTITLES.length];
}
function updateNavTaskCount(){
  const el = document.getElementById('navTaskCount');
  if(el) el.textContent = state.tasks.filter(t=>!t.done).length;
}

/* ---------------- Chrome wiring shared across all pages ---------------- */
function wireChrome(){
  const menuBtn = document.getElementById('menuBtn');
  if(menuBtn) menuBtn.addEventListener('click', openSidebar);

  const overlay = document.getElementById('overlay');
  if(overlay) overlay.addEventListener('click', ()=>{
    document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));
    closeSidebar();
    overlay.classList.remove('show');
  });

  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  if(collapseBtn) collapseBtn.addEventListener('click', async ()=>{
    state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
    applySidebarCollapsed();
    await persist();
  });

  const themeNavBtn = document.getElementById('themeNavBtn');
  if(themeNavBtn) themeNavBtn.addEventListener('click', toggleTheme);

  const resetBtn = document.getElementById('resetBtn');
  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    askConfirm({
      title:'Log out & reset?',
      text:'This clears your name and dismisses banners on this device. Your tasks stay saved.',
      icon:'↩', okLabel:'Reset',
      onOk: async ()=>{
        state.profile.name = '';
        state.profile.avatar = '';
        state.settings.bannerDismissed = false;
        await persist();
        renderAvatarChrome(); updateGreeting();
        closeSidebar();
        document.getElementById('overlay').classList.remove('show');
        showToast('↩ Logged out');
      }
    });
  });

  wireConfirmModal();

  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));
      closeSidebar();
      const ov = document.getElementById('overlay');
      if(ov) ov.classList.remove('show');
    }
  });

  // Highlight the active sidebar nav item based on the current page filename.
  const page = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('[data-nav]').forEach(btn=>{
    const match = btn.getAttribute('href') === page || (page==='' && btn.getAttribute('href')==='index.html');
    btn.classList.toggle('active', !!match);
  });

  const avatarBtn = document.getElementById('avatarBtn');
  if(avatarBtn && !avatarBtn.getAttribute('href')){
    avatarBtn.addEventListener('click', ()=>{ location.href = 'profile.html'; });
  }
}

/* ---------------- Boot ---------------- */
async function initCore(){
  await loadState();
  applyTheme();
  applySidebarCollapsed();
  wireChrome();
  renderAvatarChrome();
  updateGreeting();
  updateNavTaskCount();
}

/* ---------------- Ambient sparkle field ---------------- */
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
  clearTimeout(window.__sparkleResizeTimer);
}
window.addEventListener('resize', ()=>{
  clearTimeout(window.__sparkleResizeTimer);
  window.__sparkleResizeTimer = setTimeout(seedSparkles, 300);
});

/* ---------------- Export shared namespace ---------------- */
window.Flux = {
  COLORS, EMOJIS, STATUSES, statusOf, DEFAULT_CATEGORIES,
  get state(){ return state; },
  uuid, escapeHtml, timeAgoOrDate, fullDate, hexToRgb, darken, catById, setTaskStatus, initials,
  persist, loadState,
  showToast, burstConfetti, askConfirm,
  applyTheme, toggleTheme,
  openSidebar, closeSidebar, applySidebarCollapsed,
  renderAvatarChrome, updateGreeting, updateNavTaskCount,
  initCore, seedSparkles
};

})();