(function(){
"use strict";
const F = window.Flux;
const state = F.state;

async function purgeCompleted(){
  const n = state.tasks.filter(t=>t.done).length;
  if(n===0){ F.showToast('No completed tasks to clear'); return; }
  F.askConfirm({
    title:'Clear completed tasks?',
    text:`${n} completed task${n!==1?'s':''} will be permanently deleted.`,
    icon:'🧹', okLabel:'Clear',
    onOk: async ()=>{
      state.tasks = state.tasks.filter(t=>!t.done);
      await F.persist();
      F.updateNavTaskCount();
      F.showToast('🧹 Completed tasks cleared');
    }
  });
}
async function purgeAll(){
  if(state.tasks.length===0){ F.showToast('You have no tasks to delete'); return; }
  F.askConfirm({
    title:'Delete ALL tasks?',
    text:'Every task will be permanently removed. This cannot be undone.',
    icon:'🗑️', okLabel:'Delete All',
    onOk: async ()=>{
      state.tasks = [];
      await F.persist();
      F.updateNavTaskCount();
      F.showToast('🗑️ All tasks deleted');
    }
  });
}

async function init(){
  await F.initCore();
  document.getElementById('purgeCompletedBtn').addEventListener('click', purgeCompleted);
  document.getElementById('purgeAllBtn').addEventListener('click', purgeAll);
  F.seedSparkles();
}
init();

})();