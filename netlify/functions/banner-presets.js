import * as netlifyBlobs from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";

const STORE_NAME = "hd-banner-presets";
const LOCAL_DIR = path.join(process.cwd(), ".netlify", "local-banner-presets");

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

function json(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
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

function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 80);
}

function newId() {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function localList() {
  try {
    const files = await fs.readdir(LOCAL_DIR);
    const presets = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(LOCAL_DIR, file), "utf8");
        presets.push(JSON.parse(raw));
      } catch {}
    }
    return presets;
  } catch {
    return [];
  }
}

async function localGet(id) {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, `${safeId(id)}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function localSet(id, data) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, `${safeId(id)}.json`), JSON.stringify(data, null, 2));
}

async function localDelete(id) {
  try {
    await fs.unlink(path.join(LOCAL_DIR, `${safeId(id)}.json`));
  } catch {}
}

async function listPresets(store) {
  if (!store) return localList();
  const { blobs } = await store.list();
  const presets = [];
  for (const blob of blobs || []) {
    try {
      const data = await store.get(blob.key, { type: "json" });
      if (data) presets.push(data);
    } catch {}
  }
  return presets;
}

async function getPreset(store, id) {
  if (!store) return localGet(id);
  return store.get(safeId(id), { type: "json" });
}

async function setPreset(store, id, data) {
  if (!store) return localSet(id, data);
  return store.setJSON(safeId(id), data);
}

async function deletePreset(store, id) {
  if (!store) return localDelete(id);
  return store.delete(safeId(id));
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: JSON_HEADERS, body: "" };

  try {
    const store = getStoreSafe(event);

    if (event.httpMethod === "GET") {
      const presets = await listPresets(store);
      presets.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      return json(200, { presets });
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const name = String(payload.name || "").trim();
      if (!name) return json(400, { error: "Preset name is required." });
      const id = newId();
      const now = new Date().toISOString();
      const record = {
        id,
        name,
        categoryPage: payload.categoryPage || {},
        createdAt: now,
        updatedAt: now
      };
      await setPreset(store, id, record);
      return json(200, { preset: record });
    }

    if (event.httpMethod === "PUT") {
      const payload = JSON.parse(event.body || "{}");
      const id = safeId(payload.id);
      if (!id) return json(400, { error: "Preset id is required." });
      const existing = await getPreset(store, id);
      if (!existing) return json(404, { error: "Preset not found." });
      const updated = {
        ...existing,
        name: payload.name ? String(payload.name).trim() : existing.name,
        categoryPage: payload.categoryPage ? payload.categoryPage : existing.categoryPage,
        updatedAt: new Date().toISOString()
      };
      await setPreset(store, id, updated);
      return json(200, { preset: updated });
    }

    if (event.httpMethod === "DELETE") {
      const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || "");
      let id = "";
      if (event.queryStringParameters && event.queryStringParameters.id) {
        id = safeId(event.queryStringParameters.id);
      } else {
        id = safeId(params.get("id"));
      }
      if (!id) return json(400, { error: "Preset id is required." });
      await deletePreset(store, id);
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed." });
  } catch (error) {
    console.error("banner-presets failed", error);
    return json(500, { error: error?.message || "Banner preset request failed." });
  }
};
