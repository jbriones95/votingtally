/*
  Embeddable editor launcher for Squarespace (or any site).
  Usage (paste into a Code Block or Code Injection on Squarespace):
  <script src="https://YOUR_HOST/admin/embed.js" data-file="Alliance.html" data-token="YOUR_TOKEN"></script>

  The script creates a floating button; clicking opens a modal with the admin UI
  loaded in an iframe. You may omit data-token and the user will be prompted.
*/
(function(){
  const script = document.currentScript;
  const file = script && script.getAttribute('data-file') || 'Alliance.html';
  const token = script && script.getAttribute('data-token') || '';

  function cssInject(){
    const css = `#site-editor-button{position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#F89E33;color:#111;padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:700;box-shadow:0 8px 28px rgba(2,6,23,0.6)}#site-editor-modal{position:fixed;inset:0;background:rgba(2,6,23,0.6);display:flex;align-items:center;justify-content:center;z-index:2147483646}#site-editor-frame{width:100%;max-width:1100px;height:78vh;border:0;border-radius:8px;box-shadow:0 14px 64px rgba(2,6,23,0.6)}#site-editor-close{position:absolute;right:calc(50% - 550px);top:calc(50% - 390px);background:transparent;border:none;color:#fff;font-size:20px;padding:6px 10px;cursor:pointer}`;
    const s = document.createElement('style'); s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
  }

  function build(){
    cssInject();
    const btn = document.createElement('button'); btn.id = 'site-editor-button'; btn.textContent = 'Edit Page'; document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      const modal = document.createElement('div'); modal.id = 'site-editor-modal';
      const iframe = document.createElement('iframe'); iframe.id = 'site-editor-frame';
      // Pass file and token via query string (token optional)
      const params = new URLSearchParams({ file: file });
      if (token) params.set('token', token);
      iframe.src = '/admin/?' + params.toString();
      modal.appendChild(iframe);

      // close on background click
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

      function closeModal(){ document.body.removeChild(modal); }

      // close button
      const close = document.createElement('button'); close.id = 'site-editor-close'; close.innerHTML = '✕'; close.addEventListener('click', closeModal);
      modal.appendChild(close);

      document.body.appendChild(modal);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
