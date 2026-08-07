(function(){
"use strict";
const F = window.Flux;
const state = F.state;

let activeCategoryFilter = "all";
let activeStatusFilter = "all";

/* ---------------- Progress ---------------- */
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
    F.burstConfetti();
  } else if(pct!==100){
    state._confettiFired = false;
  }
}

/* ---------------- Status Tabs ---------------- */
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
      ${F.escapeHtml(tb.label)} <span class="count">${counts[tb.id]}</span>
    </button>
  `).join('');
  wrap.querySelectorAll('.status-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeStatusFilter = btn.dataset.status;
      renderStatusTabs();
      applyViewMode();
    });
  });
}

/* ---------------- Chips ---------------- */
function renderChips(){
  const row = document.getElementById('chipRow');
  let html = `<button class="chip ${activeCategoryFilter==='all'?'active':''}" data-cat="all" style="${activeCategoryFilter==='all'?'background:linear-gradient(135deg,var(--accent),var(--accent-2))':''}">All Tasks</button>`;
  state.categories.forEach(c=>{
    const active = activeCategoryFilter===c.id;
    html += `<button class="chip ${active?'active':''}" data-cat="${c.id}" style="${active?`background:${c.color}`:''}">
      <span class="dot" style="background:${c.color}"></span>${F.escapeHtml(c.name)}
    </button>`;
  });
  row.innerHTML = html;
  row.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeCategoryFilter = btn.dataset.cat;
      renderChips();
      applyViewMode();
    });
  });
}

/* ---------------- Task List ---------------- */
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
      const ca = F.catById(a.categoryId), cb = F.catById(b.categoryId);
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
      const cat = F.catById(t.categoryId);
      const color = cat ? cat.color : '#5D6478';
      const overdue = t.deadline && t.status!=='done' && new Date(t.deadline) < new Date();
      const st = F.statusOf(t.status);
      return `<div class="task-card ${t.status==='done'?'done':''}" data-id="${t.id}" style="background:linear-gradient(135deg, ${color}, ${F.darken(color,-0.15)});">
        <div class="texture"></div>
        ${t.pinned ? `<div class="flag-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 17v5M8 3h8l-1 6 3 3H6l3-3-1-6z"/></svg>Pinned</div>` : ''}
        <div class="status-badge">${st.icon}${F.escapeHtml(st.label)}</div>
        <div class="title-row">
          ${t.emoji ? `<span class="emoji">${t.emoji}</span>` : ''}
          <h3 class="${t.status==='done'?'strike':''}">${F.escapeHtml(t.title)}</h3>
        </div>
        ${t.description ? `<p>${F.escapeHtml(t.description.slice(0,80))}${t.description.length>80?'…':''}</p>` : ''}
        <div class="meta">
          <span>${F.escapeHtml(cat?cat.name:'Uncategorized')}</span>
          ${t.deadline ? `<span>${overdue?'⏰':'📅'} ${new Date(t.deadline).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>` : `<span>${F.timeAgoOrDate(t.createdAt)}</span>`}
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
  F.updateNavTaskCount();
}

/* ---------------- Kebab Menu ---------------- */
function openKebabMenu(taskId, anchorEl){
  const task = state.tasks.find(t=>t.id===taskId);
  if(!task) return;
  const menu = document.getElementById('kebabMenu');
  menu.innerHTML = `
    <div style="padding:10px 15px 6px; font-size:10.5px; font-weight:700; letter-spacing:.04em; color:var(--ink-faint); text-transform:uppercase;">Status</div>
    ${F.STATUSES.map(s=>`
      <button data-status="${s.id}" style="${task.status===s.id?'color:var(--accent);font-weight:700;':''}">
        ${s.icon}${F.escapeHtml(s.label)} ${task.status===s.id?'✓':''}
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
    if(top + menuH > viewportH - 10){
      const spaceAbove = rect.top - 10;
      const spaceBelow = viewportH - rect.bottom - 10;
      if(spaceAbove > spaceBelow){
        top = rect.top - menuH - 6;
      }
    }
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
      F.setTaskStatus(task, b.dataset.status);
      await F.persist(); renderAll();
      F.showToast(`${F.statusOf(b.dataset.status).label} set`);
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
      await F.persist(); renderAll();
      F.showToast(task.pinned ? '📌 Pinned to top' : 'Unpinned');
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
      location.href = 'add-task.html?id=' + encodeURIComponent(task.id);
      break;
    case 'duplicate':
      const clone = Object.assign({}, task, {id: F.uuid(), createdAt: Date.now(), title: task.title + ' (copy)'});
      state.tasks.unshift(clone);
      await F.persist(); renderAll();
      F.showToast('📄 Task duplicated');
      break;
    case 'delete':
      F.askConfirm({
        title:'Delete this task?',
        text:`"${task.title}" will be permanently removed.`,
        icon:'🗑️',
        okLabel:'Delete',
        onOk: async ()=>{
          state.tasks = state.tasks.filter(t=>t.id!==task.id);
          await F.persist(); renderAll();
          F.showToast('🗑️ Task deleted');
        }
      });
      break;
  }
}

function readAloud(task){
  if(!('speechSynthesis' in window)){
    F.showToast('Read aloud not supported on this device');
    return;
  }
  window.speechSynthesis.cancel();
  const text = task.title + (task.description ? '. ' + task.description : '');
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.98;
  window.speechSynthesis.speak(utter);
  F.showToast('🔊 Reading task aloud');
}

async function shareTask(task){
  const cat = F.catById(task.categoryId);
  const text = `${task.title}${task.description ? '\n' + task.description : ''}${task.deadline ? '\nDue: ' + new Date(task.deadline).toLocaleString() : ''}\nCategory: ${cat?cat.name:'Uncategorized'}`;
  if(navigator.share){
    try{ await navigator.share({title: task.title, text}); }catch(e){ /* cancelled */ }
  } else if(navigator.clipboard){
    await navigator.clipboard.writeText(text);
    F.showToast('🔗 Task copied to clipboard');
  } else {
    F.showToast('Sharing not supported on this device');
  }
}

function openMoveSheet(task){
  const options = state.categories.map(c=>`<button class="cat-pill ${task.categoryId===c.id?'selected':''}" data-cat="${c.id}" style="${task.categoryId===c.id?`background:${c.color}`:''}"><span class="dot" style="background:${c.color}"></span>${F.escapeHtml(c.name)}</button>`).join('');
  const menu = document.getElementById('kebabMenu');
  menu.innerHTML = `<div style="padding:14px;">
    <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--ink-muted);">MOVE "${F.escapeHtml(task.title.slice(0,20))}" TO</div>
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
      await F.persist(); renderAll();
      closeKebabMenu();
      F.showToast('📁 Task moved');
    };
  });
  setTimeout(()=>document.addEventListener('click', kebabOutsideHandler),0);
}

/* ---------------- Task Details sheet ---------------- */
function openTaskDetails(taskId){
  const t = state.tasks.find(x=>x.id===taskId);
  if(!t) return;
  const cat = F.catById(t.categoryId);
  document.getElementById('detailTitle').textContent = 'Task: ' + t.title;
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-row"><b>Emoji</b><span>${t.emoji || 'none'}</span></div>
    <div class="detail-row"><b>ID</b><span class="mono" style="font-size:11.5px;">${t.id}</span></div>
    <div class="detail-row"><b>Description</b><span>${t.description ? F.escapeHtml(t.description) : '—'}</span></div>
    <div class="detail-row"><b>Status</b><span>${F.statusOf(t.status).label}</span></div>
    <div class="detail-row"><b>Category</b><span>${cat?F.escapeHtml(cat.name):'Uncategorized'}</span></div>
    <div class="detail-row"><b>Color</b><span>${cat?cat.color:'—'}</span></div>
    <div class="detail-row"><b>Deadline</b><span>${t.deadline ? F.fullDate(t.deadline) : 'No deadline'}</span></div>
    <div class="detail-row"><b>Created</b><span>${F.fullDate(t.createdAt)}</span></div>
    <div class="detail-row"><b>Done</b><span class="${t.done}">${t.done}</span></div>
    <div class="detail-row"><b>Pinned</b><span class="${!!t.pinned}">${!!t.pinned}</span></div>
  `;
  openSheet('detailSheet');
}
function openSheet(id){
  document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('show'));
  document.getElementById('overlay').classList.add('show');
  document.getElementById(id).classList.add('show');
}
function closeSheet(id){
  document.getElementById(id).classList.remove('show');
  if(!document.querySelector('.sheet.show') && !document.getElementById('sidebar').classList.contains('show')){
    document.getElementById('overlay').classList.remove('show');
  }
}

/* ---------------- Kanban board ---------------- */
function getFilteredTasksForBoard(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  return state.tasks.filter(t=>{
    if(activeCategoryFilter!=='all' && t.categoryId!==activeCategoryFilter) return false;
    if(q && !(t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q))) return false;
    return true;
  });
}
function kanbanCardHtml(t){
  const cat = F.catById(t.categoryId);
  const color = cat ? cat.color : '#5D6478';
  return `<div class="kanban-card" draggable="true" data-id="${t.id}" style="background:linear-gradient(135deg, ${color}, ${F.darken(color,-0.15)});">
    <div class="title-row">
      ${t.emoji ? `<span class="emoji">${t.emoji}</span>` : ''}
      <h4>${F.escapeHtml(t.title)}</h4>
    </div>
    ${t.description ? `<p>${F.escapeHtml(t.description.slice(0,60))}${t.description.length>60?'…':''}</p>` : ''}
    <div class="meta">${F.escapeHtml(cat?cat.name:'Uncategorized')}</div>
  </div>`;
}
let kanbanSortables = [];
function renderKanban(){
  const board = document.getElementById('kanbanBoard');
  const tasks = getFilteredTasksForBoard();

  kanbanSortables.forEach(s=> s.destroy());
  kanbanSortables = [];

  board.innerHTML = F.STATUSES.map(s=>{
    const items = tasks.filter(t=>t.status===s.id);
    return `<div class="kanban-col">
      <div class="kanban-col-head">
        <span class="kanban-col-title">${s.icon}${F.escapeHtml(s.label)}</span>
        <span class="kanban-col-count">${items.length}</span>
      </div>
      <div class="kanban-col-body" data-dropzone="${s.id}">
        ${items.map(kanbanCardHtml).join('')}
        ${items.length===0 ? `<div class="kanban-empty">No tasks here</div>` : ''}
      </div>
    </div>`;
  }).join('');

  board.querySelectorAll('.kanban-card').forEach(card=>{
    card.addEventListener('click', ()=> openTaskDetails(card.dataset.id));
  });

  const zones = Array.from(board.querySelectorAll('.kanban-col-body'));
  const canDrag = typeof Sortable !== 'undefined';
  if(!canDrag) console.warn('Flux: Sortable library not loaded — kanban drag & drop is disabled.');

  zones.forEach(zone=>{
    if(!canDrag) return;
    const sortable = Sortable.create(zone, {
      group: 'kanban-board',
      animation: 220,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      draggable: '.kanban-card',
      filter: '.kanban-empty',
      ghostClass: 'kanban-ghost',
      chosenClass: 'kanban-chosen',
      dragClass: 'kanban-drag',
      delay: 80,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      forceFallback: false,
      onStart: ()=> board.classList.add('kanban-dragging'),
      onEnd: async (evt)=>{
        board.classList.remove('kanban-dragging');
        const card = evt.item;
        const id = card.dataset.id;
        const task = state.tasks.find(t=>t.id===id);
        const newStatus = evt.to.dataset.dropzone;
        const movedColumn = evt.from !== evt.to;

        [evt.from, evt.to].forEach(z=>{
          const hasCards = z.querySelector('.kanban-card');
          const empty = z.querySelector('.kanban-empty');
          if(!hasCards && !empty){
            z.insertAdjacentHTML('beforeend', `<div class="kanban-empty">No tasks here</div>`);
          } else if(hasCards && empty){
            empty.remove();
          }
        });

        if(task && movedColumn && task.status !== newStatus){
          F.setTaskStatus(task, newStatus);
          await F.persist();
          renderProgress();
          renderStatusTabs();
          board.querySelectorAll('.kanban-col-count').forEach((el,i)=>{
            el.textContent = tasksByStatus(F.STATUSES[i].id).length;
          });
          F.updateNavTaskCount();
          F.showToast(`Moved to ${F.statusOf(newStatus).label}`);
        }
      }
    });
    kanbanSortables.push(sortable);
  });

  F.updateNavTaskCount();
}
function tasksByStatus(statusId){
  return getFilteredTasksForBoard().filter(t=>t.status===statusId);
}

/* ---------------- View mode (List / Board) ---------------- */
function applyViewMode(){
  const mode = state.settings.viewMode === 'board' ? 'board' : 'list';
  document.getElementById('taskList').style.display = mode==='board' ? 'none' : 'flex';
  document.getElementById('kanbanBoard').style.display = mode==='board' ? 'flex' : 'none';
  document.getElementById('statusTabs').style.display = mode==='board' ? 'none' : 'flex';
  document.querySelectorAll('.view-toggle-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.view===mode);
  });
  if(mode==='board') renderKanban(); else renderTasks();
}

/* ---------------- Render all ---------------- */
function renderAll(){
  F.updateGreeting();
  renderProgress();
  renderStatusTabs();
  renderChips();
  applyViewMode();
}

/* ---------------- Event wiring ---------------- */
function wireEvents(){
  document.getElementById('fabBtn').addEventListener('click', ()=>{ location.href = 'add-task.html'; });
  document.getElementById('detailSheetClose').addEventListener('click', ()=>closeSheet('detailSheet'));

  document.getElementById('progressClose').addEventListener('click', async ()=>{
    state.settings.bannerDismissed = true;
    await F.persist();
    renderProgress();
  });

  document.getElementById('searchInput').addEventListener('input', applyViewMode);

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
      await F.persist();
      applyViewMode();
    });
  });

  document.getElementById('viewToggle').querySelectorAll('.view-toggle-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(state.settings.viewMode === btn.dataset.view) return;
      state.settings.viewMode = btn.dataset.view;
      await F.persist();
      applyViewMode();
    });
  });
}

async function init(){
  await F.initCore();
  wireEvents();
  renderAll();
  document.getElementById('sortLabel').textContent =
    {created:'Date Created', due:'Due Date', az:'Alphabetical', color:'Category Color'}[state.settings.sort] || 'Date Created';
  F.seedSparkles();
}
init();

})();