# Artron Academy · CNC Instant Quote

Thai-language website that prices CNC machined parts in Thai Baht (฿).

- Upload **STEP / STP, STL, 3MF or IGES** files (processed in the browser, nothing is uploaded to a server)
- Pick a material: weight = volume × density
- Price is built from material, machine depreciation and maintenance, electricity (kW × ฿/kWh), labour, tool wear, setup, hardening (optional, with a note), overhead, profit and VAT 7%
- Editable shop parameters and material library (saved in the browser)
- Light / dark theme switch, printable PDF quote with logo and quote number

## Live website (phone or any device)

**https://woobsss.github.io/artronxck-quote/** — hosted free on GitHub Pages and updated automatically
about a minute after each push to `main`.

## Open from the desktop

Double-click **Artron CNC Quote** on the Windows desktop. It runs `open-website.ps1`, which starts the
local server in the background (only if it is not already running) and opens the site in your browser.
The server keeps running until you sign out or restart the PC.

## Run locally

The page must be served over HTTP (opening `index.html` directly will not load the scripts):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8080. Any static host (GitHub Pages, Netlify, …) also works.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout (Thai) |
| `styles.css` | Theme (light blue / black / white), print layout |
| `app.js` | File parsing, 3D viewer, pricing model |
| `theme.js` | Light / dark switch with animation |
| `serve.ps1` | Tiny local web server |
| `open-website.ps1` | Desktop-shortcut launcher (start server + open browser) |
| `backup.ps1` | Commit and push all changes to GitHub |
| `assets/app.ico` | Shortcut icon |
| `assets/artron-logo.png` | Logo |
