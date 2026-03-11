/*
  Embeddable all-in-one editor for Squarespace.

  Usage (paste into a Code Block on your Squarespace page):

  <script src="https://YOUR_HOST/admin/embed-all.js" 
          data-host="https://YOUR_HOST" 
          data-file="site-configs/Alliance.json" 
          data-token="YOUR_TOKEN"></script>

  - `data-host` (optional): base URL where this app is hosted. If omitted uses the script host.
  - `data-file` (optional): the file to edit (default: site-configs/Alliance.json).
  - `data-token` (optional): admin token. If omitted user will be prompted.
*/
(function(){
  const script = document.currentScript;
  const hostAttr = (script && script.getAttribute('data-host')) || '';
  const fileAttr = (script && script.getAttribute('data-file')) || 'site-configs/Alliance.json';
  const tokenAttr = (script && script.getAttribute('data-token')) || '';

  const host = hostAttr || (script && script.src ? script.src.replace(/\/admin\/embed-all\.js.*$/, '') : '');

  function css(){
    const css = `#embed-editor-btn{position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#F89E33;color:#111;padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:700;box-shadow:0 8px 28px rgba(2,6,23,0.6)}#embed-editor-modal{position:fixed;inset:0;background:rgba(2,6,23,0.6);display:flex;align-items:flex-start;justify-content:center;z-index:2147483646;padding:32px;overflow:auto}#embed-editor-panel{width:100%;max-width:1100px;background:#02101a;border-radius:10px;padding:18px;color:#e6eef8;box-shadow:0 20px 60px rgba(0,0,0,0.6);position:relative}#embed-editor-panel h2{margin:0 0 8px;font-size:18px}#embed-editor-top{display:flex;gap:8px;align-items:center;margin-bottom:12px}#embed-editor-top input[type=text],#embed-editor-top input[type=password]{padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);color:inherit}#embed-editor-save{background:#4ade80;border:none;color:#06201a;padding:8px 10px;border-radius:6px;cursor:pointer;font-weight:700}#embed-editor-close{position:absolute;right:12px;top:12px;background:transparent;border:none;color:#9fb0c8;font-size:20px;cursor:pointer}#embed-editor-body{display:flex;gap:12px}#embed-editor-sidebar{width:320px;max-height:70vh;overflow:auto}#embed-editor-main{flex:1;max-height:70vh;overflow:auto}label{display:block;font-size:13px;color:#9fb0c8;margin-bottom:6px}input[type=color]{height:34px;padding:0;border-radius:6px;border:1px solid rgba(255,255,255,0.04)}.item{background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;margin-bottom:8px}.row{display:flex;gap:8px;align-items:center}.row input[type=text],.row input[type=url]{flex:1;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit}#embed-editor-status{margin-top:8px;color:#9fb0c8}`;
    const s = document.createElement('style'); s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
  }

  function build() {
    css();
    const btn = document.createElement('button'); btn.id = 'embed-editor-btn'; btn.textContent = 'Edit Page'; document.body.appendChild(btn);

    btn.addEventListener('click', openModal);

    function openModal(){
      const modal = document.createElement('div'); modal.id = 'embed-editor-modal';
      const panel = document.createElement('div'); panel.id = 'embed-editor-panel';
      panel.innerHTML = `
        <button id="embed-editor-close">✕</button>
        <h2>Quick Page Editor</h2>
        <div id="embed-editor-top">
          <input id="embed-file" type="text" value="${escapeHtml(fileAttr)}" style="width:360px" />
          <input id="embed-token" type="password" placeholder="admin token (optional)" style="width:220px" />
          <button id="embed-editor-save">Save</button>
          <a id="embed-preview" href="${host}/Alliance_simple.html" target="_blank" style="margin-left:auto;color:#9fb0c8">Open Preview</a>
        </div>
        <div id="embed-editor-body">
          <div id="embed-editor-sidebar"></div>
          <div id="embed-editor-main"></div>
        </div>
        <div id="embed-editor-status"></div>
      `;
      modal.appendChild(panel);
      document.body.appendChild(modal);

      const closeBtn = panel.querySelector('#embed-editor-close');
      closeBtn.addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e)=> { if (e.target === modal) modal.remove(); });
      document.addEventListener('keydown', function esc(e){ if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', esc); } });

      const fileInput = panel.querySelector('#embed-file');
      const tokenInput = panel.querySelector('#embed-token');
      if (tokenAttr) tokenInput.value = tokenAttr;

      const sidebar = panel.querySelector('#embed-editor-sidebar');
      const main = panel.querySelector('#embed-editor-main');
      const status = panel.querySelector('#embed-editor-status');
      const saveBtn = panel.querySelector('#embed-editor-save');

      function setStatus(msg, ok=true){ status.textContent = msg; status.style.color = ok? '#9fd19f':'#f19a9a'; }

      async function loadConfig(){
        setStatus('Loading...');
        try{
          const url = new URL(host + '/api/admin/file');
          url.searchParams.set('file', fileInput.value);
          const res = await fetch(url.toString(), { headers: tokenInput.value? { 'x-admin-token': tokenInput.value } : {} });
          if (!res.ok) { const j = await res.json().catch(()=>null); throw new Error(j && j.error ? j.error : res.statusText); }
          const data = await res.json();
          const cfg = JSON.parse(data.content);
          renderEditor(cfg);
          setStatus('Loaded');
        }catch(err){ setStatus('Load failed: ' + err.message, false); }
      }

      function renderEditor(cfg){
        sidebar.innerHTML = '<h3>Colors</h3>';
        main.innerHTML = '<h3>Items</h3>';
        const colors = cfg.colors || {};
        Object.keys(colors).forEach(k => {
          const row = document.createElement('div'); row.className = 'row';
          const label = document.createElement('label'); label.textContent = k; label.style.flex='1';
          const color = document.createElement('input'); color.type='color'; color.value = colors[k] || '#ffffff'; color.dataset.key = k;
          row.appendChild(label); row.appendChild(color); sidebar.appendChild(row);
        });

        const secs = cfg.sections || [];
        secs.forEach((s, idx) => {
          const item = document.createElement('div'); item.className='item';
          item.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${escapeHtml(s.title||('Item '+(idx+1)))}</div>`;
          item.appendChild(buildRow('Title', 'title', s.title));
          item.appendChild(buildRow('Description','description', s.description));
          item.appendChild(buildRow('Price','price', s.price));
          item.appendChild(buildRow('CTA','cta', s.cta));
          item.appendChild(buildRow('Image URL','image', s.image));
          main.appendChild(item);
        });

        function buildRow(labelText, field, value){
          const r = document.createElement('div'); r.className='row';
          const lbl = document.createElement('label'); lbl.textContent = labelText;
          const inp = document.createElement('input'); inp.type = (field==='image'?'url':'text'); inp.value = value||''; inp.dataset.field = field;
          r.appendChild(lbl); r.appendChild(inp); return r;
        }
      }

      async function saveConfig(){
        setStatus('Saving...');
        try{
          // collect colors
          const colors = {};
          sidebar.querySelectorAll('input[type=color]').forEach(i => colors[i.dataset.key] = i.value);
          // collect sections
          const sections = [];
          main.querySelectorAll('.item').forEach(item => {
            const obj = {};
            item.querySelectorAll('input[data-field]').forEach(inp => obj[inp.dataset.field] = inp.value);
            sections.push(obj);
          });
          const out = { colors, sections };
          const res = await fetch(host + '/api/admin/file', { method: 'POST', headers: Object.assign({'Content-Type':'application/json'}, tokenInput.value? { 'x-admin-token': tokenInput.value } : {}), body: JSON.stringify({ file: fileInput.value, content: JSON.stringify(out, null, 2) }) });
          if (!res.ok) { const j = await res.json().catch(()=>null); throw new Error(j && j.error ? j.error : res.statusText); }
          setStatus('Saved');
        }catch(err){ setStatus('Save failed: ' + err.message, false); }
      }

      saveBtn.addEventListener('click', saveConfig);
      // auto-load
      setTimeout(loadConfig, 150);
    }
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
