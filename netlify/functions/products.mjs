import { getStore } from "@netlify/blobs";

const STORE_NAME = "hd-products";
const PRODUCTS_KEY = "products.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeProductsPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find((value) => Array.isArray(value));
    if (firstArray) return firstArray;
  }

  return [];
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const store = getStore(STORE_NAME);

  try {
    if (request.method === "GET") {
      const saved = await store.get(PRODUCTS_KEY, { type: "json" });

      if (!saved) {
        return jsonResponse({
          products: [],
          count: 0,
          empty: true,
          message: "No products have been saved to Netlify Blobs yet.",
        });
      }

      const products = normalizeProductsPayload(saved);

      return jsonResponse({
        ...(saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {}),
        products,
        count: products.length,
      });
    }

    if (request.method === "PUT" || request.method === "POST") {
      const incoming = await request.json();
      const products = normalizeProductsPayload(incoming);

      if (!products.length) {
        return jsonResponse(
          {
            ok: false,
            error: "Request body did not contain a products array.",
          },
          400
        );
      }

      const payload =
        incoming && typeof incoming === "object" && !Array.isArray(incoming)
          ? {
              ...incoming,
              products,
              updatedAt: new Date().toISOString(),
            }
          : {
              products,
              updatedAt: new Date().toISOString(),
            };

      await store.setJSON(PRODUCTS_KEY, payload);

      return jsonResponse({
        ok: true,
        count: products.length,
        updatedAt: payload.updatedAt,
      });
    }

    return jsonResponse(
      {
        ok: false,
        error: `Method ${request.method} not allowed.`,
      },
      405
    );
  } catch (error) {
    console.error("Products function failed:", error);

    return jsonResponse(
      {
        ok: false,
        error: error.message || "Products function failed.",
      },
      500
    );
  }
}
