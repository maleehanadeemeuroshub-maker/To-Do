(function(){
"use strict";
const F = window.Flux;
const state = F.state;
let catSearchQuery = "";
let editingCategoryId = null;

function renderCategoriesSheet(){
  const list = document.getElementById('catList');
  const q = catSearchQuery.trim().toLowerCase();
  const visible = state.categories.filter(c=> !q || c.name.toLowerCase().includes(q));

  if(visible.length===0){
    list.innerHTML = `<div class="empty-state" style="padding:36px 10px;">
      <div class="icon">🔍</div><b>No matching categories</b><span>Try a different search</span>
    </div>`;
  } else {
    list.innerHTML = visible.map(c=>{
      if(c.id === editingCategoryId){
        return `<div class="cat-edit-form" data-edit-form="${c.id}">
          <input type="text" class="cat-edit-name" value="${F.escapeHtml(c.name)}" placeholder="Category name">
          <div class="color-grid cat-edit-colors" data-selected="${c.color}">
            ${F.COLORS.map(col=>`<button type="button" class="color-opt ${col.hex===c.color?'selected':''}" data-hex="${col.hex}" style="background:${col.hex}"></button>`).join('')}
          </div>
          <div class="edit-actions">
            <button class="secondary-btn" data-cancel-edit="${c.id}">Cancel</button>
            <button class="primary-btn" data-save-edit="${c.id}">Save Changes</button>
          </div>
        </div>`;
      }
      const count = state.tasks.filter(t=>t.categoryId===c.id).length;
      return `<div class="cat-manage-item">
        <span class="dot" style="background:${c.color}"></span>
        <span class="name">${F.escapeHtml(c.name)}</span>
        <span class="count">${count} task${count!==1?'s':''}</span>
        <div class="actions">
          <button data-edit="${c.id}" aria-label="Edit category">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
          </button>
          <button data-del="${c.id}" aria-label="Delete category">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');
  }

  list.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(state.categories.length<=1){ F.showToast('⚠️ Keep at least one category'); return; }
      F.askConfirm({
        title:'Delete this category?',
        text:'Tasks in this category will move to the first remaining category.',
        icon:'📁',
        okLabel:'Delete',
        onOk: async ()=>{
          const id = btn.dataset.del;
          state.categories = state.categories.filter(c=>c.id!==id);
          const fallback = state.categories[0].id;
          state.tasks.forEach(t=>{ if(t.categoryId===id) t.categoryId = fallback; });
          await F.persist(); renderCategoriesSheet();
          F.showToast('🗑️ Category deleted');
        }
      });
    });
  });
  list.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      editingCategoryId = btn.dataset.edit;
      renderCategoriesSheet();
    });
  });
  list.querySelectorAll('[data-cancel-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      editingCategoryId = null;
      renderCategoriesSheet();
    });
  });
  list.querySelectorAll('.cat-edit-colors').forEach(grid=>{
    grid.querySelectorAll('.color-opt').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        grid.querySelectorAll('.color-opt').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        grid.dataset.selected = btn.dataset.hex;
      });
    });
  });
  list.querySelectorAll('[data-save-edit]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.saveEdit;
      const form = list.querySelector(`[data-edit-form="${id}"]`);
      const name = form.querySelector('.cat-edit-name').value.trim();
      if(!name){ F.showToast('⚠️ Give the category a name'); return; }
      const color = form.querySelector('.cat-edit-colors').dataset.selected;
      const cat = F.catById(id);
      Object.assign(cat, {name, color});
      editingCategoryId = null;
      await F.persist(); renderCategoriesSheet();
      F.showToast('✅ Category updated');
    });
  });

  const grid = document.getElementById('newCatColorGrid');
  grid.innerHTML = F.COLORS.map((c,i)=>`<button type="button" class="color-opt ${i===0?'selected':''}" data-hex="${c.hex}" style="background:${c.hex}"></button>`).join('');
  grid.dataset.selected = F.COLORS[0].hex;
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
  if(!name){ F.showToast('⚠️ Give the category a name'); return; }
  const color = document.getElementById('newCatColorGrid').dataset.selected || F.COLORS[0].hex;
  state.categories.push({id:'cat-'+F.uuid(), name, color});
  await F.persist();
  nameInput.value = '';
  renderCategoriesSheet();
  F.showToast('📁 Category added');
}

async function init(){
  await F.initCore();
  document.getElementById('catSearchInput').addEventListener('input', (e)=>{
    catSearchQuery = e.target.value;
    renderCategoriesSheet();
  });
  document.getElementById('addCatBtn').addEventListener('click', addCategory);
  renderCategoriesSheet();
  F.seedSparkles();
}
init();

})();