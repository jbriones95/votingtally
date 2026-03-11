Simple site editor — no coding needed

This tool lets you edit site files like `Alliance.html` from a simple web page. Follow the short steps below.

1) Start the editor on a computer or server

- Open Terminal (or ask me to host it for you).
- In the project folder run:

```bash
npm install
export ADMIN_TOKEN="choose-a-secret"
npm start
```

- If you use your own server, replace `export ADMIN_TOKEN...` with your server's environment setup.

2) Open the editor in your browser

- Local: open http://localhost:3001/admin/
- If you host the app on the web: https://YOUR_HOST/admin/

3) How to edit a page (easy)

- In the Admin page, paste the secret token into the "Admin token" box.
- Choose `Alliance.html` from the File menu.
- Click "Load" to see the file contents.
- Make your text changes in the large box.
- Click "Save" to write the file back to the site.

Automatic backups

- Every Save makes a backup copy in the `backups/` folder. You can restore from those files if something goes wrong.

Add an "Edit" button on Squarespace (optional)

If you want a floating "Edit Page" button on your Squarespace site that opens this editor:

1. Make sure the editor is hosted at a public HTTPS address (for example: https://example.com).
2. Add this small snippet to a Code Block in Squarespace (replace YOUR_HOST and YOUR_TOKEN):

```html
<script src="https://YOUR_HOST/admin/embed.js" data-file="Alliance.html" data-token="YOUR_TOKEN"></script>
```

- If you don't include `data-token` the editor will ask for the token when opened.
- The snippet creates a floating "Edit Page" button that opens the editor in a window on your site.

Safety notes

- Keep your `ADMIN_TOKEN` secret — treat it like a password.
- For public sites use HTTPS and a strong token.
- The editor writes files directly to your project. Backups are made automatically, but keep your own copy too.

Need help?

- I can host this for you, set a safe token, or add a simple restore button. Tell me which help you want.

