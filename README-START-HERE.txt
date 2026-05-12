HOME DEPOT MOCKUP - UPDATED

This zip includes:
- updated src/App.jsx with product-detail page click-through
- local products fallback at public/data/products.json
- Netlify function at netlify/functions/products.js
- data/products.json seed file
- netlify.toml with local dev settings

LOCAL, READ-ONLY PRODUCT LOADING:
1. Open Command Prompt.
2. Run:
   set "PATH=C:\Users\iwt292\node-v22.22.2-win-x64;%PATH%"
3. cd into this extracted folder.
4. Run:
   npm install
   npm run dev
5. Open the local URL that Vite prints.

LOCAL WITH NETLIFY FUNCTIONS + SAVE:
1. Run:
   set "PATH=C:\Users\iwt292\node-v22.22.2-win-x64;%PATH%"
2. Run:
   npx netlify dev
3. Open:
   http://localhost:8888
4. Test products endpoint:
   http://localhost:8888/.netlify/functions/products

IMPORTANT:
- If you run plain npm run dev, products load from public/data/products.json.
- Saving program data requires Netlify Dev or the live Netlify site.
- If Vite hangs without printing a link, the issue is your local Node/npm/Vite environment, not the App.jsx file.
