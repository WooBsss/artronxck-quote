# Artron Academy · CNC Instant Quote

Thai-language website that prices CNC machined parts in Thai Baht (฿).

- Upload **STEP / STP, STL, 3MF or IGES** files (processed in the browser, nothing is uploaded to a server)
- Pick a material: weight = volume × density
- Price is built from material, machine depreciation and maintenance, electricity (kW × ฿/kWh), labour, tool wear, setup, surface finish, overhead, profit and VAT 7%
- Editable shop parameters and material library (saved in the browser)
- Light / dark theme switch, printable PDF quote with logo (and a random CNC meme)

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
| `assets/artron-logo.png` | Logo |
