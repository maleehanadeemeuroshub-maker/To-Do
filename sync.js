(function(){
"use strict";
const F = window.Flux;
const state = F.state;

function renderSyncStats(){
  document.getElementById('syncTaskCount').textContent = state.tasks.length;
  document.getElementById('syncCatCount').textContent = state.categories.length;
}

async function init(){
  await F.initCore();
  renderSyncStats();
  F.seedSparkles();
}
init();

})();