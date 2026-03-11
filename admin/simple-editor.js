const tokenEl = document.getElementById('token');
const fileEl = document.getElementById('file');
const loadBtn = document.getElementById('load');
const saveBtn = document.getElementById('save');
const colorsForm = document.getElementById('colorsForm');
const sectionsForm = document.getElementById('sectionsForm');
const status = document.getElementById('status');

function show(msg, ok=true){ status.textContent = msg; status.style.color = ok? '#9fd19f':'#f19a9a'; }

function headers(){ const h = {'Content-Type':'application/json'}; if(tokenEl.value) h['x-admin-token']=tokenEl.value; return h; }

async function load(){
  show('Loading...');
  try{
    const res = await fetch('/api/admin/file?file=' + encodeURIComponent(fileEl.value), { headers: headers() });
    if(!res.ok) throw new Error((await res.json()).error || res.statusText);
    const json = await res.json();
    const cfg = JSON.parse(json.content);
    buildColors(cfg.colors || {});
    buildSections(cfg.sections || []);
    show('Loaded');
  }catch(e){ show('Load failed: ' + e.message, false); }
}

function buildColors(colors){ colorsForm.innerHTML='';
  Object.keys(colors).forEach(k => {
    const div = document.createElement('div'); div.className='row';
    const label = document.createElement('label'); label.textContent = k;
    const inp = document.createElement('input'); inp.type='color'; inp.value = colors[k] || '#ffffff'; inp.className='color'; inp.dataset.key = k;
    div.appendChild(label); div.appendChild(inp); colorsForm.appendChild(div);
  });
}

function buildSections(sections){ sectionsForm.innerHTML='';
  sections.forEach((s, idx) => {
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${s.title || ('Item '+(idx+1))}</div>`;
    const titleRow = document.createElement('div'); titleRow.className='row'; titleRow.innerHTML = `<label>Title <input type="text" data-field="title" value="${escapeHtml(s.title||'')}"></label>`;
    const descRow = document.createElement('div'); descRow.className='row'; descRow.innerHTML = `<label>Description <input type="text" data-field="description" value="${escapeHtml(s.description||'')}"></label>`;
    const priceRow = document.createElement('div'); priceRow.className='row'; priceRow.innerHTML = `<label>Price <input type="text" data-field="price" value="${escapeHtml(s.price||'')}"></label>`;
    const ctaRow = document.createElement('div'); ctaRow.className='row'; ctaRow.innerHTML = `<label>CTA <input type="text" data-field="cta" value="${escapeHtml(s.cta||'')}"></label>`;
    const imgRow = document.createElement('div'); imgRow.className='row'; imgRow.innerHTML = `<label>Image URL <input type="url" data-field="image" value="${escapeHtml(s.image||'')}"></label>`;
    [titleRow, descRow, priceRow, ctaRow, imgRow].forEach(r => item.appendChild(r));
    item.dataset.index = idx;
    sectionsForm.appendChild(item);
  });
}

function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function save(){
  show('Saving...');
  try{
    // build object
    const colors = {};
    colorsForm.querySelectorAll('input[type="color"]').forEach(i=> colors[i.dataset.key]=i.value);
    const sections = [];
    sectionsForm.querySelectorAll('.item').forEach(item => {
      const idx = item.dataset.index;
      const obj = {};
      item.querySelectorAll('input[data-field]').forEach(inp=> obj[inp.dataset.field]=inp.value);
      sections.push(obj);
    });
    const out = { colors, sections };
    const res = await fetch('/api/admin/file', { method:'POST', headers: headers(), body: JSON.stringify({ file: fileEl.value, content: JSON.stringify(out, null, 2) }) });
    if(!res.ok) throw new Error((await res.json()).error || res.statusText);
    show('Saved');
  }catch(e){ show('Save failed: '+ e.message, false); }
}

loadBtn.addEventListener('click', load);
saveBtn.addEventListener('click', save);

// Auto-load if URL params provided
(function(){ try{ const p = new URLSearchParams(location.search); const f = p.get('file'); const t = p.get('token'); if(f) fileEl.value=f; if(t) tokenEl.value=t; if(f) setTimeout(load, 200); }catch(e){} })();
