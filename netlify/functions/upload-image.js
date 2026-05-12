const { getStore } = require("@netlify/blobs");

const STORE_NAME = "product-images";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function safePart(value, fallback = "image") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Expected a base64 data URL");
  const contentType = match[1] || "image/jpeg";
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Image payload is empty");
  return { contentType, buffer };
}

function extensionFromType(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" } };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { contentType, buffer } = parseDataUrl(body.dataUrl);

    // Keep uploads reasonably small for the free-tier/function path.
    // App.jsx resizes images to 1024 x 1024 JPEG before upload.
    const maxBytes = 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return json(413, { error: "Image is too large after resizing. Please use a smaller image." });
    }

    const productId = safePart(body.productId, "product");
    const field = safePart(body.field, "image");
    const originalName = safePart(String(body.fileName || "image").replace(/\.[^.]+$/, ""), "image");
    const ext = extensionFromType(contentType);
    const key = `products/${productId}/${field}-${Date.now()}-${originalName}.${ext}`;

    const store = getStore(STORE_NAME);
    await store.set(key, buffer);

    return json(200, {
      key,
      contentType,
      size: buffer.length,
      url: `/.netlify/functions/image?key=${encodeURIComponent(key)}`
    });
  } catch (error) {
    console.error("upload-image failed", error);
    return json(500, { error: error.message || "Image upload failed" });
  }
};
