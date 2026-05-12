const { getStore } = require("@netlify/blobs");

const STORE_NAME = "product-images";

function contentTypeFromKey(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const key = event.queryStringParameters && event.queryStringParameters.key;
    if (!key) return { statusCode: 400, body: "Missing image key" };

    const store = getStore(STORE_NAME);
    const data = await store.get(key, { type: "arrayBuffer" });

    if (!data) return { statusCode: 404, body: "Image not found" };

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": contentTypeFromKey(key),
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      body: Buffer.from(data).toString("base64")
    };
  } catch (error) {
    console.error("image function failed", error);
    return { statusCode: 500, body: error.message || "Image read failed" };
  }
};
