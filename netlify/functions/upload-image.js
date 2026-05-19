import * as netlifyBlobs from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_NAME = "hd-images";
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".netlify", "local-image-uploads");
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

function sanitizePart(value, fallback = "image") {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || fallback;
}

function getExtension(contentType, fileName) {
  const fromName = String(fileName || "").toLowerCase().match(/\.(png|jpe?g|webp|gif)$/)?.[1];
  if (fromName) return fromName === "jpeg" ? "jpg" : fromName;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Expected a base64 image data URL.");
  const contentType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Uploaded image was empty.");
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error("Uploaded image is too large after resizing. Try a smaller image.");
  return { contentType, buffer };
}

function getStoreSafe(event) {
  try {
    if (typeof netlifyBlobs.connectLambda === "function") netlifyBlobs.connectLambda(event);
    return netlifyBlobs.getStore(STORE_NAME);
  } catch (error) {
    if (error?.name !== "MissingBlobsEnvironmentError") throw error;
    return null;
  }
}

function localPathForKey(key) {
  const safeParts = String(key || "").split("/").map((part) => sanitizePart(part, "file"));
  return path.join(LOCAL_UPLOAD_DIR, ...safeParts);
}

async function saveLocalImage(key, buffer, metadata) {
  const filePath = localPathForKey(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  await fs.writeFile(`${filePath}.json`, JSON.stringify(metadata, null, 2));
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST to upload an image." });

  try {
    const payload = JSON.parse(event.body || "{}");
    const { contentType, buffer } = parseDataUrl(payload.dataUrl);
    const productId = sanitizePart(payload.productId || "shared", "shared");
    const field = sanitizePart(payload.field || "image", "image");
    const originalName = sanitizePart(payload.fileName || `${field}.jpg`, `${field}.jpg`);
    const extension = getExtension(contentType, originalName);
    const key = `uploads/${productId}/${Date.now()}-${field}-${originalName.replace(/\.[^.]+$/, "")}.${extension}`;
    const metadata = {
      contentType,
      fileName: originalName,
      productId,
      field,
      uploadedAt: new Date().toISOString()
    };

    const store = getStoreSafe(event);
    if (store) {
      const blob = new Blob([buffer], { type: contentType });
      await store.set(key, blob, { metadata });
    } else {
      await saveLocalImage(key, buffer, metadata);
    }

    return json(200, {
      key,
      url: `/.netlify/functions/image?key=${encodeURIComponent(key)}`,
      contentType,
      size: buffer.length,
      storage: store ? "netlify-blobs" : "local-dev-file"
    });
  } catch (error) {
    console.error("upload-image failed", error);
    return json(500, { error: error?.message || "Image upload failed." });
  }
};
