(function(){
"use strict";
const F = window.Flux;
const state = F.state;

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
  F.showToast('⬇ Backup downloaded');
}
function importBackup(file){
  const reader = new FileReader();
  reader.onload = async (e)=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!data.tasks || !Array.isArray(data.tasks)) throw new Error('Invalid file');
      F.askConfirm({
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
            else { t.id = F.uuid(); state.tasks.push(t); }
          });
          await F.persist();
          F.updateNavTaskCount();
          F.showToast('✅ Backup imported');
        }
      });
    }catch(err){
      F.showToast('⚠️ Could not read that file');
    }
  };
  reader.readAsText(file);
}

async function init(){
  await F.initCore();
  document.getElementById('exportBtn').addEventListener('click', exportBackup);
  document.getElementById('importFile').addEventListener('change', (e)=>{
    if(e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });
  F.seedSparkles();
}
init();

})();