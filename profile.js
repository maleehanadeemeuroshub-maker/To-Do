(function(){
"use strict";
const F = window.Flux;
const state = F.state;

function renderProfile(){
  const av = document.getElementById('profileAvatarBig');
  if(state.profile.avatar){
    av.innerHTML = `<img src="${state.profile.avatar}">`;
  } else {
    av.textContent = F.initials(state.profile.name);
  }
  document.getElementById('profileName').textContent = state.profile.name || 'User';
  document.getElementById('profileRolePill').textContent = state.profile.role || 'Member';
  document.getElementById('profileNameInput').value = state.profile.name || '';
  document.getElementById('profileEmailInput').value = state.profile.email || '';
  document.getElementById('profileRoleInput').value = state.profile.role || '';
  document.getElementById('profilePhoneInput').value = state.profile.phone || '';
  document.getElementById('profileBioInput').value = state.profile.bio || '';
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

function wireEvents(){
  document.getElementById('saveNameBtn').addEventListener('click', async ()=>{
    state.profile.name = document.getElementById('profileNameInput').value.trim();
    state.profile.email = document.getElementById('profileEmailInput').value.trim();
    state.profile.role = document.getElementById('profileRoleInput').value.trim();
    state.profile.phone = document.getElementById('profilePhoneInput').value.trim();
    state.profile.bio = document.getElementById('profileBioInput').value.trim();
    await F.persist();
    renderProfile();
    F.renderAvatarChrome();
    F.showToast('✅ Profile saved');
  });

  document.getElementById('changePwBtn').addEventListener('click', ()=>{
    const cur = document.getElementById('pwCurrent');
    const next = document.getElementById('pwNew');
    const confirmEl = document.getElementById('pwConfirm');
    if(!cur.value || !next.value || !confirmEl.value){ F.showToast('⚠️ Fill in all password fields'); return; }
    if(next.value.length < 8){ F.showToast('⚠️ New password must be at least 8 characters'); return; }
    if(next.value !== confirmEl.value){ F.showToast('⚠️ New passwords do not match'); return; }
    cur.value = ''; next.value = ''; confirmEl.value = '';
    F.showToast('🔒 Password updated');
  });

  document.getElementById('avatarFile').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 1.5*1024*1024){ F.showToast('⚠️ Please choose an image under 1.5MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev)=>{
      state.profile.avatar = ev.target.result;
      await F.persist();
      renderProfile();
      F.renderAvatarChrome();
      F.showToast('🖼️ Avatar updated');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('themeSwitch').addEventListener('click', async ()=>{
    await F.toggleTheme();
  });

  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    F.askConfirm({
      title:'Log out?',
      text:'Your name and photo will be cleared from this device. Your tasks remain saved.',
      icon:'↩', okLabel:'Log Out',
      onOk: async ()=>{
        state.profile.name = '';
        state.profile.avatar = '';
        await F.persist();
        renderProfile();
        F.renderAvatarChrome();
        F.showToast('↩ Logged out');
      }
    });
  });
}

async function init(){
  await F.initCore();
  wireEvents();
  renderProfile();
  F.seedSparkles();
}
init();

})();