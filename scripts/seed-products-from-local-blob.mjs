import fs from "node:fs/promises";

const DEFAULT_LOCAL_BLOB_FILE = String.raw`C:\Users\iwt292\home-depot-mockup-v2\.netlify\blobs-serve\entries\08ea6f24-7476-4113-90f2-628dcc0ea876\site%3Ahd-products\products.json`;
const DEFAULT_TARGET_URL = "https://thdtesting.netlify.app/.netlify/functions/products";

const localBlobFile = process.env.LOCAL_BLOB_FILE || process.argv[2] || DEFAULT_LOCAL_BLOB_FILE;
const targetUrl = process.env.TARGET_URL || process.argv[3] || DEFAULT_TARGET_URL;

function normalizeProductsPayload(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;

  if (value && typeof value === "object") {
    const firstArray = Object.values(value).find((item) => Array.isArray(item));
    if (firstArray) return firstArray;
  }

  return [];
}

const raw = await fs.readFile(localBlobFile, "utf8");
const parsed = JSON.parse(raw);
const products = normalizeProductsPayload(parsed);

if (!products.length) {
  throw new Error(`No products found in ${localBlobFile}`);
}

const response = await fetch(targetUrl, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(products)
});

const responseText = await response.text();

if (!response.ok) {
  throw new Error(`Upload failed (${response.status}): ${responseText}`);
}

console.log(`Uploaded ${products.length} products to ${targetUrl}`);
console.log(responseText);
