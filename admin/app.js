const tokenInput = document.getElementById('token');
const fileSelect = document.getElementById('fileSelect');
const loadBtn = document.getElementById('loadBtn');
const saveBtn = document.getElementById('saveBtn');
const editor = document.getElementById('editor');
const status = document.getElementById('status');

function showStatus(msg, ok = true) {
  status.textContent = msg;
  status.className = ok ? 'ok' : 'err';
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const t = tokenInput.value.trim();
  if (t) headers['x-admin-token'] = t;
  return headers;
}

async function loadFile() {
  showStatus('Loading...');
  try {
    const params = new URLSearchParams({ file: fileSelect.value });
    const url = '/api/admin/file?' + params.toString();
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json && json.error ? json.error : res.statusText);
    }
    const data = await res.json();
    editor.value = data.content || '';
    showStatus('Loaded ' + data.file);
  } catch (err) {
    showStatus('Load failed: ' + err.message, false);
  }
}

async function saveFile() {
  showStatus('Saving...');
  try {
    const body = { file: fileSelect.value, content: editor.value };
    const res = await fetch('/api/admin/file', { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json && json.error ? json.error : res.statusText);
    }
    const json = await res.json();
    showStatus('Saved ' + (json.file || fileSelect.value));
  } catch (err) {
    showStatus('Save failed: ' + err.message, false);
  }
}

loadBtn.addEventListener('click', loadFile);
saveBtn.addEventListener('click', saveFile);

// Keyboard shortcut: Cmd/Ctrl+S save
editor.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveFile();
  }
});

// Auto-populate from URL params (useful when embedded)
(function autoParams(){
  try {
    const params = new URLSearchParams(location.search);
    const f = params.get('file');
    const t = params.get('token');
    if (f) fileSelect.value = f;
    if (t) tokenInput.value = t;
    // if both present, auto-load
    if (f) setTimeout(() => loadFile(), 250);
  } catch (e) {
    // ignore
  }
})();
