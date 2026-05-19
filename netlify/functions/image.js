import * as netlifyBlobs from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_NAME = "hd-images";
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".netlify", "local-image-uploads");

function sanitizePart(value, fallback = "file") {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || fallback;
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

function inferContentType(key) {
  const clean = String(key || "").toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function readLocalImage(key) {
  const filePath = localPathForKey(key);
  const data = await fs.readFile(filePath);
  let metadata = {};
  try {
    metadata = JSON.parse(await fs.readFile(`${filePath}.json`, "utf8"));
  } catch {
    metadata = {};
  }
  return { data, metadata };
}

export const handler = async (event) => {
  try {
    const key = event.queryStringParameters?.key || "";
    if (!key || key.includes("..")) {
      return { statusCode: 400, body: "Missing or invalid image key." };
    }

    let data;
    let metadata = {};
    const store = getStoreSafe(event);

    if (store) {
      if (typeof store.getWithMetadata === "function") {
        const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
        data = result?.data ? Buffer.from(result.data) : null;
        metadata = result?.metadata || {};
      } else {
        const result = await store.get(key, { type: "arrayBuffer" });
        data = result ? Buffer.from(result) : null;
      }
    } else {
      const local = await readLocalImage(key);
      data = local.data;
      metadata = local.metadata;
    }

    if (!data) return { statusCode: 404, body: "Image not found." };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": metadata.contentType || inferContentType(key),
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      body: Buffer.from(data).toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error("image failed", error);
    return { statusCode: 500, body: error?.message || "Image failed." };
  }
};
