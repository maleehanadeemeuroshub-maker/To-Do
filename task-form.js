(function(){
"use strict";
const F = window.Flux;
const state = F.state;
let editingTaskId = null;

function toLocalInputValue(iso){
  const d = new Date(iso);
  const pad = n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildFormOptions(selectedCat, selectedColor, selectedEmoji, selectedStatus){
  const statusRow = document.getElementById('fStatusRow');
  statusRow.innerHTML = F.STATUSES.map(s=>
    `<button type="button" class="cat-pill ${selectedStatus===s.id?'selected':''}" data-status="${s.id}" style="${selectedStatus===s.id?'background:var(--accent)':''}">${s.icon}${F.escapeHtml(s.label)}</button>`
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
    `<button type="button" class="cat-pill ${selectedCat===c.id?'selected':''}" data-cat="${c.id}" style="${selectedCat===c.id?`background:${c.color}`:''}"><span class="dot" style="background:${c.color}"></span>${F.escapeHtml(c.name)}</button>`
  ).join('');
  catRow.querySelectorAll('.cat-pill').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      catRow.querySelectorAll('.cat-pill').forEach(b=>{b.classList.remove('selected'); b.style.background='';});
      btn.classList.add('selected');
      const c = F.catById(btn.dataset.cat);
      btn.style.background = c.color;
      catRow.dataset.selected = btn.dataset.cat;
    });
  });
  catRow.dataset.selected = selectedCat;

  const colorGrid = document.getElementById('fColorGrid');
  colorGrid.innerHTML = F.COLORS.map(c=>
    `<button type="button" class="color-opt ${selectedColor===c.hex?'selected':''}" data-hex="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`
  ).join('');
  colorGrid.querySelectorAll('.color-opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      colorGrid.querySelectorAll('.color-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      colorGrid.dataset.selected = btn.dataset.hex;
    });
  });
  colorGrid.dataset.selected = selectedColor || F.COLORS[0].hex;

  const emojiGrid = document.getElementById('fEmojiGrid');
  emojiGrid.innerHTML = F.EMOJIS.map(e=>
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

function openTaskForm(task){
  editingTaskId = task ? task.id : null;
  document.getElementById('taskFormTitle').textContent = task ? 'Edit Task' : 'Add New Task';
  document.getElementById('pageTitle').textContent = task ? 'Edit Task' : 'Add Task';
  document.getElementById('fSubmitBtn').textContent = task ? 'Save Changes' : 'Create Task';
  document.getElementById('fTitle').value = task ? task.title : '';
  document.getElementById('fDesc').value = task ? (task.description||'') : '';
  document.getElementById('fDeadline').value = task && task.deadline ? toLocalInputValue(task.deadline) : '';
  const defaultCat = state.categories[0] ? state.categories[0].id : '';
  buildFormOptions(task ? task.categoryId : defaultCat, task ? (F.catById(task.categoryId)||{}).color : F.COLORS[0].hex, task ? task.emoji : '', task ? task.status : 'todo');
  setTimeout(()=>document.getElementById('fTitle').focus(), 200);
}

async function submitTaskForm(){
  const title = document.getElementById('fTitle').value.trim();
  if(!title){ F.showToast('⚠️ Give your task a title'); document.getElementById('fTitle').focus(); return; }
  const desc = document.getElementById('fDesc').value.trim();
  const deadlineRaw = document.getElementById('fDeadline').value;
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
  const categoryId = document.getElementById('fCatRow').dataset.selected || (state.categories[0]||{}).id;
  const emoji = document.getElementById('fEmojiGrid').dataset.selected || '';
  const status = document.getElementById('fStatusRow').dataset.selected || 'todo';

  if(editingTaskId){
    const t = state.tasks.find(x=>x.id===editingTaskId);
    Object.assign(t, {title, description:desc, deadline, categoryId, emoji});
    F.setTaskStatus(t, status);
    F.showToast('✏️ Task updated');
  } else {
    const t = {
      id: F.uuid(), title, description:desc, deadline, categoryId, emoji,
      pinned:false, createdAt: Date.now()
    };
    F.setTaskStatus(t, status);
    state.tasks.unshift(t);
    F.showToast('✅ Task created');
  }
  await F.persist();
  location.href = 'index.html';
}

async function init(){
  await F.initCore();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const task = id ? state.tasks.find(t=>t.id===id) : null;
  openTaskForm(task);
  document.getElementById('fSubmitBtn').addEventListener('click', submitTaskForm);
  F.seedSparkles();
}
init();

})();