import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search, ShoppingCart, User, Menu, Heart, Star, Grid, List, Truck,
  Pencil, Eye, Plus, Trash2, RotateCcw, Store, Home, ChevronRight,
  Upload, Save, X, ArrowLeft, ArrowRight, Check, ChevronDown,
  Package, ShieldCheck, Phone, CreditCard, HelpCircle, Hammer, MoreHorizontal
} from "lucide-react";

const API_BASE = "";
const FUNCTION_PRODUCTS_URL = `${API_BASE}/.netlify/functions/products`;
const FUNCTION_UPLOAD_IMAGE_URL = `${API_BASE}/.netlify/functions/upload-image`;
const FUNCTION_BANNER_PRESETS_URL = `${API_BASE}/.netlify/functions/banner-presets`;
const CATEGORY_LANDING_PATH = "/window-treatments";
const CATEGORY_GRID_PATH = "/window-treatments/products";
const PRODUCT_ROUTE_PREFIX = "/window-treatments/product";
const DEFAULT_GRID_SORT = "top";
const DEFAULT_ACTIVE_FILTERS = { category: "", brand: "", lift: "", shopType: "", included: "", features: "", event: "" };
const GRID_FILTER_QUERY_KEYS = {
  category: "category",
  brand: "brand",
  lift: "lift",
  shopType: "shopType",
  included: "included",
  features: "features",
  event: "event"
};

function normalizeAppPath(path) {
  const clean = String(path || "/").split("?")[0].split("#")[0] || "/";
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}

function getCurrentAppPath() {
  if (typeof window === "undefined") return CATEGORY_GRID_PATH;
  return normalizeAppPath(window.location.pathname);
}

function getCurrentAppSearch() {
  if (typeof window === "undefined") return "";
  return window.location.search || "";
}

function readGridUrlState(search = "") {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const activeFilters = Object.fromEntries(
    Object.entries(GRID_FILTER_QUERY_KEYS).map(([filterKey, queryKey]) => [filterKey, params.get(queryKey) || ""])
  );

  return {
    activeFilters: { ...DEFAULT_ACTIVE_FILTERS, ...activeFilters },
    storeTodayOnly: params.get("storeToday") === "1",
    freeDeliveryOnly: params.get("freeDelivery") === "1",
    searchQuery: params.get("q") || "",
    sort: params.get("sort") || DEFAULT_GRID_SORT
  };
}

function buildGridQueryString({ activeFilters = DEFAULT_ACTIVE_FILTERS, storeTodayOnly = false, freeDeliveryOnly = false, searchQuery = "", sort = DEFAULT_GRID_SORT } = {}) {
  const params = new URLSearchParams();

  Object.entries(GRID_FILTER_QUERY_KEYS).forEach(([filterKey, queryKey]) => {
    const value = String(activeFilters?.[filterKey] || "").trim();
    if (value) params.set(queryKey, value);
  });

  if (storeTodayOnly) params.set("storeToday", "1");
  if (freeDeliveryOnly) params.set("freeDelivery", "1");
  if (String(searchQuery || "").trim()) params.set("q", String(searchQuery).trim());
  if (sort && sort !== DEFAULT_GRID_SORT) params.set("sort", sort);

  const query = params.toString();
  return query ? `?${query}` : "";
}

function getGridRoutePathFromState(state) {
  return `${CATEGORY_GRID_PATH}${buildGridQueryString(state)}`;
}

function createEmptyActiveFilters() {
  return { ...DEFAULT_ACTIVE_FILTERS };
}

function getCategoryFilterForLink(label, categoryOptions = []) {
  const cleanLabel = String(label || "").trim();
  const optionLookup = new Map(categoryOptions.filter(Boolean).map((option) => [String(option).trim().toLowerCase(), String(option).trim()]));
  const emptyFilters = createEmptyActiveFilters();
  const findCategory = (...candidates) => candidates.map((candidate) => optionLookup.get(String(candidate || "").trim().toLowerCase())).find(Boolean) || "";
  const createFilter = ({ categoryCandidates = [], searchQuery = cleanLabel, filters = {} } = {}) => {
    const category = findCategory(...categoryCandidates);
    return {
      activeFilters: { ...emptyFilters, ...filters, category: category || filters.category || "" },
      searchQuery: category ? "" : searchQuery
    };
  };

  switch (cleanLabel) {
    case "Blinds": return createFilter({ searchQuery: "Blinds" });
    case "Shades": return createFilter({ searchQuery: "Shades" });
    case "Curtains & Drapes": return createFilter({ searchQuery: "Curtains" });
    case "Custom Blinds": return createFilter({ searchQuery: "Blinds", filters: { shopType: "Custom" } });
    case "Custom Shades": return createFilter({ searchQuery: "Shades", filters: { shopType: "Custom" } });
    case "Cellular Shades":
    case "Cellular/Honeycomb Shades": return createFilter({ categoryCandidates: ["Cellular Shades", "Cellular/Honeycomb Shades"] });
    case "Faux Wood Blinds":
    case "Premium Faux Wood": return createFilter({ categoryCandidates: ["Faux Wood Blinds"] });
    case "Roller Shades": return createFilter({ categoryCandidates: ["Roller Shades"] });
    case "Mini Blinds": return createFilter({ categoryCandidates: ["Vinyl Mini Blinds", "Mini Blinds"] });
    case "Vertical Blinds": return createFilter({ categoryCandidates: ["Vertical Blinds"] });
    case "Wood Blinds": return createFilter({ categoryCandidates: ["Wood Blinds"] });
    case "Blackout Shades": return createFilter({ searchQuery: "Blackout", filters: { features: "Blackout" } });
    case "Banded Shades": return createFilter({ categoryCandidates: ["Banded Shades"] });
    case "Solar Shades": return createFilter({ categoryCandidates: ["Solar Shades"] });
    case "Woven Wood Shades": return createFilter({ categoryCandidates: ["Woven Wood Shades"] });
    case "Roman Shades": return createFilter({ searchQuery: "Roman Shades" });
    case "Shutters": return createFilter({ categoryCandidates: ["Plantation Shutters", "Shutters"] });
    case "Curtain Rods": return createFilter({ searchQuery: "Curtain Rods" });
    case "Curtain Hardware": return createFilter({ searchQuery: "Curtain Hardware" });
    default: return createFilter();
  }
}

function getProductRouteKey(product) {
  return String(product?.model || product?.id || "").trim();
}

function getProductRoutePath(product) {
  return `${PRODUCT_ROUTE_PREFIX}/${encodeURIComponent(getProductRouteKey(product))}`;
}

function getConfiguratorRoutePath(product) {
  return `${getProductRoutePath(product)}/configure`;
}

function parseAppRoute(path) {
  const clean = normalizeAppPath(path);
  if (clean === "/") return { type: "grid", path: CATEGORY_GRID_PATH, replacePath: CATEGORY_GRID_PATH };
  if (clean === CATEGORY_LANDING_PATH) return { type: "category", path: clean };
  if (clean === CATEGORY_GRID_PATH) return { type: "grid", path: clean };

  const parts = clean.split("/").filter(Boolean);
  if (parts[0] === "window-treatments" && parts[1] === "product" && parts[2]) {
    let productModel;
    try { productModel = decodeURIComponent(parts[2]); } catch { productModel = parts[2]; }
    if (parts.length === 3) return { type: "product", path: clean, productModel };
    if (parts.length === 4 && parts[3] === "configure") return { type: "configurator", path: clean, productModel };
  }

  return { type: "grid", path: CATEGORY_GRID_PATH, replacePath: CATEGORY_GRID_PATH };
}


const FILTER_GROUPS = [
  { key: "category", title: "Category", options: ["Faux Wood Blinds", "Wood Blinds", "Vertical Blinds", "Roller Shades", "Banded Shades", "Solar Shades", "Woven Wood Shades", "Cellular Shades", "Vinyl Mini Blinds", "Plantation Shutters"] },
  { key: "light", title: "Light Control", options: ["Light Filtering", "Room Darkening", "Blackout", "Solar"] },
  { key: "brand", title: "Brand", options: ["VENETA", "Levolor", "Bali", "Bali Essentials", "Home Decorators Collection"] },
  { key: "lift", title: "Lift Systems", options: ["Cordless", "Motorized", "Chain Loop", "Wand", "Hand Crank"] }
];

const FRACTIONS = ["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];

const SHOP_TYPE_OPTIONS = ["Custom", "Pre-Cut"];
const DEFAULT_GALLERY_IMAGE_NAMES = ["Lifestyle Image", "Key Benefits", "What's in the Box"];
const VENETA_LOGO_URL = "/veneta-logo.svg";


const DEFAULT_CATEGORY_PAGE_SETTINGS = {
  topBanner: {
    label: "Sponsored",
    imageUrl: "",
    headline: "TRANSFORM YOUR HOME WITH VENETA SHADES",
    ctaText: "Shop Now",
    ctaUrl: CATEGORY_GRID_PATH
  },
  sideBanner: {
    label: "Sponsored",
    imageUrl: "",
    headline: "VENETA MAKES DIY EASY",
    ctaText: "Shop Now",
    ctaUrl: CATEGORY_GRID_PATH
  },
  hero: {
    imageUrl: "",
    kicker: "Limited Time",
    headline: "UP TO 40% OFF",
    body: "Select Custom Blinds & Shades. Ends 5/13.",
    ctaText: "Shop Now"
  }
};

function mergeCategorySection(defaults, value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof source[key] === "string" ? source[key] : fallback]));
}

function mergeCategoryPageSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const topBannerSource = source.topBanner && typeof source.topBanner === "object" ? source.topBanner : {};
  const topBanner = mergeCategorySection(DEFAULT_CATEGORY_PAGE_SETTINGS.topBanner, topBannerSource);

  if (!String(topBannerSource.headline || "").trim()) {
    const migratedHeadline = [topBannerSource.headlineLine1, topBannerSource.headlineLine2]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" ");
    if (migratedHeadline) topBanner.headline = migratedHeadline;
  }

  return {
    topBanner,
    sideBanner: mergeCategorySection(DEFAULT_CATEGORY_PAGE_SETTINGS.sideBanner, source.sideBanner),
    hero: mergeCategorySection(DEFAULT_CATEGORY_PAGE_SETTINGS.hero, source.hero)
  };
}

const DEFAULT_MOCKUP_SETTINGS = {
  hoverEnabled: true,
  showReferenceBorders: false,
  placeholderNonBordered: false,
  categoryPage: DEFAULT_CATEGORY_PAGE_SETTINGS
};

function mergeMockupSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    hoverEnabled: typeof source.hoverEnabled === "boolean" ? source.hoverEnabled : DEFAULT_MOCKUP_SETTINGS.hoverEnabled,
    showReferenceBorders: typeof source.showReferenceBorders === "boolean" ? source.showReferenceBorders : DEFAULT_MOCKUP_SETTINGS.showReferenceBorders,
    placeholderNonBordered: typeof source.placeholderNonBordered === "boolean" ? source.placeholderNonBordered : DEFAULT_MOCKUP_SETTINGS.placeholderNonBordered,
    categoryPage: mergeCategoryPageSettings(source.categoryPage)
  };
}

function extractMockupSettings(data, products = []) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const direct = data.mockupSettings || data.settings?.mockupSettings || data.settings;
    if (direct && typeof direct === "object") return mergeMockupSettings(direct);
  }

  const productWithSettings = products.find((product) => product?.mockupSettings && typeof product.mockupSettings === "object");
  if (productWithSettings) return mergeMockupSettings(productWithSettings.mockupSettings);

  return null;
}

function createProductsBlobPayload(products, settings) {
  const cleanSettings = mergeMockupSettings(settings);
  const cleanProducts = (Array.isArray(products) ? products : []).map((product) => {
    if (!product || typeof product !== "object") return product;
    const { mockupSettings, ...rest } = product;
    return rest;
  });
  return {
    products: cleanProducts,
    mockupSettings: cleanSettings
  };
}

function applyMockupSettingsToProducts(products, settings) {
  return createProductsBlobPayload(products, settings);
}


const DEFAULT_CONFIGURATOR_SCHEMA = {
  visibleSections: { size: true, mountOptions: true, colorOptions: true, liftOptions: true, headrailOptions: true },
  customSections: [],
  eighths: ["Select", "0/0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"],
  widthMin: 14,
  widthMax: 174,
  heightMin: 6,
  heightMax: 144,
  mountOptions: [
    {
      key: "Inside Mount",
      title: "Inside Mount",
      price: "",
      adds: "",
      description: "Inside mount shades fit within your window opening most popular choice. Your product will be made with inch deduction.",
      note: ""
    },
    {
      key: "Drill-Free Inside Mount",
      title: "Drill-Free Inside Mount",
      price: "",
      adds: "",
      description: "Get it done faster! Inside mount shades that fit in your window opening with tension.",
      note: ""
    },
    {
      key: "Side Mount",
      title: "Side Mount",
      price: "",
      adds: "",
      description: "Side mount shades fit within the window opening and is used when there is no top mount option available.",
      note: ""
    },
    {
      key: "Outside Mount",
      title: "Outside Mount",
      price: "",
      adds: "",
      description: "Outside mount shades are installed above the window opening (on the trim or drywall). Use with a shallow window opening or on doors. Your product will be made in the exact size you specify.",
      note: ""
    }
  ],
  colorGroupTitle: "Light Filtering Colors",
  colorOptions: [
    { key: "Estelle Snow F1445", title: "Estelle Snow F1445", price: "", adds: "", description: "", note: "", swatchColor: "#ececea", swatchImageUrl: "" },
    { key: "Creek Beige F1123", title: "Creek Beige F1123", price: "", adds: "", description: "", note: "", swatchColor: "#d6c3a3", swatchImageUrl: "" },
    { key: "Estelle Cream F1446", title: "Estelle Cream F1446", price: "", adds: "", description: "", note: "", swatchColor: "#efe8da", swatchImageUrl: "" },
    { key: "Estelle Stone F1448", title: "Estelle Stone F1448", price: "", adds: "", description: "", note: "", swatchColor: "#a3a3a1", swatchImageUrl: "" },
    { key: "Estelle Natural F1447", title: "Estelle Natural F1447", price: "", adds: "", description: "", note: "", swatchColor: "#e3cfb0", swatchImageUrl: "" },
    { key: "Estelle Caviar F1449", title: "Estelle Caviar F1449", price: "", adds: "", description: "", note: "", swatchColor: "#2b2b2b", swatchImageUrl: "" },
    { key: "Creek Latte F1157", title: "Creek Latte F1157", price: "", adds: "", description: "", note: "", swatchColor: "#d8ccb5", swatchImageUrl: "" },
    { key: "Creek Egret F1121", title: "Creek Egret F1121", price: "", adds: "", description: "", note: "", swatchColor: "#a99e98", swatchImageUrl: "" },
    { key: "Creek Smoke F1122", title: "Creek Smoke F1122", price: "", adds: "", description: "", note: "", swatchColor: "#7d7874", swatchImageUrl: "" },
    { key: "Creek Pewter F1120", title: "Creek Pewter F1120", price: "", adds: "", description: "", note: "", swatchColor: "#a8a7a5", swatchImageUrl: "" },
    { key: "Luster Goldmine F1436", title: "Luster Goldmine F1436", price: "", adds: "", description: "", note: "", swatchColor: "#a57f66", swatchImageUrl: "" },
    { key: "Luster Pewter F1439", title: "Luster Pewter F1439", price: "", adds: "", description: "", note: "", swatchColor: "#6f6f6f", swatchImageUrl: "" }
  ],
  liftOptions: [
    {
      key: "Cordless Lift",
      title: "Cordless Lift",
      price: "",
      adds: "",
      description: "Cordless shades are the peak in style and function. They are a safer choice for homes with children and pets.",
      note: "Available as Bottom Up, Top Down / Bottom Up and Day / Night."
    },
    {
      key: "Continuous Cord Loop Lift",
      title: "Continuous Cord Loop Lift",
      price: "",
      adds: "",
      description: "Continuous cord loop uses a pulley system to raise and lower your product. This is a great option for heavier or wider products.",
      note: "Available as Bottom Up and Top Down / Bottom Up."
    },
    {
      key: "Motorized Lift",
      title: "Motorized Lift",
      price: "",
      adds: "",
      description: "Impress your guests with motorized lift shades! You can adjust the height of your shades, controlling light, with a simple touch of a button.",
      note: "Available as Motor Wand, Bottom Up, Top Down / Bottom Up and Day / Night."
    }
  ],
  headrailOptions: [
    { key: "Standard", title: "Standard", price: "", adds: "" },
    { key: "2-on-1", title: "2-on-1", price: "", adds: "" }
  ]
};

// Optional "pick your paint, get fabric recommendations" flow (e.g. BEHR x VENETA).
// Each paint lists VENETA color keys that blend (tone-on-tone) or contrast (accent) with it.
function normalizePaintPairing(value) {
  const source = value && typeof value === "object" ? value : {};
  const keyList = (list) => (Array.isArray(list) ? list : String(list || "").split(","))
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const paints = (Array.isArray(source.paints) ? source.paints : [])
    .map((paint) => ({
      key: String(paint?.key || paint?.code || paint?.name || "").trim(),
      name: String(paint?.name || "").trim(),
      code: String(paint?.code || "").trim(),
      hex: String(paint?.hex || "").trim(),
      blend: keyList(paint?.blend),
      accent: keyList(paint?.accent)
    }))
    .filter((paint) => paint.key && paint.name);
  return {
    enabled: Boolean(source.enabled) && paints.length > 0,
    brand: String(source.brand || "BEHR"),
    title: String(source.title || "Choose Your BEHR Paint Color"),
    subtitle: String(source.subtitle || "Pick your wall color and we'll recommend window shade colors that pair with it."),
    paints
  };
}

function mergeConfiguratorSchema(value) {
  const cleanNumber = (raw, fallback) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const normalizeOptions = (items, fallback) => {
    const source = Array.isArray(items) ? items : fallback;
    return source.map((item, index) => {
      const option = item && typeof item === "object" ? item : {};
      const hasTitle = Object.prototype.hasOwnProperty.call(option, "title");
      const hasKey = Object.prototype.hasOwnProperty.call(option, "key");
      // Preserve intentionally blank or spaced editor input. Do not coerce an
      // empty title/key back to "Option #" while the user is typing.
      const title = hasTitle ? String(option.title ?? "") : String(option.key ?? `Option ${index + 1}`);
      const key = hasKey ? String(option.key ?? "") : String(title || `Option ${index + 1}`);
      const normalized = {
        key,
        title,
        price: String(option.price ?? ""),
        adds: String(option.adds ?? ""),
        description: String(option.description ?? ""),
        note: String(option.note ?? "")
      };
      // Color options carry swatch data; keep it only when present.
      if (option.swatchColor !== undefined) normalized.swatchColor = String(option.swatchColor ?? "");
      if (option.swatchImageUrl !== undefined) normalized.swatchImageUrl = String(option.swatchImageUrl ?? "");
      // Optional rule: option is unavailable while another selection matches.
      if (option.disabledWhen && typeof option.disabledWhen === "object") normalized.disabledWhen = option.disabledWhen;
      return normalized;
    });
  };
  const normalizeCustomSections = (items) => {
    const source = Array.isArray(items) ? items : [];
    const used = new Set();
    return source.map((item, index) => {
      const section = item && typeof item === "object" ? item : {};
      const rawId = String(section.id || section.key || `custom-section-${index + 1}`).trim() || `custom-section-${index + 1}`;
      let id = rawId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `custom-section-${index + 1}`;
      let suffix = 2;
      while (used.has(id)) {
        id = `${rawId}-${suffix}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `custom-section-${index + 1}-${suffix}`;
        suffix += 1;
      }
      used.add(id);
      const title = String(section.title || section.name || `Custom Section ${index + 1}`);
      return {
        ...section,
        id,
        key: id,
        title,
        description: Object.prototype.hasOwnProperty.call(section, "description") ? String(section.description ?? "") : "Custom configurator options.",
        visible: section.visible !== false,
        options: normalizeOptions(section.options, [{ key: "Option 1", title: "Option 1", price: "", adds: "", description: "", note: "" }])
      };
    });
  };

  const merged = {
    ...DEFAULT_CONFIGURATOR_SCHEMA,
    ...(value && typeof value === "object" ? value : {})
  };

  return {
    ...merged,
    widthMin: cleanNumber(merged.widthMin, DEFAULT_CONFIGURATOR_SCHEMA.widthMin),
    widthMax: cleanNumber(merged.widthMax, DEFAULT_CONFIGURATOR_SCHEMA.widthMax),
    heightMin: cleanNumber(merged.heightMin, DEFAULT_CONFIGURATOR_SCHEMA.heightMin),
    heightMax: cleanNumber(merged.heightMax, DEFAULT_CONFIGURATOR_SCHEMA.heightMax),
    visibleSections: {
      ...DEFAULT_CONFIGURATOR_SCHEMA.visibleSections,
      ...(merged.visibleSections && typeof merged.visibleSections === "object" ? merged.visibleSections : {}),
      size: true
    },
    customSections: normalizeCustomSections(merged.customSections),
    eighths: Array.isArray(merged.eighths) && merged.eighths.length ? merged.eighths : DEFAULT_CONFIGURATOR_SCHEMA.eighths,
    mountOptions: normalizeOptions(merged.mountOptions, DEFAULT_CONFIGURATOR_SCHEMA.mountOptions),
    colorGroupTitle: String(merged.colorGroupTitle ?? DEFAULT_CONFIGURATOR_SCHEMA.colorGroupTitle),
    colorOptions: normalizeOptions(merged.colorOptions, DEFAULT_CONFIGURATOR_SCHEMA.colorOptions),
    paintPairing: normalizePaintPairing(merged.paintPairing),
    liftOptions: normalizeOptions(merged.liftOptions, DEFAULT_CONFIGURATOR_SCHEMA.liftOptions),
    headrailOptions: normalizeOptions(merged.headrailOptions, DEFAULT_CONFIGURATOR_SCHEMA.headrailOptions)
  };
}

function getProductConfiguratorSchema(product) {
  return mergeConfiguratorSchema(product?.configurator || product?.configuratorSchema || DEFAULT_CONFIGURATOR_SCHEMA);
}

function stripDrillFreeMountOptions(schema) {
  const base = mergeConfiguratorSchema(schema);
  return {
    ...base,
    mountOptions: base.mountOptions.filter((option) => {
      const label = `${option.key || ""} ${option.title || ""}`.toLowerCase();
      return !label.includes("drill-free") && !label.includes("drill free");
    })
  };
}

function migrateDrillFreeMountOptionsOnce(products) {
  return products.map((product) => {
    if (product?.drillFreeMountMigrationDone) return product;
    const productName = String(product?.name || product?.pdpTitle || product?.detailTitle || "").toLowerCase();
    if (productName.includes("drill-free") || productName.includes("drill free")) {
      return { ...product, drillFreeMountMigrationDone: true };
    }
    return {
      ...product,
      configurator: stripDrillFreeMountOptions(product?.configurator || product?.configuratorSchema || DEFAULT_CONFIGURATOR_SCHEMA),
      drillFreeMountMigrationDone: true
    };
  });
}

// VENETA roller shades use Home Depot's roller configurator options (colors are kept as-is).
const ROLLER_CONFIGURATOR_FIELDS = {
  widthMin: 13,
  widthMax: 192,
  heightMin: 12,
  heightMax: 120,
  defaults: { lift: "Chain Loop", headrail: "Single Shade" },
  mountOptions: [
    { key: "Inside Mount", title: "Inside Mount", price: "", adds: "", description: "Provide exact window opening dimensions. There will be visible light gaps of approximately 1/2 inch on both sides of your roller shade to allow clearance for operating.", note: "" },
    { key: "Outside Mount", title: "Outside Mount", price: "", adds: "", description: "Provide the exact size of your shade, not the window. Because the fabric is narrower than the roller, so you should add a minimum of 1\u00bd inch to width.", note: "" }
  ],
  liftOptions: [
    { key: "Chain Loop", title: "Chain Loop", price: "", adds: "", description: "Beaded chain is a standard lift choice. The beaded chain pulley system raises and lowers your shade with ease.", note: "" },
    { key: "Cordless", title: "Cordless", price: "", adds: "Adds $43.01", description: "Cordless shades are a sleek choice, since there are no free hanging cords. To lower, gently pull the shade by the handle to the desired location. To raise, simply push up the hem bar to the desired location. Safer choice for homes with small children.", note: "" },
    { key: "Cordless Dual Roller Shade", title: "Cordless Dual Roller Shade", price: "", adds: "Adds $139.79", description: "Dual shades give you full control over light and privacy by combining two fabric types into one versatile window treatment. Each shade operates independently.", note: "" },
    { key: "QuikClick Wand Control Motor", title: "QuikClick Wand Control Motor", price: "", adds: "Adds $134.88", description: "QuikClick Wand Control Motor with rechargeable lithium ion batteries operate your shades with a white detachable wand and can be positioned on either left or right side of shade. One micro USB cable is included with each order.", note: "" },
    { key: "Motorized", title: "Motorized", price: "", adds: "Adds $470.98", description: "Motorized shades allow you to adjust the height of your shades, controlling the light, with a simple touch of a button, without getting up. Ultimate in convenience for hard to reach shades.", note: "" }
  ],
  headrailOptions: [
    { key: "Single Shade", title: "Single Shade", price: "", adds: "", description: "", note: "" }
  ],
  customSections: [
    { id: "control-side", title: "Control Side", description: "Please select your control side.", showWhen: { field: "lift", values: ["Chain Loop", "QuikClick Wand Control Motor", "Motorized"] },
      options: [{ key: "Left", title: "Left" }, { key: "Right", title: "Right" }] },
    { id: "chain-type", title: "Chain Type", description: "", showWhen: { field: "lift", values: ["Chain Loop"] },
      options: [{ key: "Plastic", title: "Plastic" }, { key: "Stainless Steel", title: "Stainless Steel", adds: "Adds $27.97" }] },
    { id: "fabric-roll-direction", title: "Fabric Roll Direction", description: "", defaultOption: "Standard Roll",
      options: [
        { key: "Standard Roll", title: "Standard Roll", description: "With a standard roll, the fabric hangs toward the back of the window, closer to the glass, for better privacy and light blockage." },
        { key: "Reverse Roll", title: "Reverse Roll", description: "With a reverse roll, the fabric hangs toward the room, away from the glass. Not available with a valance.", disabledWhen: { field: "custom_top-treatment", values: ["*"], message: "Not available with a valance." } }
      ] },
    { id: "valance-type", title: "Valance Type", description: "",
      options: [{ key: "Single Valance", title: "Single Valance" }, { key: "Extended Size Valance for Single Shade", title: "Extended Size Valance for Single Shade" }, { key: "Common Valance to Cover 2 shades", title: "Common Valance to Cover 2 shades" }] },
    { id: "top-treatment", title: "Top Treatment", description: "Valances cannot be added later.", optional: true,
      options: [{ key: "Curved Fascia with Fabric Insert", title: "Curved Fascia with Fabric Insert", adds: "Adds $79.58" }, { key: "Square Aluminum Fascia", title: "Square Aluminum Fascia", adds: "Adds $79.58" }, { key: "Fabric Valance", title: "Fabric Valance", adds: "Adds $79.58" }] },
    { id: "keystone", title: "Do you need a Keystone?", reviewTitle: "Valance Keystone", description: "",
      options: [{ key: "No Keystone", title: "No Keystone" }, { key: "Keystone", title: "Keystone", adds: "Adds $58.07" }] },
    { id: "light-guard", title: "Light Guard", description: "Aluminum Light Guards are a great way to reduce light that could otherwise enter from the side of your shades.", optional: true,
      options: [{ key: "Yes, I want Light Guard", title: "Yes, I want Light Guard", adds: "Adds $43.87" }] }
  ]
};

function isVenetaRollerProduct(product) {
  const category = String(product?.category || "").toLowerCase();
  const brand = String(product?.brand || "").toLowerCase();
  return brand === "veneta" && category.includes("roller");
}

function migrateRollerConfiguratorOnce(products) {
  return products.map((product) => {
    if (product?.rollerConfiguratorMigrationDone || !isVenetaRollerProduct(product)) return product;
    const current = product?.configurator || product?.configuratorSchema || {};
    return {
      ...product,
      configurator: mergeConfiguratorSchema({
        ...current,
        ...ROLLER_CONFIGURATOR_FIELDS,
        visibleSections: { ...(current.visibleSections || {}), mountOptions: true, liftOptions: true, headrailOptions: true }
      }),
      rollerConfiguratorMigrationDone: true
    };
  });
}

// "Adds $43.01" / "+$17.86" -> 43.01
function parseAddOnPrice(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Rule check: { field, values } where "*" matches any non-empty selection.
function ruleMatches(rule, config) {
  if (!rule || !rule.field) return false;
  const current = config[rule.field] || "";
  const values = Array.isArray(rule.values) ? rule.values : [];
  return values.includes("*") ? Boolean(current) : values.includes(current);
}

function getRenderableConfiguratorSchema(product, schema) {
  return mergeConfiguratorSchema(schema || getProductConfiguratorSchema(product));
}


const DEFAULT_STOCK_OPTIONS = {
  colors: [
    { key: "snow-drift", label: "Snow Drift", swatchColor: "#f4f4f4", swatchImageUrl: "" },
    { key: "pearl-white", label: "Pearl White", swatchColor: "#ffffff", swatchImageUrl: "" },
    { key: "linen", label: "Linen", swatchColor: "#dfd4c6", swatchImageUrl: "" },
    { key: "sand", label: "Sand", swatchColor: "#c7b99a", swatchImageUrl: "" },
    { key: "espresso", label: "Espresso", swatchColor: "#453a36", swatchImageUrl: "" }
  ],
  widths: ["35 in"],
  lengths: ["48 in", "64 in", "72 in"],
  defaultColor: "snow-drift",
  defaultWidth: "35 in",
  defaultLength: "64 in",
  priceDisplay: {
    mode: "range",
    minPrice: "",
    maxPrice: "",
    rangeText: ""
  },
  fulfillment: {
    storeName: "Cypress",
    zip: "90630",
    storeStock: 6,
    deliveryStock: 699,
    pickupOnlineAvailable: false,
    deliveryAvailable: true,
    fasterDeliveryAvailable: true,
    fasterDeliveryFee: "10"
  },
  installation: {
    available: true,
    defaultSelected: false
  }
};

function normalizeList(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return fallback;
}

function mergeStockOptions(value) {
  const source = value && typeof value === "object" ? value : {};
  const colorsSource = Array.isArray(source.colors) && source.colors.length ? source.colors : DEFAULT_STOCK_OPTIONS.colors;
  const colors = colorsSource.map((color, index) => {
    const label = String(color?.label || color?.title || color?.key || `Color ${index + 1}`).trim() || `Color ${index + 1}`;
    return {
      key: String(color?.key || label.toLowerCase().replace(/\s+/g, "-") || `color-${index + 1}`),
      label,
      swatchColor: String(color?.swatchColor || color?.color || "#f4f4f4"),
      swatchImageUrl: String(color?.swatchImageUrl || color?.imageUrl || "")
    };
  });
  const widths = normalizeList(source.widths, DEFAULT_STOCK_OPTIONS.widths);
  const cleanWidths = widths.length ? widths : DEFAULT_STOCK_OPTIONS.widths;
  const lengths = normalizeList(source.lengths, DEFAULT_STOCK_OPTIONS.lengths);
  const cleanLengths = lengths.length ? lengths : DEFAULT_STOCK_OPTIONS.lengths;
  const colorKeys = colors.map((color) => color.key);
  const firstColor = colors[0]?.key || DEFAULT_STOCK_OPTIONS.defaultColor;
  const requestedColor = source.defaultColor || DEFAULT_STOCK_OPTIONS.defaultColor;
  const requestedWidth = source.defaultWidth || DEFAULT_STOCK_OPTIONS.defaultWidth;
  const requestedLength = source.defaultLength || DEFAULT_STOCK_OPTIONS.defaultLength;
  const priceDisplay = { ...DEFAULT_STOCK_OPTIONS.priceDisplay, ...(source.priceDisplay || {}) };
  const fulfillment = { ...DEFAULT_STOCK_OPTIONS.fulfillment, ...(source.fulfillment || {}) };
  const installation = { ...DEFAULT_STOCK_OPTIONS.installation, ...(source.installation || {}) };

  return {
    ...DEFAULT_STOCK_OPTIONS,
    ...source,
    colors,
    widths: cleanWidths,
    lengths: cleanLengths,
    defaultColor: colorKeys.includes(requestedColor) ? requestedColor : firstColor,
    defaultWidth: cleanWidths.includes(requestedWidth) ? requestedWidth : cleanWidths[0],
    defaultLength: cleanLengths.includes(requestedLength) ? requestedLength : (cleanLengths[1] || cleanLengths[0]),
    priceDisplay,
    fulfillment,
    installation
  };
}

function getStockOptions(product) {
  return mergeStockOptions(product?.stockOptions || product?.stock || DEFAULT_STOCK_OPTIONS);
}


function normalizeShopType(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "pre-cut" || v === "in stock") return "Pre-Cut";
  return "Custom";
}

function isStoreTodayShopType(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "pre-cut" || v === "in stock";
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bblinds\b/g, "blind")
    .replace(/\bshades\b/g, "shade")
    .replace(/\bcurtains\b/g, "curtain")
    .replace(/\s+/g, " ")
    .trim();
}

function expandSearchQuery(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];

  const aliases = [
    [/\bfax\s+wood\b/g, "faux wood"],
    [/\bfox\s+wood\b/g, "faux wood"],
    [/\bfauxwood\b/g, "faux wood"],
    [/\bfo\s+wood\b/g, "faux wood"],
    [/\bcell\s+shade\b/g, "cellular shade"],
    [/\bcellular\s+blind\b/g, "cellular shade"],
    [/\bhoney\s*comb\b/g, "cellular"],
    [/\bzebra\s+(blind|shade)\b/g, "banded shade"],
    [/\blayered\s+(blind|shade)\b/g, "banded shade"],
    [/\broller\s+blind\b/g, "roller shade"],
    [/\bblack\s*out\b/g, "blackout"],
    [/\broom\s+dark\b/g, "room darkening"],
    [/\bmini\s+blind\b/g, "vinyl mini blind"]
  ];

  const expanded = new Set([normalized]);
  aliases.forEach(([pattern, replacement]) => {
    if (pattern.test(normalized)) expanded.add(normalized.replace(pattern, replacement));
  });

  const compact = normalized.replace(/\s+/g, "");
  if (compact.includes("fauxwood")) expanded.add(normalized.replace(/faux\s*wood|fauxwood|fax\s*wood|fox\s*wood/g, "faux wood"));

  return Array.from(expanded).filter(Boolean);
}

function searchTextMatches(haystack, query) {
  const normalizedHaystack = normalizeSearchText(haystack);
  const queryVariants = expandSearchQuery(query);
  if (!queryVariants.length) return true;

  return queryVariants.some((variant) => {
    if (normalizedHaystack.includes(variant)) return true;
    const terms = variant.split(" ").filter((term) => term.length > 1);
    return terms.length > 0 && terms.every((term) => normalizedHaystack.includes(term));
  });
}

function imgSrc(url) {
  if (!url) return "";
  const clean = String(url).trim();
  if (!clean) return "";
  if (clean.startsWith("/uploads/")) return `${API_BASE}${clean}`;
  return clean;
}

function normalizeImageUrl(url) {
  return imgSrc(url);
}

function toPriceNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const match = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return fallback;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  const n = toPriceNumber(value, 0);
  return n.toFixed(2).split(".");
}

function getStockCardPriceDisplay(product) {
  const stockOptions = getStockOptions(product);
  const display = stockOptions.priceDisplay || {};
  const mode = display.mode || "range";
  const customText = String(display.rangeText || product.priceRangeText || "").trim();

  if (mode === "custom" && customText) {
    return { type: "custom", text: customText };
  }

  const minRaw = display.minPrice || product.priceRangeMin || product.minPrice || product.price;
  const maxRaw = display.maxPrice || product.priceRangeMax || product.maxPrice || product.stockMaxPrice;
  const min = toPriceNumber(minRaw, toPriceNumber(product.price, 0));
  const max = toPriceNumber(maxRaw, NaN);

  if (mode !== "single" && Number.isFinite(max) && max > min) {
    return { type: "range", min, max };
  }

  return { type: "single", min };
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

function isLocalDevelopmentHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}


function getProductGalleryImages(product) {
  if (!product) return [];

  const includeHoverInCarousel = product.includeHoverInCarousel !== false;
  const candidates = [
    product.imageUrl,
    ...(includeHoverInCarousel ? [product.hoverImageUrl] : []),
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.galleryImages) ? product.galleryImages : []),
    ...(Array.isArray(product.additionalImages) ? product.additionalImages : [])
  ];

  return Array.from(
    new Set(
      candidates
        .flatMap((item) => {
          if (!item) return [];
          if (typeof item === "string") return [item.trim()];
          if (Array.isArray(item)) return item;
          if (typeof item === "object") {
            return [item.url, item.src, item.imageUrl, item.image].filter(Boolean);
          }
          return [];
        })
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

function getProductBreadcrumbs(product) {
  const rawCategory = String(product?.category || "").trim();
  const fallbackCategory = "Window Treatments";
  const category = rawCategory || fallbackCategory;
  const lowerCategory = category.toLowerCase();
  const department = lowerCategory.includes("shade") ? "Shades" : lowerCategory.includes("blind") ? "Blinds" : "Window Treatments";
  const crumbs = ["Home", "Window Treatments"];

  if (department !== "Window Treatments") crumbs.push(department);
  if (category !== fallbackCategory && !crumbs.some((crumb) => crumb.toLowerCase() === lowerCategory)) crumbs.push(category);

  return crumbs;
}

function Header({ searchQuery, setSearchQuery, openEditor, compareCount }) {
  return (
    <header className="hd-header hd-screenshot-header">
      <div className="top-strip">#1 Home Improvement Retailer</div>
      <div className="hd-credit-row" aria-hidden="true" />
      <div className="main-header hd-screenshot-main">
        <div className="hd-logo-wrap">
          <img src="/logo.svg" alt="The Home Depot" className="custom-logo" />
        </div>
        <div className="hd-store-strip">
          <span className="hd-store-item"><Store size={15} /> Store <b>10PM</b></span>
          <span className="hd-store-item"><Truck size={16} /> 12345</span>
        </div>
        <div className="search-wrap hd-search-wrap">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="What can we help you find today?" />
          <button type="button" className="hd-search-submit" aria-label="Search"><Search size={21} /></button>
        </div>
        <div className="hd-header-icons">
          <button type="button" className="hd-nav-icon"><Package size={25} /><span>Shop All</span></button>
          <button type="button" className="hd-nav-icon"><Grid size={25} /><span>Services</span></button>
          <button type="button" className="hd-nav-icon"><Hammer size={25} /><span>DIY</span></button>
          <button type="button" className="hd-nav-icon"><User size={25} /><span>Log In</span></button>
          <button type="button" className="hd-nav-icon cart-link"><ShoppingCart size={25} /><span>Cart</span>{compareCount > 0 && <span className="cart-badge">{compareCount}</span>}</button>
          <button type="button" className="hd-editor-main-button" onClick={openEditor}>Mockup Editor</button>
        </div>
      </div>
    </header>
  );
}

function Rating({ rating, reviews }) {
  const displayRating = 5;
  const displayReviews = 1000;
  return (
    <div className="rating">
      <span className="stars">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="filled-star" />)}
      </span>
      <span>({displayRating.toFixed(1)} / {displayReviews})</span>
    </div>
  );
}

function ProductImage({ product, hoverEnabled, compact = false }) {
  const [primaryError, setPrimaryError] = useState(false);
  const [hoverError, setHoverError] = useState(false);
  const [hoverReady, setHoverReady] = useState(false);

  const primary = useMemo(() => normalizeImageUrl(product.imageUrl), [product.imageUrl]);
  const explicitHover = useMemo(() => normalizeImageUrl(product.hoverImageUrl), [product.hoverImageUrl]);
  const hover = explicitHover || primary;
  const hasSeparateHoverImage = Boolean(explicitHover) && explicitHover !== primary;

  useEffect(() => {
    setPrimaryError(false);
  }, [product.id, primary]);

  useEffect(() => {
    setHoverError(false);
    setHoverReady(false);

    if (!hasSeparateHoverImage || !hover) return;

    let cancelled = false;
    const probe = new Image();
    const markLoaded = () => {
      if (!cancelled) {
        setHoverError(false);
        setHoverReady(true);
      }
    };
    const markFailed = () => {
      if (!cancelled) {
        setHoverReady(false);
        setHoverError(true);
      }
    };

    probe.onload = markLoaded;
    probe.onerror = markFailed;
    probe.src = hover;

    if (probe.complete) {
      if (probe.naturalWidth > 0) markLoaded();
      else markFailed();
    }

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [product.id, hover, hasSeparateHoverImage]);

  // Keep hover preview forgiving: render and swap whenever a distinct hover URL exists.
  // Some existing/external links can report a transient preload error, so we do not
  // permanently block the hover image unless the URL itself is removed.
  const canHoverSwap = hoverEnabled && hasSeparateHoverImage && hover;

  return (
    <div className={`product-image ${compact ? "compact" : ""}`}>
      {!primaryError && primary ? (
        <img
          src={primary}
          alt={product.name}
          className={canHoverSwap ? "primary-img can-hover" : "primary-img"}
          onError={() => setPrimaryError(true)}
        />
      ) : <div className="missing-image">Image Needed</div>}

      {hasSeparateHoverImage && hover ? (
        <img
          src={hover}
          alt={`${product.name} hover`}
          className={canHoverSwap ? "hover-img can-hover" : "hover-img"}
          onLoad={() => { setHoverError(false); setHoverReady(true); }}
          onError={() => { console.warn("Hover image failed to load:", hover); setHoverReady(false); }}
        />
      ) : null}

      {canHoverSwap && <div className="hover-label">Hover image</div>}
    </div>
  );
}


function getImageAssetName(value, fallback = "Image ready") {
  const clean = String(value || "").trim();
  if (!clean) return "No image selected";

  if (clean.startsWith("data:image/")) return fallback;
  if (clean.startsWith("blob:")) return fallback;

  try {
    const url = new URL(clean, typeof window !== "undefined" ? window.location.origin : "https://example.com");
    const file = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    if (!file || file.length > 48 || /^[A-Za-z0-9+/=]{12,}$/.test(file)) return fallback;
    return file;
  } catch {
    const file = clean.split(/[?#]/)[0].split("/").filter(Boolean).pop();
    if (!file || file.length > 48 || /^[A-Za-z0-9+/=]{12,}$/.test(file)) return fallback;
    return file;
  }
}


function getDefaultGalleryImageTitle(index) {
  return DEFAULT_GALLERY_IMAGE_NAMES[index] || `Carousel Image ${index + 1}`;
}

function createGalleryImageItem(value = "", index = 0) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const url = String(value.url || value.src || value.imageUrl || value.image || "");
    const title = String(value.title || value.name || value.label || getDefaultGalleryImageTitle(index));
    return { ...value, title, url };
  }
  return { title: getDefaultGalleryImageTitle(index), url: String(value || "") };
}

function getGalleryImageUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") return String(item.url || item.src || item.imageUrl || item.image || "");
  return "";
}

function getGalleryImageTitle(item, index) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return String(item.title || item.name || item.label || getDefaultGalleryImageTitle(index));
  }
  return getDefaultGalleryImageTitle(index);
}


function EditorAccordionSection({ productId, sectionId, title, description, status, isOpen, onToggle, headerActions = null, className = "", children }) {
  const panelId = `editor-section-${productId}-${sectionId}`;
  return (
    <section className={`editor-section-card wide editor-accordion-section ${isOpen ? "is-open" : ""} ${className}`}>
      <div className="editor-accordion-heading">
        <button
          type="button"
          className="editor-accordion-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="editor-accordion-title-block">
            <strong>{title}</strong>
            <span>{description}</span>
          </span>
        </button>
        <span className="editor-accordion-actions">
          {status ? <i>{status}</i> : null}
          {headerActions ? <span className="editor-accordion-header-actions">{headerActions}</span> : null}
          <button type="button" className="editor-accordion-chevron" onClick={onToggle} aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`} aria-expanded={isOpen} aria-controls={panelId}>
            <ChevronDown size={18} />
          </button>
        </span>
      </div>
      {isOpen ? <div id={panelId} className="editor-accordion-body">{children}</div> : null}
    </section>
  );
}

function ImageAssetField({ label, value, onChange, onUpload, uploading, helperText }) {
  const [isEditingUrl, setIsEditingUrl] = useState(!value);
  const [imageError, setImageError] = useState(false);
  const cleanValue = String(value || "").trim();
  const hasImage = Boolean(cleanValue);

  useEffect(() => {
    setImageError(false);
    if (!cleanValue) setIsEditingUrl(true);
  }, [cleanValue]);

  return (
    <div className={`editor-image-asset-card ${hasImage ? "has-image" : "needs-image"}`}>
      <div className="editor-image-asset-preview">
        {hasImage && !imageError ? (
          <img src={imgSrc(cleanValue)} alt={label} onError={() => setImageError(true)} />
        ) : (
          <Upload size={19} />
        )}
      </div>
      <div className="editor-image-asset-main">
        <div className="editor-image-asset-topline">
          <span className="editor-image-asset-label">{label}</span>
          <span className={`editor-image-asset-status ${hasImage ? "ready" : "empty"}`}>
            {uploading ? "Uploading…" : hasImage ? "Ready" : "Needed"}
          </span>
        </div>
        <div className="editor-image-asset-name">{getImageAssetName(cleanValue)}</div>
        {helperText ? <div className="editor-image-asset-help">{helperText}</div> : null}
        <div className="editor-image-asset-actions">
          <label className={`editor-image-upload-button ${hasImage ? "is-replace" : ""}`}>
            <Upload size={14} /> {hasImage ? "Replace" : "Upload"}
            <input type="file" accept="image/*" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button type="button" className="editor-image-link-button" onClick={() => setIsEditingUrl((current) => !current)}>
            {isEditingUrl ? "Hide link" : "Paste link"}
          </button>
          {hasImage ? (
            <button type="button" className="editor-image-clear-button" onClick={() => { onChange(""); setIsEditingUrl(true); }} aria-label={`Clear ${label}`}>
              <X size={14} />
            </button>
          ) : null}
        </div>
        {isEditingUrl ? (
          <input
            className="editor-image-url-input"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste image URL"
          />
        ) : null}
      </div>
    </div>
  );
}

function GalleryImageRow({ productId, img, index, isDragging, dropClass, uploading, onDragOver, onDrop, onDragStart, onDragEnd, onChange, onNameChange, onRemove, onUpload }) {
  const imageUrl = getGalleryImageUrl(img);
  const imageTitle = getGalleryImageTitle(img, index);
  const [isEditingUrl, setIsEditingUrl] = useState(!imageUrl);
  const [imageError, setImageError] = useState(false);
  const cleanValue = String(imageUrl || "").trim();
  const hasImage = Boolean(cleanValue);

  useEffect(() => {
    setImageError(false);
    if (!cleanValue) setIsEditingUrl(true);
  }, [cleanValue]);

  return (
    <div
      className={`editor-gallery-url-row ${isDragging ? "gallery-row-dragging" : ""} ${dropClass}`}
      onDragOver={(e) => onDragOver(e, productId, index)}
      onDrop={(e) => onDrop(e, productId, index)}
    >
      <button
        type="button"
        className="editor-gallery-drag-handle"
        draggable
        onDragStart={(e) => onDragStart(e, productId, index)}
        onDragEnd={onDragEnd}
        aria-label={`Drag carousel image ${index + 1} to reorder`}
        title="Drag to reorder"
      >⋮⋮</button>
      <div className="editor-gallery-row-preview">
        {hasImage && !imageError ? <img src={imgSrc(cleanValue)} alt={`Carousel ${index + 1}`} onError={() => setImageError(true)} /> : <Upload size={16} />}
      </div>
      <div className="editor-gallery-row-main">
        <div className="editor-gallery-row-title">
          <input
            className="editor-gallery-name-input"
            value={imageTitle}
            onChange={(e) => onNameChange(productId, index, e.target.value)}
            placeholder={getDefaultGalleryImageTitle(index)}
            aria-label={`Carousel image ${index + 1} name`}
          />
          <span>{uploading ? "Uploading…" : hasImage ? "Ready" : "Add image"}</span>
        </div>
        <div className="editor-gallery-row-name">{getImageAssetName(cleanValue, `Carousel image ${index + 1}`)}</div>
        {isEditingUrl ? (
          <input value={imageUrl || ""} onChange={(e) => onChange(productId, index, e.target.value)} placeholder="Paste carousel image URL" />
        ) : null}
        <div className="editor-gallery-row-buttons">
          <label className="editor-gallery-replace-button">
            <Upload size={13} /> {hasImage ? "Replace" : "Upload"}
            <input type="file" accept="image/*" onChange={(e) => { onUpload(productId, index, e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button type="button" className="editor-gallery-link-toggle" onClick={() => setIsEditingUrl((current) => !current)}>
            {isEditingUrl ? "Done" : "Edit link"}
          </button>
        </div>
      </div>
      <div className="editor-gallery-row-actions">
        <button type="button" className="editor-gallery-remove" onClick={() => onRemove(productId, index)} aria-label="Remove carousel image"><X size={14} /></button>
      </div>
    </div>
  );
}

function PriceAmount({ value, compact = false }) {
  const [dollars, cents] = money(value);
  return (
    <div className={`price hd-card-price ${compact ? "compact-price" : ""}`}>
      <span className="currency">$</span>
      <span className="dollars">{dollars}</span>
      <span className="cents">{cents}</span>
    </div>
  );
}

function ProductCard({ product, hoverEnabled, showReferenceBorders, placeholderNonBordered, layoutEditMode, layoutIndex = 0, layoutTotal = 0, layoutDraggingId, layoutDropTarget, onLayoutDragStart, onLayoutDragEnd, onLayoutDragOver, onLayoutDrop, onLayoutMove, view, compare, setCompare, liked, setLiked, setQuickView, openProductPage }) {
  const [dollars, cents] = money(product.price);
  const isCompared = compare.has(product.id);
  const isLiked = liked.has(product.id);
  const toggleSet = (setter, id) => setter((old) => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const badge = String(product.badge || "").trim();
  const was = Number(product.was || 0);
  const price = Number(product.price || 0);
  const savings = was && price ? (was - price).toFixed(2) : null;
  const savingsPct = was && price ? Math.round(((was - price) / was) * 100) : null;
  const promo = product.promo || `Buy 1 or More, Get ${savingsPct || 25}% Off`;
  const isPreCutProduct = normalizeShopType(product.shopType) === "Pre-Cut";
  const stockOptions = isPreCutProduct ? getStockOptions(product) : null;
  const stockCardPrice = isPreCutProduct ? getStockCardPriceDisplay(product) : null;
  const stockSwatches = stockOptions?.colors || [];
  const swatchOverflowCount = Math.max(0, stockSwatches.length - 4);
  const swatchOverflowLabel = swatchOverflowCount > 99 ? "More Options" : `+${swatchOverflowCount} more`;
  const showPlaceholder = Boolean(placeholderNonBordered && !product.referenceBorder);
  const openCard = () => { if (!layoutEditMode && !showPlaceholder) openProductPage(product); };
  const isDropTarget = layoutEditMode && layoutDropTarget?.id === product.id && layoutDraggingId !== product.id;
  const dropClass = isDropTarget ? `layout-drop-${layoutDropTarget.position}` : "";

  return (
    <article
      className={`product-card hd-category-card ${isPreCutProduct ? "hd-stock-card" : "hd-custom-card"} ${view === "list" ? "list-card" : ""} ${showPlaceholder ? "is-placeholder-product" : ""} ${!layoutEditMode && showReferenceBorders && product.referenceBorder ? "reference-border" : ""} ${layoutEditMode ? "layout-edit-card" : ""} ${layoutDraggingId === product.id ? "layout-dragging" : ""} ${dropClass}`}
      onDragOver={(e) => layoutEditMode && onLayoutDragOver(e, product)}
      onDrop={(e) => layoutEditMode && onLayoutDrop(e, product)}
    >
      <div className="hd-card-topline">
        {layoutEditMode ? (
          <>
            <button
              type="button"
              className="layout-drag-handle"
              draggable
              onDragStart={(e) => onLayoutDragStart(e, product)}
              onDragEnd={onLayoutDragEnd}
              aria-label={`Drag ${product.name || "product"} to reorder. Current position ${layoutIndex + 1} of ${layoutTotal}.`}
              title="Drag to rearrange"
            >⋮⋮</button>
            <span className="layout-position-badge" aria-label={`Position ${layoutIndex + 1}`}>#{layoutIndex + 1}</span>
          </>
        ) : null}
        {!showPlaceholder && badge ? <span className="product-badge hd-best-badge">{badge}</span> : null}
        {!showPlaceholder ? (
          <button
            className="heart-button hd-card-heart"
            onClick={(e) => { e.stopPropagation(); toggleSet(setLiked, product.id); }}
            aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart size={19} className={isLiked ? "liked" : ""} />
          </button>
        ) : null}
      </div>

      {showPlaceholder ? (
        <div className="hd-card-image-wrap hd-placeholder-image-wrap" aria-hidden="true">
          <div className="hd-placeholder-image" aria-label="Window treatment placeholder">
            <div className="hd-placeholder-window" aria-hidden="true">
              <span className="hd-placeholder-window-bar" />
              <span className="hd-placeholder-window-slat" />
              <span className="hd-placeholder-window-slat" />
              <span className="hd-placeholder-window-slat" />
              <span className="hd-placeholder-window-slat" />
              <span className="hd-placeholder-window-slat" />
              <span className="hd-placeholder-window-pull" />
            </div>
            <span className="hd-placeholder-product-label">Placeholder Product</span>
          </div>
        </div>
      ) : (
        <div className={view === "list" ? "list-image-wrap hd-card-image-wrap clickable" : "hd-card-image-wrap clickable"} onClick={openCard}>
          <ProductImage product={product} hoverEnabled={hoverEnabled} compact={view === "list"} />
        </div>
      )}

      {layoutEditMode ? (
        <div className="layout-mobile-controls" aria-label={`Move ${product.name || "product"}`}>
          <button type="button" onClick={() => onLayoutMove(product.id, "top")} disabled={layoutIndex === 0}>Top</button>
          <button type="button" onClick={() => onLayoutMove(product.id, "up")} disabled={layoutIndex === 0}>↑</button>
          <button type="button" onClick={() => onLayoutMove(product.id, "down")} disabled={layoutIndex >= layoutTotal - 1}>↓</button>
          <button type="button" onClick={() => onLayoutMove(product.id, "bottom")} disabled={layoutIndex >= layoutTotal - 1}>Bottom</button>
        </div>
      ) : null}

      <div className="product-info hd-card-info">
        {showPlaceholder ? (
          <div className="hd-placeholder-info" aria-hidden="true">
            <span className="hd-placeholder-line wide" />
            <span className="hd-placeholder-line medium" />
            <span className="hd-placeholder-line short" />
            <span className="hd-placeholder-line price" />
            <span className="hd-placeholder-line medium lower" />
          </div>
        ) : (
          <>
        <div className="hd-card-option-zone">
          {isPreCutProduct ? (
            <>
              <div className="hd-stock-swatch-line">
                {stockSwatches.slice(0, 4).map((color) => (
                  <span key={color.key} className="hd-stock-swatch" style={{ background: color.swatchColor }}>{color.swatchImageUrl ? <img src={imgSrc(color.swatchImageUrl)} alt="" /> : null}</span>
                ))}
                {swatchOverflowCount > 0 ? <button type="button" className="hd-stock-more-swatches" onClick={openCard}>{swatchOverflowLabel}</button> : null}
              </div>
              {stockOptions?.installation?.available ? <div className="hd-stock-install-note">Expert Installation Available</div> : null}
            </>
          ) : null}
        </div>

        <h3 className="product-title clickable-title" onClick={openCard}>
          <b>{product.brand}</b> {product.name}
        </h3>

        <div className="hd-card-rating-line">
          <Rating rating={product.rating} reviews={product.reviews} />
        </div>
        <div className="model">Model# {product.model}</div>

        <div className="price-area hd-card-price-area">
          {!isPreCutProduct ? <div className="starting">Starting at</div> : null}
          <div className="hd-card-price-row">
            {isPreCutProduct ? (
              <div className="stock-price-range hd-card-stock-price-range">
                {stockCardPrice?.type === "custom" ? (
                  <span className="stock-price-custom">{stockCardPrice.text}</span>
                ) : (
                  <>
                    <PriceAmount value={stockCardPrice?.min ?? product.price} />
                    {stockCardPrice?.type === "range" ? (
                      <>
                        <span className="stock-price-dash">-</span>
                        <PriceAmount value={stockCardPrice.max} />
                      </>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="price hd-card-price"><span className="currency">$</span><span className="dollars">{dollars}</span><span className="cents">{cents}</span></div>
            )}
            {product.was ? (
              <div className="hd-card-savings">
                <span>Was <s>${was.toFixed(2)}</s></span>
                {savings ? <span>Save ${savings} ({savingsPct}%)</span> : null}
              </div>
            ) : null}
          </div>
          {!isPreCutProduct ? <div className="promo hd-card-promo"><Check size={14} /> {promo}</div> : null}
        </div>

        <div className="fulfillment hd-card-fulfillment">
          {isPreCutProduct ? (
            <>
              <div><Truck size={14} /> <b>Delivery:</b> <span>Free</span> | Sat, May 16</div>
              {stockOptions?.fulfillment?.fasterDeliveryAvailable ? <div><Truck size={14} /> <b>Faster Delivery:</b> Get it Today</div> : null}
            </>
          ) : (
            <>
              {(product.pickup || product.pickup === undefined) && <div><Store size={14} /> In Stock at Store Today</div>}
              {(product.delivery || product.delivery === undefined) && <div><Truck size={14} /> Free 1-2 Day Delivery</div>}
            </>
          )}
        </div>

        <div className="card-actions hd-card-actions">
          <button className="build-button hd-card-build" onClick={openCard}>{isPreCutProduct ? "Choose Options" : "Build and Buy"}</button>
          <div className="lower-actions hd-card-lower-actions">
            <label onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isCompared} onChange={() => toggleSet(setCompare, product.id)} /> Compare</label>
            <button onClick={() => setQuickView(product)}><Eye size={14} /> Quick View</button>
          </div>
        </div>
          </>
        )}
      </div>
    </article>
  );
}

function StockPurchasePanel({ product }) {
  const stockOptions = useMemo(() => getStockOptions(product), [product]);
  const initialColor = stockOptions.colors.some((color) => color.key === stockOptions.defaultColor) ? stockOptions.defaultColor : stockOptions.colors[0]?.key;
  const [selectedColor, setSelectedColor] = useState(initialColor || "");
  const [selectedWidth, setSelectedWidth] = useState(stockOptions.defaultWidth || stockOptions.widths[0] || "");
  const [selectedLength, setSelectedLength] = useState(stockOptions.defaultLength || stockOptions.lengths[0] || "");
  const [fulfillmentMode, setFulfillmentMode] = useState(stockOptions.fulfillment.deliveryAvailable ? "delivery" : "store");
  const [installationSelected, setInstallationSelected] = useState(Boolean(stockOptions.installation.defaultSelected));
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const nextOptions = getStockOptions(product);
    setSelectedColor(nextOptions.colors.some((color) => color.key === nextOptions.defaultColor) ? nextOptions.defaultColor : nextOptions.colors[0]?.key || "");
    setSelectedWidth(nextOptions.defaultWidth || nextOptions.widths[0] || "");
    setSelectedLength(nextOptions.defaultLength || nextOptions.lengths[0] || "");
    setFulfillmentMode(nextOptions.fulfillment.deliveryAvailable ? "delivery" : "store");
    setInstallationSelected(Boolean(nextOptions.installation.defaultSelected));
    setQuantity(1);
  }, [product]);

  const selectedColorLabel = stockOptions.colors.find((color) => color.key === selectedColor)?.label || stockOptions.colors[0]?.label || "Snow Drift";
  const fulfillment = stockOptions.fulfillment;

  return (
    <div className="pdp-stock-panel">
      <div className="pdp-stock-option-block">
        <div className="pdp-stock-label">Color/Finish: <strong>{selectedColorLabel}</strong></div>
        <div className="pdp-stock-swatches" role="radiogroup" aria-label="Color finish">
          {stockOptions.colors.map((color) => (
            <button
              key={color.key}
              type="button"
              className={selectedColor === color.key ? "pdp-stock-swatch active" : "pdp-stock-swatch"}
              onClick={() => setSelectedColor(color.key)}
              aria-label={color.label}
              aria-pressed={selectedColor === color.key}
            >
              {color.swatchImageUrl ? <img src={imgSrc(color.swatchImageUrl)} alt="" /> : <span style={{ background: color.swatchColor }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="pdp-stock-option-block">
        <label className="pdp-stock-label" htmlFor="stock-width-select">Product Width (in.): <strong>{selectedWidth}</strong></label>
        <div className="pdp-stock-select-shell">
          <select id="stock-width-select" value={selectedWidth} onChange={(e) => setSelectedWidth(e.target.value)}>
            {stockOptions.widths.map((width) => <option key={width} value={width}>{width}</option>)}
          </select>
          <ChevronDown size={18} />
        </div>
      </div>

      <div className="pdp-stock-option-block">
        <div className="pdp-stock-label">Product Length (in.): <strong>{selectedLength}</strong></div>
        <div className="pdp-stock-lengths" role="radiogroup" aria-label="Product length">
          {stockOptions.lengths.map((length) => (
            <button key={length} type="button" className={selectedLength === length ? "active" : ""} onClick={() => setSelectedLength(length)}>{length}</button>
          ))}
        </div>
      </div>

      <div className="pdp-stock-fulfillment-wrap">
        <div className="pdp-stock-fulfillment-head">
          <span>Available at <a href="#0">{fulfillment.storeName || "Your Store"}</a></span>
          <span>Delivering to <a href="#0">{fulfillment.zip || "90630"}</a></span>
        </div>
        <div className="pdp-stock-fulfillment-grid">
          <button type="button" className={fulfillmentMode === "store" ? "pdp-stock-fulfillment-card active" : "pdp-stock-fulfillment-card"} onClick={() => setFulfillmentMode("store")}>
            <strong>At Your Store</strong>
            <span>Today <i /> </span>
            <em>{Number(fulfillment.storeStock || 0)} in stock</em>
          </button>
          <button type="button" className={fulfillmentMode === "delivery" ? "pdp-stock-fulfillment-card active" : "pdp-stock-fulfillment-card"} onClick={() => setFulfillmentMode("delivery")} disabled={!fulfillment.deliveryAvailable}>
            <strong>Delivery</strong>
            <span>Today</span>
            <em>{Number(fulfillment.deliveryStock || 0)} available</em>
            <b>FREE</b>
            {fulfillmentMode === "delivery" ? <Check size={14} /> : null}
          </button>
        </div>
        <div className="pdp-stock-links"><a href="#0">Check Nearby Stores</a><a href="#0">Delivery Details</a></div>
        {fulfillment.pickupOnlineAvailable === false ? (
          <div className="pdp-stock-info"><span>i</span>This item isn't available for Pickup online, but can still be purchased in-store.</div>
        ) : null}
        {fulfillment.fasterDeliveryAvailable ? (
          <div className="pdp-stock-fast"><Truck size={26} /><span><strong>Faster Delivery: Within 3 Hours (+${fulfillment.fasterDeliveryFee || "10"}).</strong><br />Schedule in Checkout.</span></div>
        ) : null}
      </div>

      {stockOptions.installation.available ? (
        <div className="pdp-stock-install">
          <div className="pdp-stock-install-title"><Hammer size={30} /><strong>Get Expert In-Home Installation</strong></div>
          <p>A local pro will take care of the job for you</p>
          <label><input type="checkbox" checked={installationSelected} onChange={(e) => setInstallationSelected(e.target.checked)} /> Request installation service</label>
          <a href="#0">What to Expect</a>
        </div>
      ) : null}

      <div className="pdp-stock-cart-row">
        <div className="pdp-stock-qty" aria-label="Quantity selector">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((value) => value + 1)}>＋</button>
        </div>
        <button type="button" className="pdp-stock-add-cart"><ShoppingCart size={16} /> Add to Cart</button>
      </div>
    </div>
  );
}


function ProductDetailPage({ product, onBack, onCustomize }) {
  // The side rail has 6 total visible slots. The primary image and the hover
  // image (when Hover in Carousel is enabled and a hover URL exists) consume
  // the first slots before uploaded/gallery images. The 6th slot becomes the
  // +remaining tile, so the number includes that 6th image plus anything after it.
  const galleryImages = useMemo(() => getProductGalleryImages(product), [product]);
  const maxVisibleThumbs = 6;
  const totalCarouselImageCount = galleryImages.length;
  const overlayThumbIndex = maxVisibleThumbs - 1;
  const visibleBeforeOverlayCount = maxVisibleThumbs - 1;
  const remainingThumbCount = Math.max(0, totalCarouselImageCount - visibleBeforeOverlayCount);
  const displayThumbs = galleryImages.slice(0, maxVisibleThumbs);
  const [activeIndex, setActiveIndex] = useState(0);
  const [widthIn, setWidthIn] = useState("24");
  const [widthFrac, setWidthFrac] = useState("0/0");
  const [heightIn, setHeightIn] = useState("36");
  const [heightFrac, setHeightFrac] = useState("0/0");

  useEffect(() => {
    setActiveIndex(0);
  }, [product]);

  const heroImage = galleryImages[activeIndex] || galleryImages[0] || product.imageUrl || product.hoverImageUrl || "";
  const hasMultipleImages = galleryImages.length > 1;
  const detailBrand = product.brand || "Veneta";
  const brandOverview = `${detailBrand} offers thoughtfully designed window treatments that blend style, functionality, and quality craftsmanship. From modern minimalism to timeless elegance, our collections are created to enhance any space while providing the perfect balance of light control, privacy, and comfort.`;
  const detailTitle = product.pdpTitle || product.detailTitle || product.name || "Custom Classic 2 in. Room Darkening Cordless Faux Wood Blinds for Windows";
  const isPreCutProduct = normalizeShopType(product.shopType) === "Pre-Cut";
  const breadcrumbItems = getProductBreadcrumbs(product);
  const internetNumber = product.internetNumber || product.internet || product.internetId || product.itemNumber || "305091385";
  const reviewCount = 1000;
  const questionCount = 100;
  const ratingValue = 5;
  const stockPriceDisplay = isPreCutProduct ? getStockCardPriceDisplay(product) : null;
  const stockLowestPrice = stockPriceDisplay
    ? toPriceNumber(stockPriceDisplay.type === "custom" ? stockPriceDisplay.text : stockPriceDisplay.min, toPriceNumber(product.price || product.pdpPrice || product.detailPrice || product.configuredPrice, 0))
    : null;
  const displayPrice = isPreCutProduct && stockLowestPrice !== null
    ? stockLowestPrice
    : toPriceNumber(product.price || product.pdpPrice || product.detailPrice || product.configuredPrice, 180.48);
  const rawDisplayWas = product.was || product.pdpWas || product.detailWas || product.configuredWas || "";
  const displayWas = toPriceNumber(rawDisplayWas, NaN);
  const hasPdpDiscount = Number.isFinite(displayWas) && displayWas > displayPrice;
  const [dollars, cents] = money(displayPrice);
  const savingsPct = hasPdpDiscount ? Math.round(((displayWas - displayPrice) / displayWas) * 100) : 0;
  const pdpPromoText = product.promo || (hasPdpDiscount ? "Save up to 25% off Select Custom Blinds from Bali, Levolor and Veneta! Now through 5/13!" : "");
  const pdpFractions = ["0/0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];
  const wholeOptions = Array.from({ length: 121 }, (_, i) => String(i));

  const goPrevImage = () => {
    if (!hasMultipleImages) return;
    setActiveIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
  };

  const goNextImage = () => {
    if (!hasMultipleImages) return;
    setActiveIndex((current) => (current + 1) % galleryImages.length);
  };

  const onGalleryKeyDown = (event) => {
    if (!hasMultipleImages) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goPrevImage();
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goNextImage();
    }
  };

  const renderStars = () => (
    <span className="pdp-shot-rating-stars" aria-label={`${ratingValue.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, ratingValue - index));
        return (
          <span key={index} className="pdp-shot-star-wrap">
            <Star size={20} className="pdp-shot-star-empty" />
            <span className="pdp-shot-star-fill" style={{ width: `${fill * 100}%` }}>
              <Star size={20} className="pdp-shot-star-solid" />
            </span>
          </span>
        );
      })}
    </span>
  );

  const renderMeasureField = (label, whole, fraction, setWhole, setFraction) => (
    <div className="pdp-shot-measure-group">
      <label className="pdp-shot-measure-label">Window {label} (in.)</label>
      <div className="pdp-shot-measure-controls">
        <div className="pdp-shot-select-shell">
          <select value={whole} onChange={(e) => setWhole(e.target.value)}>
            {wholeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown size={17} />
        </div>
        <div className="pdp-shot-select-shell">
          <select value={fraction} onChange={(e) => setFraction(e.target.value)}>
            {pdpFractions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown size={17} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="pdp-wrap pdp-screenshot-wrap">
      <nav className="pdp-breadcrumb pdp-shot-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="pdp-shot-back-button" onClick={onBack}><ArrowLeft size={14} /> Back to Results</button>
        {breadcrumbItems.map((crumb, index) => (
          <React.Fragment key={`${crumb}-${index}`}>
            <span>/</span>
            {index === 0 ? (
              <button type="button" className="pdp-shot-crumb-button" onClick={onBack}>{crumb}</button>
            ) : (
              <span>{crumb}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <section className={isPreCutProduct ? "pdp-grid pdp-screenshot-grid pdp-stock-grid" : "pdp-grid pdp-screenshot-grid"}>
        <div className={isPreCutProduct ? "pdp-shot-panel pdp-shot-gallery-panel pdp-stock-gallery-panel" : "pdp-shot-panel pdp-shot-gallery-panel"}>
          {!isPreCutProduct ? <div className="pdp-shot-internet-no">Internet # <strong>{internetNumber}</strong></div> : null}

          {isPreCutProduct ? (
            <div className="pdp-stock-gallery-layout">
              <div
                className="pdp-shot-hero-shell pdp-stock-hero-shell"
                tabIndex={hasMultipleImages ? 0 : -1}
                onKeyDown={onGalleryKeyDown}
                aria-label={`${detailTitle} product gallery`}
                aria-roledescription="carousel"
              >
                {hasMultipleImages ? (
                  <button className="pdp-shot-gallery-arrow left" onClick={goPrevImage} type="button" aria-label="Previous image">
                    <ArrowLeft size={18} />
                  </button>
                ) : null}

                <div className="pdp-shot-hero-stage pdp-stock-hero-stage">
                  {heroImage ? <img src={imgSrc(heroImage)} alt={detailTitle} /> : <div className="missing-image">Image Needed</div>}
                </div>

                {hasMultipleImages ? (
                  <button className="pdp-shot-gallery-arrow right" onClick={goNextImage} type="button" aria-label="Next image">
                    <ArrowRight size={18} />
                  </button>
                ) : null}
              </div>

              <div className="pdp-stock-hover-copy">Hover Image to Zoom</div>

              <div className="pdp-stock-thumb-row" aria-label="Product thumbnails">
                {displayThumbs.map((thumb, index) => {
                  const showOverlay = index === overlayThumbIndex && remainingThumbCount > 0;
                  return (
                    <button
                      key={`${thumb}-${index}`}
                      type="button"
                      className={`pdp-stock-thumb-btn ${activeIndex === index ? "active" : ""}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show product image ${index + 1}`}
                      aria-current={activeIndex === index ? "true" : undefined}
                    >
                      <img src={imgSrc(thumb)} alt="" />
                      {showOverlay ? <span className="pdp-shot-thumb-overlay">+{remainingThumbCount}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="pdp-stock-room-row">
                <button type="button" className="pdp-stock-room-button"><Home size={15} /> See This in My Room</button>
              </div>
            </div>
          ) : (
            <>
              <div className="pdp-shot-gallery-layout">
                <div className="pdp-shot-thumb-rail" aria-label="Product thumbnails">
                  {displayThumbs.map((thumb, index) => {
                    const showOverlay = index === overlayThumbIndex && remainingThumbCount > 0;
                    return (
                      <button
                        key={`${thumb}-${index}`}
                        type="button"
                        className={`pdp-shot-thumb-btn ${activeIndex === index ? "active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onFocus={() => setActiveIndex(index)}
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Show product image ${index + 1}`}
                        aria-current={activeIndex === index ? "true" : undefined}
                      >
                        <img src={imgSrc(thumb)} alt="" />
                        {showOverlay ? <span className="pdp-shot-thumb-overlay">+{remainingThumbCount}</span> : null}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="pdp-shot-hero-shell"
                  tabIndex={hasMultipleImages ? 0 : -1}
                  onKeyDown={onGalleryKeyDown}
                  aria-label={`${detailTitle} product gallery`}
                  aria-roledescription="carousel"
                >
                  {hasMultipleImages ? (
                    <button className="pdp-shot-gallery-arrow left" onClick={goPrevImage} type="button" aria-label="Previous image">
                      <ArrowLeft size={18} />
                    </button>
                  ) : null}

                  <div className="pdp-shot-hero-stage">
                    {heroImage ? <img src={imgSrc(heroImage)} alt={detailTitle} /> : <div className="missing-image">Image Needed</div>}
                  </div>

                  {hasMultipleImages ? (
                    <button className="pdp-shot-gallery-arrow right" onClick={goNextImage} type="button" aria-label="Next image">
                      <ArrowRight size={18} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="pdp-shot-swatch-bar">
                <div className="pdp-shot-swatch-left">
                  <div className="pdp-shot-swatch-icon" aria-hidden="true" />
                  <div className="pdp-shot-swatch-copy">
                    <strong>Color Sample Swatches</strong>
                    <p>Order up to 10 free samples with free shipping included.</p>
                  </div>
                </div>
                <button type="button" className="pdp-shot-swatch-btn">Order Color Samples</button>
              </div>
            </>
          )}
        </div>

        <div className="pdp-shot-panel pdp-shot-detail-panel">
          <h1 className="pdp-shot-product-title">{detailTitle}</h1>
          <div className="pdp-shot-brand-line">By <a href="#0">{detailBrand}</a></div>

          <div className="pdp-shot-rating-row">
            {renderStars()}
            <a className="pdp-shot-rating-link" href="#0">{ratingValue.toFixed(1)} ({reviewCount})</a>
            <a className="pdp-shot-qa-link" href="#0">Questions &amp; Answers ({questionCount})</a>
          </div>

          <div className="pdp-shot-rule" />

          <p className="pdp-shot-desc">
            {brandOverview}
          </p>

          {!isPreCutProduct ? (
            <>
              <div className="pdp-shot-benefit-grid">
                <div className="pdp-shot-benefit-row"><Package size={18} /><span>Free Shipping</span></div>
                <div className="pdp-shot-benefit-row fit"><ShieldCheck size={18} /><span>Guaranteed to Fit!</span></div>
              </div>

              <div className="pdp-shot-help-line"><Phone size={18} /><span>Call 800-921-2119 for Free Expert Help</span></div>
            </>
          ) : null}

          <div className="pdp-shot-price-box">
            <div className="pdp-shot-price-line">
              {hasPdpDiscount ? <div className="pdp-shot-special-badge"><span>SPECIAL</span><b>BUY</b></div> : null}
              <span className="pdp-shot-price-dollar">$</span>
              <span className="pdp-shot-price-major">{dollars}</span>
              <span className="pdp-shot-price-cents">{cents}</span>
              {hasPdpDiscount ? <span className="pdp-shot-was-save"><span className="pdp-shot-was-price">${displayWas.toFixed(2)}</span><b>SAVE {savingsPct}%</b></span> : null}
              {!isPreCutProduct ? <span className="pdp-shot-size-line">for {widthIn} in by {heightIn} in</span> : null}
            </div>
            {pdpPromoText ? <div className="pdp-shot-promo-line">{pdpPromoText}</div> : null}
            <div className="pdp-shot-card-line">
              <CreditCard size={36} />
              <span>Pay <b>$155.48</b> after <b>$25 OFF</b> your total qualifying purchase upon opening a new card. <HelpCircle size={13} /><br /><a href="#0">Apply for a Home Depot Consumer Card</a></span>
            </div>
          </div>

          {isPreCutProduct ? (
            <StockPurchasePanel product={product} />
          ) : (
            <>
              <div className="pdp-shot-measure-wrap">
                {renderMeasureField("Width", widthIn, widthFrac, setWidthIn, setWidthFrac)}
                {renderMeasureField("Height", heightIn, heightFrac, setHeightIn, setHeightFrac)}
              </div>

              <button type="button" className="pdp-shot-customize-btn" onClick={onCustomize}>Customize and Buy</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}


function ProductConfigurator({ product, onBack, onReturnToPdp, configuratorSchema }) {
  const activeConfiguratorSchema = useMemo(() => getRenderableConfiguratorSchema(product, configuratorSchema), [configuratorSchema, product]);
  const [config, setConfig] = useState(() => {
    const defaults = activeConfiguratorSchema.defaults || {};
    const initial = {
      windowName: "",
      mount: "",
      width: "24",
      widthFraction: "0/0",
      height: "36",
      heightFraction: "0/0",
      color: "",
      paint: "",
      lift: defaults.lift || "",
      headrail: defaults.headrail || activeConfiguratorSchema.headrailOptions[0]?.key || "Standard",
      quantity: "1"
    };
    (activeConfiguratorSchema.customSections || []).forEach((section) => {
      if (section.defaultOption) initial[`custom_${section.id}`] = section.defaultOption;
    });
    return initial;
  });

  // Applies a change, then clears any selection that is now hidden or unavailable
  // (e.g. picking a valance switches Reverse Roll back to the section default).
  const updateConfig = (field, value) => setConfig((current) => {
    const next = { ...current, [field]: value };
    (activeConfiguratorSchema.customSections || []).forEach((section) => {
      const key = `custom_${section.id}`;
      if (section.showWhen && !ruleMatches(section.showWhen, next)) { next[key] = ""; return; }
      const chosen = section.options?.find((option) => option.key === next[key]);
      if (chosen?.disabledWhen && ruleMatches(chosen.disabledWhen, next)) next[key] = section.defaultOption || "";
    });
    return next;
  });
  const eighths = activeConfiguratorSchema.eighths;
  const widthMin = Math.min(activeConfiguratorSchema.widthMin, activeConfiguratorSchema.widthMax);
  const widthMax = Math.max(activeConfiguratorSchema.widthMin, activeConfiguratorSchema.widthMax);
  const heightMin = Math.min(activeConfiguratorSchema.heightMin, activeConfiguratorSchema.heightMax);
  const heightMax = Math.max(activeConfiguratorSchema.heightMin, activeConfiguratorSchema.heightMax);
  const widthInches = Array.from({ length: Math.max(1, widthMax - widthMin + 1) }, (_, i) => String(i + widthMin));
  const heightInches = Array.from({ length: Math.max(1, heightMax - heightMin + 1) }, (_, i) => String(i + heightMin));
  const mountOptions = activeConfiguratorSchema.mountOptions;
  const colorOptions = activeConfiguratorSchema.colorOptions;
  const liftOptions = activeConfiguratorSchema.liftOptions;
  const headrailOptions = activeConfiguratorSchema.headrailOptions;
  const visibleSections = activeConfiguratorSchema.visibleSections || DEFAULT_CONFIGURATOR_SCHEMA.visibleSections;
  const showMountSection = visibleSections.mountOptions !== false && mountOptions.length > 0;
  const showColorSection = visibleSections.colorOptions !== false && colorOptions.length > 0;
  const showLiftSection = visibleSections.liftOptions !== false && liftOptions.length > 0;
  const selectedColor = showColorSection ? colorOptions.find((option) => option.key === config.color) || null : null;
  const selectedColorSwatch = selectedColor?.swatchColor || "";
  const paintPairing = activeConfiguratorSchema.paintPairing;
  const showPaintPairing = showColorSection && paintPairing?.enabled;
  const selectedPaint = showPaintPairing ? paintPairing.paints.find((paint) => paint.key === config.paint) || null : null;
  const findColor = (key) => colorOptions.find((option) => option.key === key);
  const recommendedColors = selectedPaint
    ? [
        ...selectedPaint.blend.map((key) => ({ option: findColor(key), role: "Tone-on-Tone" })),
        ...selectedPaint.accent.map((key) => ({ option: findColor(key), role: "Accent" }))
      ].filter((item) => item.option)
    : [];
  // Fabric choices depend on the paint, so clear a fabric that isn't recommended for the new paint.
  const selectPaint = (paint) => setConfig((current) => {
    const allowed = paint ? [...paint.blend, ...paint.accent] : [];
    return { ...current, paint: paint ? paint.key : "", color: allowed.includes(current.color) ? current.color : "" };
  });
  const renderColorSwatch = (option, role = "") => {
    const active = config.color === option.key;
    return (
      <button
        key={`${role}-${option.key}`}
        type="button"
        role="radio"
        aria-checked={active}
        aria-label={role ? `${option.title} (${role})` : option.title}
        title={option.title}
        className={active ? "hdc-color-swatch active" : "hdc-color-swatch"}
        onClick={() => updateConfig("color", option.key)}
      >
        <span className="hdc-color-chip" style={{ background: option.swatchColor || "#f4f4f4" }}>
          {option.swatchImageUrl ? <img src={imgSrc(option.swatchImageUrl)} alt="" /> : null}
          {role ? <span className={`hdc-color-role ${role === "Accent" ? "is-accent" : ""}`}>{role}</span> : null}
        </span>
        <span className="hdc-color-name">{option.title}{option.adds ? <em className="hdc-color-addon">{option.adds}</em> : null}</span>
      </button>
    );
  };
  const showHeadrailSection = visibleSections.headrailOptions !== false && headrailOptions.length > 0;
  const visibleCustomSections = (activeConfiguratorSchema.customSections || []).filter((section) => section.visible !== false && Array.isArray(section.options) && section.options.length && (!section.showWhen || ruleMatches(section.showWhen, config)));

  const productTitle = product.pdpTitle || product.detailTitle || product.name || "Custom Window Treatment";
  const brand = product.brand || "Levolor";
  const baseSalePrice = Number(product.price || product.pdpPrice || product.detailPrice || product.configuredPrice || 102.60);
  const baseOriginalPrice = Number(product.was || product.pdpWas || product.detailWas || product.configuredWas || (baseSalePrice / 0.6));
  // A color's Add-on Price (e.g. "+$17.86") raises the sale and original price; savings % stays the same.
  const colorUpcharge = selectedColor ? Math.max(0, toPriceNumber(String(selectedColor.adds || "").replace(/[^0-9.]/g, ""), 0)) : 0;
  // Selected mount, lift, headrail, and custom-section add-ons ("Adds $43.01") raise the price the same way.
  const pickAdds = (options, key) => parseAddOnPrice(options.find((option) => option.key === key)?.adds);
  const optionUpcharge = (showMountSection ? pickAdds(mountOptions, config.mount) : 0)
    + (showLiftSection ? pickAdds(liftOptions, config.lift) : 0)
    + (showHeadrailSection ? pickAdds(headrailOptions, config.headrail) : 0)
    + visibleCustomSections.reduce((sum, section) => sum + pickAdds(section.options, config[`custom_${section.id}`]), 0);
  const totalUpcharge = colorUpcharge + optionUpcharge;
  const colorPriceRatio = baseSalePrice > 0 ? (baseSalePrice + totalUpcharge) / baseSalePrice : 1;
  const salePrice = baseSalePrice + totalUpcharge;
  const originalPrice = baseOriginalPrice * colorPriceRatio;
  const savingsPct = originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
  const [originalDollars, originalCents] = money(originalPrice);
  const [saleDollars, saleCents] = money(salePrice);
  const quantity = Math.max(1, Number(config.quantity) || 1);
  const totalSale = salePrice * quantity;
  const [totalDollars, totalCents] = money(totalSale);
  const sizeDisabled = false;

  const SelectBox = ({ label, value, onChange, options, disabled = false }) => (
    <label className="hdc-select-box">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );

  const MiniBlindArt = ({ variant = "inside" }) => (
    <div className={`hdc-mini-art ${variant}`} aria-hidden="true">
      <div className="hdc-mini-window">
        {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
      </div>
      <i />
    </div>
  );

  const OptionCard = ({ option, selected, onSelect, media, compact = false, disabled = false }) => (
    <button type="button" className={`hdc-option-card${selected ? " selected" : ""}${disabled ? " is-disabled" : ""}`} onClick={onSelect} disabled={disabled} aria-disabled={disabled}>
      <span className="hdc-radio" />
      {media ? <div className="hdc-option-media">{media}</div> : null}
      <div className="hdc-option-copy">
        <div className="hdc-option-title-row">
          <strong>{option.title}</strong>
          {(option.price || option.adds) ? <span className="hdc-option-price">{option.price ? <b>{option.price}</b> : null}{option.adds ? <em>{option.adds}</em> : null}</span> : null}
        </div>
        {option.description ? <p>{option.description}</p> : compact ? <p>Select this headrail configuration for your shade.</p> : null}
        {option.note ? <small>{option.note}</small> : null}
      </div>
    </button>
  );

  return (
    <div className="hdc-page">
      <nav className="hdc-breadcrumb pdp-shot-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="pdp-shot-back-button hdc-back-product-button" onClick={onReturnToPdp}><ArrowLeft size={14} /> Back to Product</button><span>/</span>
        <button type="button" onClick={onBack}>Home</button><span>/</span>
        <button type="button" onClick={onBack}>Window Treatments</button><span>/</span>
        <button type="button" onClick={onBack}>Window Shades</button><span>/</span>
        <span>{product.category || "Cellular Shades"}</span>
      </nav>

      <div className="hdc-layout">
        <main className="hdc-left">
          <div className="hdc-title-block">
            <h1>Configure Your Window Treatment</h1>
            <div className="hdc-fit"><span>≋</span> Guaranteed to Fit</div>
          </div>

          <section className="hdc-section">
            <h2>Window Name</h2>
            <label className="hdc-window-name">
              <span>Name Your Window<em>(Optional)</em></span>
              <input maxLength={10} value={config.windowName} onChange={(e) => updateConfig("windowName", e.target.value)} placeholder="e.g. Living Rm" />
              <small>10 Character Limit. Special characters (except for ". / ? -") are not allowed.</small>
            </label>
          </section>

          {showMountSection ? (
          <section className="hdc-section">
            <h2>Mount</h2>
            <div className="hdc-option-stack">
              {mountOptions.map((option, index) => (
                <OptionCard
                  key={option.key}
                  option={option}
                  selected={config.mount === option.key}
                  onSelect={() => updateConfig("mount", option.key)}
                  media={<MiniBlindArt variant={(() => { const label = `${option.key} ${option.title}`.toLowerCase(); return label.includes("outside") ? "outside" : label.includes("drill") ? "nodrill" : label.includes("side mount") ? "side" : "inside"; })()} />}
                />
              ))}
            </div>
          </section>
          ) : null}

          <section className="hdc-section hdc-size-section">
            <h2>Enter Size <span>Inches</span></h2>
            {showMountSection && !config.mount ? <div className="hdc-alert"><span>▣</span> Please select a Mount Type before entering measurements</div> : null}
            <div className="hdc-measure-group">
              <h3>Width <em>↔</em></h3>
              <div className="hdc-measure-selects">
                <SelectBox label="Inches" value={config.width} onChange={(value) => updateConfig("width", value)} options={widthInches} disabled={sizeDisabled} />
                <SelectBox label="Eighths" value={config.widthFraction} onChange={(value) => updateConfig("widthFraction", value)} options={eighths} disabled={sizeDisabled} />
              </div>
            </div>
            <div className="hdc-measure-group">
              <h3>Height <em>↕</em></h3>
              <div className="hdc-measure-selects">
                <SelectBox label="Inches" value={config.height} onChange={(value) => updateConfig("height", value)} options={heightInches} disabled={sizeDisabled} />
                <SelectBox label="Eighths" value={config.heightFraction} onChange={(value) => updateConfig("heightFraction", value)} options={eighths} disabled={sizeDisabled} />
              </div>
            </div>
          </section>

          {showColorSection ? (
          <section className="hdc-section hdc-color-section">
            <h2>Color</h2>
            {showPaintPairing ? (
              <div className="hdc-paint-pairing">
                <div className="hdc-paint-step">
                  <h3 className="hdc-color-group-title"><span className="hdc-step-num">1</span>{paintPairing.title}</h3>
                  {paintPairing.subtitle ? <p className="hdc-paint-subtitle">{paintPairing.subtitle}</p> : null}
                  <div className="hdc-paint-chips" role="radiogroup" aria-label={`${paintPairing.brand} paint color`}>
                    {paintPairing.paints.map((paint) => {
                      const active = config.paint === paint.key;
                      return (
                        <button
                          key={paint.key}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={active ? "hdc-paint-chip active" : "hdc-paint-chip"}
                          onClick={() => selectPaint(active ? null : paint)}
                        >
                          <span className="hdc-paint-chip-color" style={{ background: paint.hex || "#eee" }} />
                          <span className="hdc-paint-chip-label">
                            <span className="hdc-paint-chip-name">{paint.name}</span>
                            {paint.code ? <span className="hdc-paint-chip-code">{paint.code}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="hdc-paint-step">
                  <h3 className="hdc-color-group-title"><span className="hdc-step-num">2</span>{`Choose Your ${brand} Color`}</h3>
                  {selectedPaint ? (
                    <>
                      <p className="hdc-paint-subtitle">Tone-on-Tone colors blend softly with your walls. Accent colors add contrast.</p>
                      <div className="hdc-color-swatches" role="radiogroup" aria-label="Recommended colors">
                        {recommendedColors.map(({ option, role }) => renderColorSwatch(option, role))}
                      </div>
                    </>
                  ) : (
                    <p className="hdc-paint-subtitle">Select a paint color above to see recommended colors.</p>
                  )}
                </div>
              </div>
            ) : null}
            {!showPaintPairing ? (
              <>
                {activeConfiguratorSchema.colorGroupTitle ? <h3 className="hdc-color-group-title">{activeConfiguratorSchema.colorGroupTitle}</h3> : null}
                <div className="hdc-color-swatches" role="radiogroup" aria-label="Color">
                  {colorOptions.map((option) => renderColorSwatch(option))}
                </div>
              </>
            ) : null}
            {selectedColor?.description ? <p className="hdc-color-description">{selectedColor.description}</p> : null}
          </section>
          ) : null}

          {showLiftSection ? (
          <section className="hdc-section">
            <h2>Lift</h2>
            <div className="hdc-option-stack no-media">
              {liftOptions.map((option) => (
                <OptionCard key={option.key} option={option} selected={config.lift === option.key} onSelect={() => updateConfig("lift", option.key)} />
              ))}
            </div>
          </section>
          ) : null}

          {showHeadrailSection ? (
          <section className="hdc-section">
            <h2>Headrail</h2>
            <div className="hdc-option-stack no-media compact">
              {headrailOptions.map((option) => (
                <OptionCard key={option.key} option={option} selected={config.headrail === option.key} onSelect={() => updateConfig("headrail", option.key)} compact />
              ))}
            </div>
          </section>
          ) : null}

          {visibleCustomSections.map((section) => {
            const fieldKey = `custom_${section.id}`;
            return (
              <section key={section.id} className="hdc-section">
                <h2>{section.title}</h2>
                {section.description ? <p className="hdc-custom-section-description">{section.description}</p> : null}
                <div className="hdc-option-stack no-media compact">
                  {section.options.map((option) => {
                    const disabled = Boolean(option.disabledWhen && ruleMatches(option.disabledWhen, config));
                    const selected = config[fieldKey] === option.key;
                    return (
                      <OptionCard
                        key={option.key}
                        option={option}
                        selected={selected}
                        disabled={disabled}
                        onSelect={() => updateConfig(fieldKey, selected && section.optional ? "" : option.key)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>

        <aside className="hdc-right">
          <section className="hdc-review-card">
            <h2>Review Your Selections</h2>
            <div className="hdc-review-rows">
              <div><span>Guaranteed to Fit!:</span><b>Yes</b></div>
              <div><span>Window Name:</span><b>{config.windowName || ""}</b></div>
              {showMountSection ? <div><span>Mount:</span><b>{config.mount}</b></div> : null}
              <div><span>Width:</span><b>{config.width} {config.widthFraction}</b></div>
              <div><span>Height:</span><b>{config.height} {config.heightFraction}</b></div>
              {showColorSection ? <div><span>Color:</span><b>{selectedColor?.title || ""}</b></div> : null}
              {selectedPaint ? <div><span>Paint Pairing:</span><b>{paintPairing.brand} {selectedPaint.name} {selectedPaint.code}</b></div> : null}
              {showLiftSection ? <div><span>Lift:</span><b>{config.lift}</b></div> : null}
              {showHeadrailSection ? <div><span>Headrail:</span><b>{config.headrail}</b></div> : null}
              {visibleCustomSections.map((section) => <div key={`review-${section.id}`}><span>{section.reviewTitle || section.title}:</span><b>{config[`custom_${section.id}`] || ""}</b></div>)}
            </div>
            <div className="hdc-review-ship"><span>Shipping:</span><strong>FREE</strong></div>
            <label className="hdc-qty"><span>Quantity:</span><input type="number" min="1" value={config.quantity} onChange={(e) => updateConfig("quantity", e.target.value)} /></label>
            <div className="hdc-total">
              <span>Total Price:</span>
              <s>${originalPrice.toFixed(2)}</s>
              <b>{savingsPct ? `Save ${savingsPct}%` : ""}</b>
              <div><span>$</span><strong>{totalDollars}</strong><sup>{totalCents}</sup></div>
            </div>
            <button type="button" className="hdc-add-cart">Add To Cart</button>
            <button type="button" className="hdc-save-product">Save this Product</button>
          </section>

          <section className="hdc-preview-card">
            <div className="hdc-preview-summary">
              <h3>{productTitle}</h3>
              <p>Brand: <a href="#0">{brand}</a></p>
              <p>Shown in: {selectedColor ? <b>{selectedColor.title}</b> : "Select a Color to Preview"}</p>
              {selectedPaint ? <p>Paired with: <b>{paintPairing.brand} {selectedPaint.name} {selectedPaint.code}</b></p> : null}
              <p>Estimated Delivery Date: <b>May 18</b></p>
              <p>Based on your selections</p>
              <div className="hdc-side-price"><s>${originalDollars}.{originalCents}</s><b>{savingsPct ? `Save ${savingsPct}%` : ""}</b><strong>${saleDollars}.{saleCents}</strong><small>Price Includes Options</small></div>
            </div>
            <EnhancedProductPreview
              isRoller={String(product?.category || "").toLowerCase().includes("roller")}
              colorSwatch={selectedColorSwatch}
              colorName={selectedColor?.title || ""}
              wallPaint={selectedPaint?.hex || ""}
              reverseRoll={config["custom_fabric-roll-direction"] === "Reverse Roll"}
              mount={config.mount}
              width={sizeToInches(config.width, config.widthFraction)}
              height={sizeToInches(config.height, config.heightFraction)}
              lift={config.lift}
              controlSide={config["custom_control-side"]}
              chainType={config["custom_chain-type"]}
              topTreatment={config["custom_top-treatment"]}
              lightGuard={Boolean(config["custom_light-guard"])}
            />
            <div className="hdc-phone">Need help? <strong>800-921-2119</strong></div>
          </section>
        </aside>
      </div>
    </div>
  );
}


function sizeToInches(whole, fraction) {
  const base = parseFloat(whole) || 0;
  const [num, den] = String(fraction || "0/0").split("/").map(Number);
  return base + (den ? num / den : 0);
}

function liftStyle(lift) {
  const key = String(lift || "").toLowerCase();
  if (!key) return "none";
  if (key.includes("wand")) return "wand";
  if (key.includes("motor")) return "motor";
  if (key.includes("cordless")) return "cordless";
  if (key.includes("chain") || key.includes("cord loop")) return "chain";
  return "none";
}

function topTreatmentStyle(value) {
  const key = String(value || "").toLowerCase();
  if (key.includes("curved")) return "curved";
  if (key.includes("square")) return "square";
  if (key.includes("valance")) return "valance";
  return "";
}

function PreviewScene({ isRoller, colorSwatch, wallPaint, reverseRoll, lowered, setLowered, mount, width, height, lift, controlSide, chainType, topTreatment, lightGuard, large = false }) {
  const stageRef = useRef(null);
  const assemblyRef = useRef(null);
  const dragging = useRef(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const measure = () => setStageSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Window shape follows the entered width and height (kept within readable limits).
  const ratio = width > 0 && height > 0 ? Math.min(2.4, Math.max(0.4, width / height)) : 0.78;
  const boxW = Math.max(160, (stageSize.w || 360) * (large ? 0.78 : 0.72) - 40);
  const boxH = Math.max(160, (stageSize.h || 470) - (large ? 110 : 100));
  const winW = Math.round(ratio > boxW / boxH ? boxW : boxH * ratio);
  const winH = Math.round(ratio > boxW / boxH ? boxW / ratio : boxH);

  const setFromPointer = (event) => {
    const rect = assemblyRef.current?.getBoundingClientRect();
    if (!rect) return;
    setLowered(Math.min(1, Math.max(0.08, (event.clientY - rect.top) / rect.height)));
  };
  const onPointerDown = (event) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setFromPointer(event);
  };
  const onPointerMove = (event) => { if (dragging.current) setFromPointer(event); };
  const onPointerUp = () => { dragging.current = false; };
  const onKeyDown = (event) => {
    if (event.key === "ArrowUp") { event.preventDefault(); setLowered((v) => Math.max(0.08, v - 0.1)); }
    if (event.key === "ArrowDown") { event.preventDefault(); setLowered((v) => Math.min(1, v + 0.1)); }
  };

  const fabric = colorSwatch || "#e7e7e2";
  const pleatCount = Math.max(3, Math.round(lowered * (winH / 17)));
  const isOutside = mount === "Outside Mount";
  const control = liftStyle(lift);
  const side = controlSide === "Left" ? "left" : "right";
  const top = topTreatmentStyle(topTreatment);
  const steel = String(chainType || "").toLowerCase().includes("steel");
  const mountClass = isOutside ? "is-outside" : "is-inside";

  return (
    <div ref={stageRef} className={`hdc-preview-stage${large ? " is-large" : ""}${wallPaint ? " has-wall-paint" : ""}`} style={wallPaint ? { "--hdc-wall-paint": wallPaint } : undefined}>
      <div
        ref={assemblyRef}
        className={`hdc-window-assembly ${mountClass}`}
        style={{ width: winW, height: winH, "--hdc-fabric": fabric }}
        role="slider"
        tabIndex={0}
        aria-label="Drag up or down to raise or lower the shade"
        aria-valuemin={8}
        aria-valuemax={100}
        aria-valuenow={Math.round(lowered * 100)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="hdc-window-large">
          <div className="hdc-outdoor-view"><i /><i /></div>
        </div>
        <div className={`hdc-shade-zone ${mountClass}`}>
          {lightGuard ? <><span className="hdc-light-guard is-left" /><span className="hdc-light-guard is-right" /></> : null}
          {isRoller ? (
            <>
              <div className={`hdc-roller-tube${reverseRoll ? " is-reverse" : ""}`} />
              <div className={`hdc-shade-large is-roller${reverseRoll ? " is-reverse" : ""}`} style={{ height: `calc(${lowered * 100}% - 8px)` }}>
                <span className="hdc-hem-bar">{control === "cordless" ? <i className="hdc-pull-handle" /> : null}</span>
              </div>
            </>
          ) : (
            <>
              <div className="hdc-headrail" />
              <div className="hdc-shade-large is-cellular" style={{ height: `calc(${lowered * 100}% - 10px)` }}>
                {Array.from({ length: pleatCount }).map((_, index) => <span key={index} />)}
                {control === "cordless" ? <i className="hdc-pull-handle is-cellular" /> : null}
              </div>
            </>
          )}
          {top ? <div className={`hdc-top-treatment is-${top}`} /> : null}
          {control === "chain" ? <div className={`hdc-chain is-${side}${steel ? " is-steel" : ""}`} /> : null}
          {control === "wand" ? <div className={`hdc-wand is-${side}`} /> : null}
        </div>
        {control === "motor" ? <div className={`hdc-motor-badge is-${side}`} aria-hidden="true">Motorized</div> : null}
        <div className="hdc-drag-text" aria-hidden="true"><span>&#8597;</span> Drag Image</div>
      </div>
      {width > 0 && height > 0 ? <div className="hdc-size-tag" aria-hidden="true">{+width.toFixed(3)}" W &times; {+height.toFixed(3)}" H</div> : null}
    </div>
  );
}

function EnhancedProductPreview({ colorName, ...options }) {
  const [lowered, setLowered] = useState(0.7);
  const [zoomed, setZoomed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sceneProps = { ...options, lowered, setLowered };
  return (
    <>
      <div className="hdc-preview-title"><span>New</span> Enhanced Product Preview</div>
      {collapsed ? null : (
        <div className="hdc-preview-frame">
          <button type="button" className="hdc-zoom" onClick={() => setZoomed(true)}>Zoom In</button>
          <PreviewScene {...sceneProps} />
        </div>
      )}
      {collapsed ? null : <p className="hdc-preview-note">Image for preview purposes only. Some options will not appear but will be made according to your selections.</p>}
      <button type="button" className="hdc-show-preview" aria-expanded={!collapsed} onClick={() => setCollapsed((v) => !v)}>
        {collapsed ? "Show Preview" : "Hide Preview"}
      </button>
      {zoomed ? <PreviewZoom onClose={() => setZoomed(false)} colorName={colorName} sceneProps={sceneProps} /> : null}
    </>
  );
}

function PreviewZoom({ onClose, colorName, sceneProps }) {
  useModalBehavior(onClose, ".hdc-zoom-panel");
  return createPortal(
    <div className="hdc-zoom-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="hdc-zoom-panel" role="dialog" aria-modal="true" aria-label="Enlarged product preview">
        <div className="hdc-zoom-head">
          <strong>{colorName ? `Shown in ${colorName}` : "Product Preview"}</strong>
          <button type="button" className="hdc-zoom-close" onClick={onClose} aria-label="Close enlarged preview">&times;</button>
        </div>
        <PreviewScene {...sceneProps} large />
        <p className="hdc-preview-note">Drag the image up or down to raise or lower the shade.</p>
      </div>
    </div>,
    document.body
  );
}

function ConfiguratorSettingsEditor({ schema, setSchema, product = null, isEdited = false }) {
  const safeSchema = mergeConfiguratorSchema(schema);
  const [draggingOption, setDraggingOption] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [openConfigSections, setOpenConfigSections] = useState({});
  const [openOptionRows, setOpenOptionRows] = useState({});
  const [openResetMenu, setOpenResetMenu] = useState("");
  useEffect(() => {
    if (!openResetMenu) return undefined;
    const closeOnOutside = (event) => { if (!event.target.closest?.(".config-reset-menu-wrap")) setOpenResetMenu(""); };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpenResetMenu(""); };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [openResetMenu]);
  const productId = product?.id || "configurator";
  const builtInOptionGroups = [
    { key: "mountOptions", title: "Mount Options", description: "Add, remove, reorder, or rewrite the mount choices shown at the top of the configurator." },
    { key: "colorOptions", title: "Color Options", description: "Manage the color swatches shoppers can pick. Each color can use a hex color or a swatch image." },
    { key: "liftOptions", title: "Lift Options", description: "Control the lift choices available after size entry." },
    { key: "headrailOptions", title: "Headrail Options", description: "Manage the headrail configurations available near the bottom of the configurator." }
  ];
  const customOptionGroups = (safeSchema.customSections || []).map((section) => ({
    key: `custom:${section.id}`,
    customId: section.id,
    custom: true,
    title: section.title || "Custom Section",
    description: section.description || "Custom configurator options."
  }));
  const optionGroups = [...builtInOptionGroups, ...customOptionGroups];

  const isCustomGroupKey = (groupKey) => String(groupKey || "").startsWith("custom:");
  const getCustomIdFromGroupKey = (groupKey) => String(groupKey || "").replace(/^custom:/, "");
  const getGroupOptions = (source, groupKey) => {
    const base = mergeConfiguratorSchema(source);
    if (isCustomGroupKey(groupKey)) {
      const customId = getCustomIdFromGroupKey(groupKey);
      return base.customSections.find((section) => section.id === customId)?.options || [];
    }
    return base[groupKey] || [];
  };
  const setGroupOptions = (source, groupKey, options) => {
    const base = mergeConfiguratorSchema(source);
    if (isCustomGroupKey(groupKey)) {
      const customId = getCustomIdFromGroupKey(groupKey);
      return mergeConfiguratorSchema({
        ...base,
        customSections: base.customSections.map((section) => section.id === customId ? { ...section, options } : section)
      });
    }
    return mergeConfiguratorSchema({ ...base, [groupKey]: options });
  };

  const makeUniqueOptionKey = (baseKey, options) => {
    const used = new Set(options.map((item) => String(item.key || "").trim().toLowerCase()).filter(Boolean));
    let cleanBase = String(baseKey || "New Option").trim() || "New Option";
    let candidate = cleanBase;
    let counter = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${cleanBase} ${counter}`;
      counter += 1;
    }
    return candidate;
  };

  const makeUniqueSectionId = (title, sections) => {
    const used = new Set(sections.map((section) => String(section.id || "").toLowerCase()));
    const base = String(title || "Custom Section").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom-section";
    let candidate = base;
    let counter = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    return candidate;
  };

  const updateSchemaField = (field, value) => {
    setSchema((current) => mergeConfiguratorSchema({ ...current, [field]: value }));
  };

  const updatePaintPairing = (changes) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      return mergeConfiguratorSchema({ ...base, paintPairing: { ...base.paintPairing, ...changes } });
    });
  };

  const updatePaint = (index, field, value) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const paints = base.paintPairing.paints.map((paint, i) => (i === index ? { ...paint, [field]: value } : paint));
      return mergeConfiguratorSchema({ ...base, paintPairing: { ...base.paintPairing, paints } });
    });
  };

  const updateOption = (groupKey, index, field, value) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const options = [...getGroupOptions(base, groupKey)];
      const nextOption = { ...options[index], [field]: value };
      if (field === "title" && (!nextOption.key || nextOption.key === options[index].title)) nextOption.key = value;
      options[index] = nextOption;
      return setGroupOptions(base, groupKey, options);
    });
  };

  const addOption = (groupKey) => {
    const nextIndex = getGroupOptions(safeSchema, groupKey).length;
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const options = [...getGroupOptions(base, groupKey)];
      const nextTitle = makeUniqueOptionKey("New Option", options);
      options.push(groupKey === "colorOptions"
        ? { key: nextTitle, title: nextTitle, price: "", adds: "", description: "", note: "", swatchColor: "#cccccc", swatchImageUrl: "" }
        : { key: nextTitle, title: nextTitle, price: "", adds: "", description: "Describe this configurator option.", note: "" });
      return setGroupOptions(base, groupKey, options);
    });
    setOpenConfigSections((prev) => ({ ...prev, [groupKey]: true }));
    setOpenOptionRows((prev) => ({ ...prev, [`${groupKey}-${nextIndex}`]: true }));
  };

  const duplicateOption = (groupKey, index) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const options = [...getGroupOptions(base, groupKey)];
      const source = options[index] || { title: "Option", key: "Option", description: "", note: "", price: "", adds: "" };
      const copyTitle = makeUniqueOptionKey(`${source.title || "Option"} Copy`, options);
      const copy = {
        ...source,
        title: copyTitle,
        key: makeUniqueOptionKey(`${source.key || source.title || "Option"} Copy`, options)
      };
      options.splice(index + 1, 0, copy);
      return setGroupOptions(base, groupKey, options);
    });
    setOpenConfigSections((prev) => ({ ...prev, [groupKey]: true }));
    setOpenOptionRows((prev) => ({ ...prev, [`${groupKey}-${index + 1}`]: true }));
  };

  const removeOption = (groupKey, index) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const currentOptions = getGroupOptions(base, groupKey);
      const options = currentOptions.filter((_, i) => i !== index);
      return setGroupOptions(base, groupKey, options.length ? options : currentOptions);
    });
  };

  const moveOption = (groupKey, index, direction) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const options = [...getGroupOptions(base, groupKey)];
      const target = index + direction;
      if (target < 0 || target >= options.length) return base;
      const [moved] = options.splice(index, 1);
      options.splice(target, 0, moved);
      return setGroupOptions(base, groupKey, options);
    });
  };

  const moveOptionTo = (groupKey, fromIndex, targetIndex, position = "before") => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const options = [...getGroupOptions(base, groupKey)];
      if (fromIndex < 0 || fromIndex >= options.length || targetIndex < 0 || targetIndex >= options.length || fromIndex === targetIndex) return base;
      const [moved] = options.splice(fromIndex, 1);
      let insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
      if (fromIndex < insertIndex) insertIndex -= 1;
      insertIndex = Math.max(0, Math.min(insertIndex, options.length));
      options.splice(insertIndex, 0, moved);
      return setGroupOptions(base, groupKey, options);
    });
  };

  const updateCustomSection = (sectionId, field, value) => {
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      return mergeConfiguratorSchema({
        ...base,
        customSections: base.customSections.map((section) => section.id === sectionId ? { ...section, [field]: value } : section)
      });
    });
  };

  const addCustomSection = () => {
    let newGroupKey = "";
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      const title = `Custom Section ${base.customSections.length + 1}`;
      const id = makeUniqueSectionId(title, base.customSections);
      newGroupKey = `custom:${id}`;
      return mergeConfiguratorSchema({
        ...base,
        customSections: [
          ...base.customSections,
          {
            id,
            key: id,
            title,
            description: "Custom configurator options.",
            visible: true,
            options: [{ key: "Option 1", title: "Option 1", price: "", adds: "", description: "Describe this option.", note: "" }]
          }
        ]
      });
    });
    if (newGroupKey) {
      setOpenConfigSections((prev) => ({ ...prev, sections: true, [newGroupKey]: true }));
      setOpenOptionRows((prev) => ({ ...prev, [`${newGroupKey}-0`]: true }));
    }
  };

  const removeCustomSection = (sectionId) => {
    const section = safeSchema.customSections.find((item) => item.id === sectionId);
    if (typeof window !== "undefined" && !window.confirm(`Remove ${section?.title || "this custom section"}? This cannot be undone.`)) return;
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      return mergeConfiguratorSchema({ ...base, customSections: base.customSections.filter((item) => item.id !== sectionId) });
    });
    setOpenResetMenu("");
  };

  const resetSection = (groupKey) => {
    if (isCustomGroupKey(groupKey)) return;
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      if (groupKey === "size") {
        return mergeConfiguratorSchema({
          ...base,
          widthMin: DEFAULT_CONFIGURATOR_SCHEMA.widthMin,
          widthMax: DEFAULT_CONFIGURATOR_SCHEMA.widthMax,
          heightMin: DEFAULT_CONFIGURATOR_SCHEMA.heightMin,
          heightMax: DEFAULT_CONFIGURATOR_SCHEMA.heightMax,
          eighths: DEFAULT_CONFIGURATOR_SCHEMA.eighths
        });
      }
      if (groupKey === "colorOptions") return mergeConfiguratorSchema({ ...base, colorOptions: DEFAULT_CONFIGURATOR_SCHEMA.colorOptions, colorGroupTitle: DEFAULT_CONFIGURATOR_SCHEMA.colorGroupTitle });
      return mergeConfiguratorSchema({ ...base, [groupKey]: DEFAULT_CONFIGURATOR_SCHEMA[groupKey] });
    });
  };

  const handleResetFromMenu = (groupKey) => {
    resetSection(groupKey);
    setOpenResetMenu("");
  };

  const handleOptionDragStart = (event, groupKey, index) => {
    const payload = { groupKey, index };
    setDraggingOption(payload);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };

  const handleOptionDragOver = (event, groupKey, index) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget({ groupKey, index, position });
  };

  const handleOptionDrop = (event, groupKey, index) => {
    event.preventDefault();
    let payload = draggingOption;
    try {
      const raw = event.dataTransfer.getData("text/plain");
      if (raw) payload = JSON.parse(raw);
    } catch (error) {
      payload = draggingOption;
    }
    if (payload && payload.groupKey === groupKey) {
      const position = dropTarget?.groupKey === groupKey && dropTarget?.index === index ? dropTarget.position : "before";
      moveOptionTo(groupKey, Number(payload.index), index, position);
    }
    setDraggingOption(null);
    setDropTarget(null);
  };

  const handleOptionDragEnd = () => {
    setDraggingOption(null);
    setDropTarget(null);
  };

  const duplicateKeysFor = (items) => {
    const seen = new Set();
    const duplicates = new Set();
    items.forEach((item) => {
      const key = String(item.key || "").trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    });
    return duplicates;
  };

  const validationWarnings = [];
  if (Number(safeSchema.widthMin) > Number(safeSchema.widthMax)) validationWarnings.push("Width minimum is greater than width maximum.");
  if (Number(safeSchema.heightMin) > Number(safeSchema.heightMax)) validationWarnings.push("Height minimum is greater than height maximum.");
  if (!safeSchema.eighths.length) validationWarnings.push("At least one fraction option is required.");
  optionGroups.forEach((group) => {
    const options = getGroupOptions(safeSchema, group.key);
    const duplicateKeys = duplicateKeysFor(options);
    if (!options.length) validationWarnings.push(`${group.title} needs at least one option.`);
    options.forEach((option, index) => {
      if (!String(option.title || "").trim()) validationWarnings.push(`${group.title} option ${index + 1} is missing a title.`);
      if (!String(option.key || "").trim()) validationWarnings.push(`${group.title} option ${index + 1} is missing a key.`);
      if (duplicateKeys.has(String(option.key || "").trim().toLowerCase())) validationWarnings.push(`${group.title} has a duplicate key: ${option.key}.`);
    });
  });

  const getSizeWarnings = () => validationWarnings.filter((warning) => warning.includes("Width") || warning.includes("Height") || warning.includes("fraction"));
  const getGroupWarnings = (group) => validationWarnings.filter((warning) => warning.startsWith(group.title) || warning.includes(`${group.title} `));
  const isConfigSectionOpen = (sectionId, warnings = []) => {
    if (warnings.length) return true;
    if (typeof openConfigSections[sectionId] === "boolean") return openConfigSections[sectionId];
    return false;
  };
  const toggleConfigSection = (sectionId) => {
    setOpenConfigSections((prev) => {
      const current = typeof prev[sectionId] === "boolean" ? prev[sectionId] : false;
      return { ...prev, [sectionId]: !current };
    });
  };
  const isConfiguratorSectionVisible = (sectionId) => {
    if (sectionId === "size") return true;
    if (isCustomGroupKey(sectionId)) {
      const customId = getCustomIdFromGroupKey(sectionId);
      return safeSchema.customSections.find((section) => section.id === customId)?.visible !== false;
    }
    return safeSchema.visibleSections?.[sectionId] !== false;
  };
  const setConfiguratorSectionVisible = (sectionId, visible) => {
    if (sectionId === "size") return;
    setSchema((current) => {
      const base = mergeConfiguratorSchema(current);
      if (isCustomGroupKey(sectionId)) {
        const customId = getCustomIdFromGroupKey(sectionId);
        return mergeConfiguratorSchema({
          ...base,
          customSections: base.customSections.map((section) => section.id === customId ? { ...section, visible: Boolean(visible) } : section)
        });
      }
      return mergeConfiguratorSchema({
        ...base,
        visibleSections: { ...base.visibleSections, [sectionId]: Boolean(visible) }
      });
    });
    if (visible) setOpenConfigSections((prev) => ({ ...prev, [sectionId]: true }));
  };
  const toggleConfiguratorSectionVisible = (sectionId) => setConfiguratorSectionVisible(sectionId, !isConfiguratorSectionVisible(sectionId));
  const optionRowKey = (groupKey, index) => `${groupKey}-${index}`;
  const isOptionRowOpen = (groupKey, index, option, warnings = []) => {
    if (warnings.some((warning) => warning.includes(`option ${index + 1}`) || warning.includes(String(option.key || "")))) return true;
    return Boolean(openOptionRows[optionRowKey(groupKey, index)]);
  };
  const toggleOptionRow = (groupKey, index) => {
    const key = optionRowKey(groupKey, index);
    setOpenOptionRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const sizeStatus = getSizeWarnings().length ? "Needs review" : `${Math.min(safeSchema.widthMin, safeSchema.widthMax)}-${Math.max(safeSchema.widthMin, safeSchema.widthMax)} in.`;
  const visibleBuiltInSectionCount = builtInOptionGroups.filter((group) => isConfiguratorSectionVisible(group.key)).length;
  const visibleCustomSectionCount = safeSchema.customSections.filter((section) => section.visible !== false).length;
  const visibleSectionCount = 1 + visibleBuiltInSectionCount + visibleCustomSectionCount;
  const renderSectionMenu = (sectionId, resetLabel, visibilityLabel = "", removeLabel = "") => (
    <div className="config-reset-menu-wrap">
      <button type="button" className="config-more-button" onClick={() => setOpenResetMenu((current) => current === sectionId ? "" : sectionId)} aria-label={`More actions for ${resetLabel || visibilityLabel || removeLabel}`} aria-expanded={openResetMenu === sectionId}><MoreHorizontal size={17} /></button>
      {openResetMenu === sectionId ? (
        <div className="config-reset-menu">
          {visibilityLabel ? <button type="button" className="config-visibility-menu-item" onClick={() => { toggleConfiguratorSectionVisible(sectionId); setOpenResetMenu(""); }}>{isConfiguratorSectionVisible(sectionId) ? <Eye size={14} /> : <Plus size={14} />} {visibilityLabel}</button> : null}
          {resetLabel ? <button type="button" onClick={() => handleResetFromMenu(sectionId)}><RotateCcw size={14} /> {resetLabel}</button> : null}
          {removeLabel ? <button type="button" className="config-remove-menu-item" onClick={() => removeCustomSection(getCustomIdFromGroupKey(sectionId))}><Trash2 size={14} /> {removeLabel}</button> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="config-editor editor-section-stack config-editor-accordion">
      <EditorAccordionSection
        productId={productId}
        sectionId="config-sections"
        title="Configurator Sections"
        description="Choose which sections appear in the live product configurator. Hidden sections keep their settings."
        status={`${visibleSectionCount} visible`}
        isOpen={isConfigSectionOpen("sections")}
        onToggle={() => toggleConfigSection("sections")}
        className="config-editor-card config-accordion-card config-sections-card"
      >
        <div className="config-sections-manager">
          <div className="config-section-visibility-row is-required">
            <div><strong>Size Range</strong><span>Required for custom measurements.</span></div>
            <span className="config-required-pill">Required</span>
          </div>
          {builtInOptionGroups.map((group) => {
            const visible = isConfiguratorSectionVisible(group.key);
            return (
              <div key={`visibility-${group.key}`} className={`config-section-visibility-row ${visible ? "" : "is-hidden"}`}>
                <div><strong>{group.title}</strong><span>{visible ? "Visible in the live configurator." : "Hidden from the live configurator. Settings are preserved."}</span></div>
                <button type="button" className={visible ? "config-hide-section-button" : "config-show-section-button"} onClick={() => toggleConfiguratorSectionVisible(group.key)}>{visible ? "Hide" : "Show"}</button>
              </div>
            );
          })}
          {safeSchema.customSections.map((section) => {
            const groupKey = `custom:${section.id}`;
            const visible = section.visible !== false;
            return (
              <div key={`visibility-${section.id}`} className={`config-section-visibility-row config-custom-visibility-row ${visible ? "" : "is-hidden"}`}>
                <div><strong>{section.title || "Custom Section"}</strong><span>{visible ? "Custom section visible in the live configurator." : "Custom section hidden. Settings are preserved."}</span></div>
                <div className="config-section-visibility-actions">
                  <button type="button" className={visible ? "config-hide-section-button" : "config-show-section-button"} onClick={() => toggleConfiguratorSectionVisible(groupKey)}>{visible ? "Hide" : "Show"}</button>
                  <button type="button" className="config-remove-custom-section-button" onClick={() => removeCustomSection(section.id)}><Trash2 size={13} /> Remove</button>
                </div>
              </div>
            );
          })}
          <button type="button" className="config-add-custom-section-button" onClick={addCustomSection}><Plus size={15} /> Add Custom Section</button>
        </div>
      </EditorAccordionSection>

      <EditorAccordionSection
        productId={productId}
        sectionId="config-size"
        title="Size Range"
        description="Controls the Width, Height, and fraction dropdowns."
        status={sizeStatus}
        headerActions={renderSectionMenu("size", "Reset Size Range")}
        isOpen={isConfigSectionOpen("size", getSizeWarnings())}
        onToggle={() => toggleConfigSection("size")}
        className="config-editor-card config-accordion-card"
      >
        {getSizeWarnings().length ? <div className="config-section-warning">{getSizeWarnings().map((warning, index) => <span key={`${warning}-${index}`}>{warning}</span>)}</div> : null}
        <div className="config-size-grid">
          <label>Minimum Width<input type="number" value={safeSchema.widthMin} onChange={(e) => updateSchemaField("widthMin", e.target.value)} /></label>
          <label>Maximum Width<input type="number" value={safeSchema.widthMax} onChange={(e) => updateSchemaField("widthMax", e.target.value)} /></label>
          <label>Minimum Height<input type="number" value={safeSchema.heightMin} onChange={(e) => updateSchemaField("heightMin", e.target.value)} /></label>
          <label>Maximum Height<input type="number" value={safeSchema.heightMax} onChange={(e) => updateSchemaField("heightMax", e.target.value)} /></label>
          <label className="wide">Fraction Options<textarea rows={2} value={safeSchema.eighths.join(", ")} onChange={(e) => updateSchemaField("eighths", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
        </div>
      </EditorAccordionSection>

      {optionGroups.map((group) => {
        const warnings = getGroupWarnings(group);
        const sectionVisible = isConfiguratorSectionVisible(group.key);
        const groupOptions = getGroupOptions(safeSchema, group.key);
        return (
          <EditorAccordionSection
            key={group.key}
            productId={productId}
            sectionId={`config-${group.key}`}
            title={group.title}
            description={sectionVisible ? group.description : `${group.title} is hidden from the live configurator. Settings are preserved.`}
            status={!sectionVisible ? "Hidden" : warnings.length ? "Needs review" : `${groupOptions.length} option${groupOptions.length === 1 ? "" : "s"}`}
            headerActions={renderSectionMenu(group.key, group.custom ? "" : `Reset ${group.title}`, sectionVisible ? `Hide ${group.title}` : `Show ${group.title}`, group.custom ? `Remove ${group.title}` : "")}
            isOpen={isConfigSectionOpen(group.key, warnings)}
            onToggle={() => toggleConfigSection(group.key)}
            className={`config-editor-card config-accordion-card ${sectionVisible ? "" : "config-section-hidden"} ${group.custom ? "config-custom-section-card" : ""}`}
          >
            {group.custom ? (
              <div className="config-custom-section-fields">
                <label>Section Name<input value={group.title} onChange={(e) => updateCustomSection(group.customId, "title", e.target.value)} placeholder="Section name" /></label>
                <label className="wide">Description<input value={group.description} onChange={(e) => updateCustomSection(group.customId, "description", e.target.value)} placeholder="Short helper text" /></label>
              </div>
            ) : null}
            {group.key === "colorOptions" ? (
              <div className="config-custom-section-fields">
                <label className="wide">Color Group Heading<input value={safeSchema.colorGroupTitle || ""} onChange={(e) => updateSchemaField("colorGroupTitle", e.target.value)} placeholder="e.g. Light Filtering Colors (leave blank to hide)" /></label>
                {safeSchema.paintPairing?.paints?.length ? (
                  <details className="config-option-advanced wide">
                    <summary>Paint Pairing ({safeSchema.paintPairing.paints.length} paint colors)</summary>
                    <label className="config-inline-check"><input type="checkbox" checked={safeSchema.paintPairing.enabled} onChange={(e) => updatePaintPairing({ enabled: e.target.checked })} /> Show "pick your paint" step</label>
                    <label>Step 1 Heading<input value={safeSchema.paintPairing.title} onChange={(e) => updatePaintPairing({ title: e.target.value })} /></label>
                    <label>Step 1 Description<input value={safeSchema.paintPairing.subtitle} onChange={(e) => updatePaintPairing({ subtitle: e.target.value })} /></label>
                    {safeSchema.paintPairing.paints.map((paint, index) => (
                      <fieldset key={`paint-${paint.key}-${index}`} className="config-paint-fieldset">
                        <legend><span className="config-paint-dot" style={{ background: paint.hex || "#eee" }} />{paint.name} {paint.code}</legend>
                        <label>Paint Color (hex)<input value={paint.hex} onChange={(e) => updatePaint(index, "hex", e.target.value)} /></label>
                        <label>Tone-on-Tone Colors (comma separated)<input key={`blend-${paint.blend.join("|")}`} defaultValue={paint.blend.join(", ")} onBlur={(e) => updatePaint(index, "blend", e.target.value)} /></label>
                        <label>Accent Colors (comma separated)<input key={`accent-${paint.accent.join("|")}`} defaultValue={paint.accent.join(", ")} onBlur={(e) => updatePaint(index, "accent", e.target.value)} /></label>
                      </fieldset>
                    ))}
                  </details>
                ) : null}
              </div>
            ) : null}
            <div className="config-section-toolbar">
              <button type="button" className="editor-add-link-button" onClick={() => addOption(group.key)}><Plus size={14} /> Add Option</button>
            </div>
            {warnings.length ? <div className="config-section-warning">{warnings.map((warning, warningIndex) => <span key={`${warning}-${warningIndex}`}>{warning}</span>)}</div> : null}
            <div className="config-option-list config-option-list-compact">
              {groupOptions.map((option, index) => {
                const isDragging = draggingOption?.groupKey === group.key && draggingOption?.index === index;
                const isDropTarget = dropTarget?.groupKey === group.key && dropTarget?.index === index && !isDragging;
                const dropClass = isDropTarget ? `config-option-drop-${dropTarget.position}` : "";
                const rowOpen = isOptionRowOpen(group.key, index, option, warnings);
                const addOn = String(option.adds || "").trim();
                const price = String(option.price || "").trim();
                return (
                  <div
                    key={`${group.key}-${index}`}
                    className={`config-option-editor-row config-option-accordion-row ${rowOpen ? "is-open" : ""} ${isDragging ? "config-option-dragging" : ""} ${dropClass}`}
                    onDragOver={(e) => handleOptionDragOver(e, group.key, index)}
                    onDrop={(e) => handleOptionDrop(e, group.key, index)}
                  >
                    <div className="config-option-summary-row">
                      <button
                        type="button"
                        className="config-option-drag-handle"
                        draggable
                        onDragStart={(e) => handleOptionDragStart(e, group.key, index)}
                        onDragEnd={handleOptionDragEnd}
                        aria-label={`Drag ${option.title || "option"} to reorder`}
                        title="Drag to reorder"
                      >⋮⋮</button>
                      <button type="button" className="config-option-summary-button" onClick={() => toggleOptionRow(group.key, index)} aria-expanded={rowOpen}>
                        <span><strong>{option.title || `Option ${index + 1}`}</strong><small>{addOn ? addOn : price ? `Original ${price}` : "No add-on"}</small></span>
                        <i>{String(option.key || "").trim() ? "Ready" : "Needs key"}</i>
                        <ChevronDown size={17} />
                      </button>
                    </div>

                    {rowOpen ? (
                      <div className="config-option-expanded-panel">
                        <div className="config-option-toolbar">
                          <button type="button" onClick={() => moveOption(group.key, index, -1)} disabled={index === 0}>Up</button>
                          <button type="button" onClick={() => moveOption(group.key, index, 1)} disabled={index === groupOptions.length - 1}>Down</button>
                          <button type="button" onClick={() => duplicateOption(group.key, index)}><Plus size={13} /> Duplicate</button>
                          <button type="button" className="config-remove-option" onClick={() => removeOption(group.key, index)} disabled={groupOptions.length <= 1}><Trash2 size={13} /> Remove</button>
                        </div>
                        <div className="config-option-fields">
                          <label>Title<input value={option.title || ""} onChange={(e) => updateOption(group.key, index, "title", e.target.value)} /></label>
                          <label>Original Price<input value={option.price || ""} onChange={(e) => updateOption(group.key, index, "price", e.target.value)} placeholder="Optional" /></label>
                          <label>Add-on Price<input value={option.adds || ""} onChange={(e) => updateOption(group.key, index, "adds", e.target.value)} placeholder={group.key === "colorOptions" ? "e.g. +$17.86 (added to price)" : "Optional"} /></label>
                          <label className="wide">Description<textarea rows={2} value={option.description || ""} onChange={(e) => updateOption(group.key, index, "description", e.target.value)} /></label>
                          <label className="wide">Note<textarea rows={2} value={option.note || ""} onChange={(e) => updateOption(group.key, index, "note", e.target.value)} placeholder="Optional supporting note" /></label>
                          {group.key === "colorOptions" ? (
                            <>
                              <label>Swatch Color
                                <span className="config-swatch-color-field">
                                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(option.swatchColor || "") ? option.swatchColor : "#cccccc"} onChange={(e) => updateOption(group.key, index, "swatchColor", e.target.value)} aria-label="Pick swatch color" />
                                  <input value={option.swatchColor || ""} onChange={(e) => updateOption(group.key, index, "swatchColor", e.target.value)} placeholder="#f4f4f4" />
                                </span>
                              </label>
                              <label>Swatch Image URL<input value={option.swatchImageUrl || ""} onChange={(e) => updateOption(group.key, index, "swatchImageUrl", e.target.value)} placeholder="Optional, overrides color" /></label>
                            </>
                          ) : null}
                        </div>
                        <details className="config-option-advanced">
                          <summary>Advanced</summary>
                          <label>Key<input value={option.key || ""} onChange={(e) => updateOption(group.key, index, "key", e.target.value)} /></label>
                        </details>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </EditorAccordionSection>
        );
      })}
    </div>
  );
}

// Keep keyboard focus and scrolling inside an open modal, then restore both.
function useModalBehavior(onClose, selector) {
  useEffect(() => {
    const panel = document.querySelector(selector);
    if (!panel) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...panel.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
      .filter((element) => !element.disabled && element.getClientRects().length);
    focusable()[0]?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        // Let a section menu handle the first Escape, without dismissing the editor.
        if (panel.querySelector('.config-more-button[aria-expanded="true"]')) return;
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
    // Mount/unmount owns the modal lifecycle. Callers pass inline close callbacks.
  }, []);
}

function EditorPanel({ products, displayProducts, editorMode = "grid", setProducts, onClose, saveProducts, saveStatus, reloadProducts, placeholderNonBordered, setPlaceholderNonBordered, mockupSettings, setMockupSettings, bannerPresets = [], bannerPresetStatus = "", saveBannerPreset, loadBannerPreset, deleteBannerPreset, renameBannerPreset, reloadBannerPresets }) {
  useModalBehavior(onClose, ".editor-panel");
  const [newPresetName, setNewPresetName] = useState("");
  const [uploading, setUploading] = useState("");
  const [galleryDragging, setGalleryDragging] = useState(null);
  const [galleryDropTarget, setGalleryDropTarget] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [openSections, setOpenSections] = useState({});
  const [editorSearch, setEditorSearch] = useState("");
  const [editedProductIds, setEditedProductIds] = useState(new Set());
  const markProductEdited = (id) => setEditedProductIds((prev) => new Set(prev).add(id));
  const updateProduct = (id, field, value) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };
  const normalizeGallery = (value) => {
    const source = Array.isArray(value) && value.length ? value : DEFAULT_GALLERY_IMAGE_NAMES.map((title) => ({ title, url: "" }));
    return source.map((item, index) => createGalleryImageItem(item, index));
  };
  const isConfiguratorEditor = editorMode === "configurator";
  const isProductEditor = editorMode === "product";
  const isCategoryEditor = editorMode === "category";
  const orderedProducts = Array.isArray(displayProducts) && displayProducts.length ? displayProducts : products;
  const activeConfiguratorProduct = isConfiguratorEditor ? orderedProducts[0] : null;
  const activeConfiguratorSchema = activeConfiguratorProduct ? getProductConfiguratorSchema(activeConfiguratorProduct) : DEFAULT_CONFIGURATOR_SCHEMA;
  const activeVisibleConfiguratorSchema = activeConfiguratorProduct ? getRenderableConfiguratorSchema(activeConfiguratorProduct, activeConfiguratorSchema) : DEFAULT_CONFIGURATOR_SCHEMA;
  const activeConfiguratorVisibleSections = activeConfiguratorSchema.visibleSections || DEFAULT_CONFIGURATOR_SCHEMA.visibleSections;
  const activeConfiguratorShownSectionCount = 1 + ["mountOptions", "colorOptions", "liftOptions", "headrailOptions"].filter((key) => activeConfiguratorVisibleSections[key] !== false).length + (activeConfiguratorSchema.customSections || []).filter((section) => section.visible !== false).length;
  const activeConfiguratorCustomOptionCount = (activeConfiguratorSchema.customSections || []).reduce((sum, section) => sum + (Array.isArray(section.options) ? section.options.length : 0), 0);

  const editorVisibleProducts = useMemo(() => {
    if (isConfiguratorEditor || isCategoryEditor) return [];
    if (isProductEditor) return orderedProducts;
    const q = editorSearch.trim().toLowerCase();
    if (!q) return orderedProducts;
    return orderedProducts.filter((product) => [
      product.name,
      product.brand,
      product.category,
      product.model,
      product.internetNumber,
      product.internet,
      product.badge
    ].join(" ").toLowerCase().includes(q));
  }, [orderedProducts, editorSearch, isProductEditor, isConfiguratorEditor, isCategoryEditor]);

  const handleEditorSave = async () => {
    const saved = await saveProducts();
    if (saved !== false) setEditedProductIds(new Set());
  };

  const toggleExpandedProduct = (id) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };


  const getDefaultSectionOpen = (product, sectionId) => {
    if (isProductEditor) return sectionId === "images" || sectionId === "carousel";
    if (sectionId === "details") return true;
    if (sectionId === "images") return true;
    return false;
  };

  const isEditorSectionOpen = (product, sectionId) => {
    const saved = openSections?.[product.id]?.[sectionId];
    return typeof saved === "boolean" ? saved : getDefaultSectionOpen(product, sectionId);
  };

  const toggleEditorSection = (product, sectionId) => {
    setOpenSections((prev) => {
      const productSections = prev[product.id] || {};
      const current = typeof productSections[sectionId] === "boolean" ? productSections[sectionId] : getDefaultSectionOpen(product, sectionId);
      return {
        ...prev,
        [product.id]: {
          ...productSections,
          [sectionId]: !current
        }
      };
    });
  };

  const expandVisibleProducts = () => setExpandedProducts((prev) => new Set([...prev, ...editorVisibleProducts.map((product) => product.id)]));
  const collapseVisibleProducts = () => setExpandedProducts((prev) => {
    const next = new Set(prev);
    editorVisibleProducts.forEach((product) => next.delete(product.id));
    return next;
  });

  const updateGalleryFromText = (id, value) => {
    const galleryImages = value.split("\n").map((line, index) => createGalleryImageItem(line.trim(), index));
    updateProduct(id, "galleryImages", galleryImages);
  };

  const appendGalleryImage = (id, value) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = normalizeGallery(p.galleryImages);
      return { ...p, galleryImages: [...galleryImages, createGalleryImageItem(value, galleryImages.length)] };
    }));
  };

  const appendGalleryImages = (id, values) => {
    const cleanValues = values.filter(Boolean);
    if (!cleanValues.length) return;
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = normalizeGallery(p.galleryImages);
      const newItems = cleanValues.map((value, offset) => createGalleryImageItem(value, galleryImages.length + offset));
      return { ...p, galleryImages: [...galleryImages, ...newItems] };
    }));
  };

  const removeGalleryImage = (id, index) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = normalizeGallery(p.galleryImages).filter((_, i) => i !== index);
      return { ...p, galleryImages };
    }));
  };

  const moveGalleryImage = (id, index, direction) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = [...normalizeGallery(p.galleryImages)];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= galleryImages.length) return p;
      const [moved] = galleryImages.splice(index, 1);
      galleryImages.splice(targetIndex, 0, moved);
      return { ...p, galleryImages };
    }));
  };

  const moveGalleryImageTo = (id, fromIndex, targetIndex, position = "before") => {
    if (fromIndex === targetIndex || fromIndex < 0 || targetIndex < 0) return;
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = [...normalizeGallery(p.galleryImages)];
      if (fromIndex >= galleryImages.length || targetIndex >= galleryImages.length) return p;
      const [moved] = galleryImages.splice(fromIndex, 1);
      let insertIndex = targetIndex;
      if (position === "after") insertIndex = targetIndex + 1;
      if (fromIndex < insertIndex) insertIndex -= 1;
      insertIndex = Math.max(0, Math.min(insertIndex, galleryImages.length));
      galleryImages.splice(insertIndex, 0, moved);
      return { ...p, galleryImages };
    }));
  };

  const handleGalleryDragStart = (event, id, index) => {
    setGalleryDragging({ id, index });
    setGalleryDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify({ id, index }));
  };

  const handleGalleryDragOver = (event, id, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setGalleryDropTarget({ id, index, position });
  };

  const handleGalleryDrop = (event, id, index) => {
    event.preventDefault();
    let dragData = galleryDragging;
    try {
      const raw = event.dataTransfer.getData("text/plain");
      if (raw) dragData = JSON.parse(raw);
    } catch (error) {
      dragData = galleryDragging;
    }
    if (dragData && String(dragData.id) === String(id)) {
      const position = galleryDropTarget?.id === id && galleryDropTarget?.index === index ? galleryDropTarget.position : "before";
      moveGalleryImageTo(id, Number(dragData.index), index, position);
    }
    setGalleryDragging(null);
    setGalleryDropTarget(null);
  };

  const handleGalleryDragEnd = () => {
    setGalleryDragging(null);
    setGalleryDropTarget(null);
  };

  const updateGalleryImageAt = (id, index, value) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = [...normalizeGallery(p.galleryImages)];
      const current = createGalleryImageItem(galleryImages[index], index);
      galleryImages[index] = { ...current, url: value };
      return { ...p, galleryImages };
    }));
  };

  const updateGalleryImageNameAt = (id, index, value) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = [...normalizeGallery(p.galleryImages)];
      const current = createGalleryImageItem(galleryImages[index], index);
      galleryImages[index] = { ...current, title: value };
      return { ...p, galleryImages };
    }));
  };

  const addGalleryUrl = (id) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const galleryImages = normalizeGallery(p.galleryImages);
      return { ...p, galleryImages: [...galleryImages, createGalleryImageItem("", galleryImages.length)] };
    }));
  };

  const moveProduct = (id, direction) => {
    const displayIndex = orderedProducts.findIndex((p) => String(p.id) === String(id));
    const targetDisplayIndex = displayIndex + direction;
    if (displayIndex < 0 || targetDisplayIndex < 0 || targetDisplayIndex >= orderedProducts.length) return;

    const targetId = orderedProducts[targetDisplayIndex].id;
    setProducts((prev) => {
      const next = [...prev];
      const sourceIndex = next.findIndex((p) => String(p.id) === String(id));
      const targetIndex = next.findIndex((p) => String(p.id) === String(targetId));
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };


  const addProduct = () => {
    const nextId = Math.max(0, ...products.map((p) => Number(p.id) || 0)) + 1;
    setProducts((prev) => [{ id: nextId, badge: "Best Seller", brand: "Bali", name: "New Product Name", model: `MOCK-${nextId}`, category: "Roller Shades", light: "Light Filtering", lift: "Cordless", price: "99.00", was: "149.00", rating: 4.5, reviews: 0, imageUrl: "", hoverImageUrl: "", galleryImages: DEFAULT_GALLERY_IMAGE_NAMES.map((title) => ({ title, url: "" })), pickup: false, delivery: true, shopType: "Custom", referenceBorder: false, includeHoverInCarousel: true }, ...prev]);
    setExpandedProducts((prev) => new Set([nextId, ...prev]));
  };

  const duplicateProduct = (product) => {
    const nextId = Math.max(0, ...products.map((p) => Number(p.id) || 0)) + 1;
    const copy = {
      ...product,
      id: nextId,
      name: `${product.name || "Product"} Copy`,
      model: product.model ? `${product.model}-COPY` : `MOCK-${nextId}`
    };
    setProducts((prev) => {
      const index = prev.findIndex((p) => String(p.id) === String(product.id));
      const next = [...prev];
      next.splice(index >= 0 ? index + 1 : 0, 0, copy);
      return next;
    });
    setExpandedProducts((prev) => new Set([nextId, ...prev]));
    setEditedProductIds((prev) => new Set(prev).add(nextId));
  };

  const removeProduct = (id) => setProducts((prev) => prev.filter((p) => p.id !== id));

  const updateStockOptions = (id, updater) => {
    markProductEdited(id);
    setProducts((prev) => prev.map((product) => {
      if (product.id !== id) return product;
      const current = getStockOptions(product);
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...product, stockOptions: mergeStockOptions(next) };
    }));
  };

  const updateStockField = (id, field, value) => {
    updateStockOptions(id, (current) => ({ ...current, [field]: value }));
  };

  const updateStockNestedField = (id, group, field, value) => {
    updateStockOptions(id, (current) => ({ ...current, [group]: { ...(current[group] || {}), [field]: value } }));
  };

  const updateStockColor = (id, index, field, value) => {
    updateStockOptions(id, (current) => {
      const colors = [...current.colors];
      colors[index] = { ...colors[index], [field]: value };
      if (field === "label" && (!colors[index].key || colors[index].key === current.colors[index].label)) colors[index].key = value.toLowerCase().replace(/\s+/g, "-");
      return { ...current, colors };
    });
  };

  const addStockColor = (id) => {
    updateStockOptions(id, (current) => {
      const nextNumber = current.colors.length + 1;
      return { ...current, colors: [...current.colors, { key: `color-${nextNumber}`, label: `Color ${nextNumber}`, swatchColor: "#f4f4f4", swatchImageUrl: "" }] };
    });
  };

  const removeStockColor = (id, index) => {
    updateStockOptions(id, (current) => {
      const colors = current.colors.filter((_, i) => i !== index);
      return { ...current, colors: colors.length ? colors : current.colors };
    });
  };

  const duplicateStockColor = (id, index) => {
    updateStockOptions(id, (current) => {
      const source = current.colors[index] || { key: "color", label: "Color", swatchColor: "#f4f4f4", swatchImageUrl: "" };
      const copy = { ...source, key: `${source.key || "color"}-copy`, label: `${source.label || "Color"} Copy` };
      const colors = [...current.colors];
      colors.splice(index + 1, 0, copy);
      return { ...current, colors };
    });
  };

  const moveStockColor = (id, index, direction) => {
    updateStockOptions(id, (current) => {
      const target = index + direction;
      if (target < 0 || target >= current.colors.length) return current;
      const colors = [...current.colors];
      const [moved] = colors.splice(index, 1);
      colors.splice(target, 0, moved);
      return { ...current, colors };
    });
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });

  const resizeImageFileToSquareDataUrl = (file, size = 1024) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image for resizing"));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        const scale = Math.min(size / image.width, size / image.height);
        const drawWidth = Math.round(image.width * scale);
        const drawHeight = Math.round(image.height * scale);
        const dx = Math.round((size - drawWidth) / 2);
        const dy = Math.round((size - drawHeight) / 2);
        ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

  const resizeImageFileToContainedDataUrl = (file, maxWidth = 1800, maxHeight = 900, quality = 0.72) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image for resizing"));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

  const uploadImageAsset = async (id, field, file) => {
    const dataUrl = await resizeImageFileToSquareDataUrl(file, 1024);

    try {
      const res = await fetch(FUNCTION_UPLOAD_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          fileName: file.name || `${field}.jpg`,
          productId: id,
          field
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) throw new Error(payload.error || "Image upload function failed");
      return payload.url;
    } catch (error) {
      console.warn("Netlify image upload unavailable; using local data URL fallback.", error);
      return dataUrl;
    }
  };

  const uploadImage = async (id, field, file) => {
    if (!file) return;
    setUploading(`${id}-${field}`);
    try {
      const result = await uploadImageAsset(id, field, file);
      updateProduct(id, field, result);
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading("");
    }
  };
  const uploadCategoryImageAsset = async (section, field, file) => {
    const imageLimits = {
      topBanner: { width: 1200, height: 400 },
      sideBanner: { width: 800, height: 900 },
      hero: { width: 1400, height: 900 }
    };
    const limits = imageLimits[section] || { width: 1200, height: 700 };
    return resizeImageFileToContainedDataUrl(file, limits.width, limits.height, 0.72);
  };

  const updateCategoryPageField = (section, field, value) => {
    if (!setMockupSettings) return;
    setMockupSettings((current) => {
      const categoryPage = mergeCategoryPageSettings(current?.categoryPage);
      return mergeMockupSettings({
        ...current,
        categoryPage: {
          ...categoryPage,
          [section]: {
            ...categoryPage[section],
            [field]: value
          }
        }
      });
    });
  };

  const uploadCategoryImage = async (section, field, file) => {
    if (!file) return;
    setUploading(`category-${section}-${field}`);
    try {
      const result = await uploadCategoryImageAsset(section, field, file);
      updateCategoryPageField(section, field, result);
    } catch (error) {
      alert(`Category image upload failed: ${error.message}`);
    } finally {
      setUploading("");
    }
  };


  const uploadGalleryImages = async (id, fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setUploading(`${id}-galleryImages`);
    try {
      const results = [];
      for (const file of files) {
        const result = await uploadImageAsset(id, "galleryImages", file);
        results.push(result);
      }
      appendGalleryImages(id, results);
    } catch (error) {
      alert(`Gallery upload failed: ${error.message}`);
    } finally {
      setUploading("");
    }
  };

  const replaceGalleryImage = async (id, index, file) => {
    if (!file) return;
    setUploading(`${id}-galleryImages-${index}`);
    try {
      const result = await uploadImageAsset(id, "galleryImages", file);
      updateGalleryImageAt(id, index, result);
    } catch (error) {
      alert(`Gallery image replacement failed: ${error.message}`);
    } finally {
      setUploading("");
    }
  };

  const updateActiveConfiguratorSchema = (updater) => {
    if (!activeConfiguratorProduct) return;
    // Edit the raw saved schema. The one-time migration removed Drill-Free
    // where needed, but future editor changes are unrestricted.
    const currentSchema = getProductConfiguratorSchema(activeConfiguratorProduct);
    const nextSchema = typeof updater === "function" ? updater(currentSchema) : updater;
    updateProduct(activeConfiguratorProduct.id, "configurator", mergeConfiguratorSchema(nextSchema));
  };



  const resetActiveConfiguratorSchema = () => {
    if (!activeConfiguratorProduct) return;
    if (typeof window !== "undefined" && !window.confirm("Reset the full configurator for this product to defaults?")) return;
    updateProduct(activeConfiguratorProduct.id, "configurator", mergeConfiguratorSchema(DEFAULT_CONFIGURATOR_SCHEMA));
  };

  const categoryPageEditor = mergeCategoryPageSettings(mockupSettings?.categoryPage);
  const renderCategoryTextField = (section, field, label, multiline = false) => (
    <label className="editor-field category-editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={categoryPageEditor[section][field] || ""} rows={3} onChange={(e) => updateCategoryPageField(section, field, e.target.value)} />
      ) : (
        <input value={categoryPageEditor[section][field] || ""} onChange={(e) => updateCategoryPageField(section, field, e.target.value)} />
      )}
    </label>
  );
  const renderCategoryImageField = (section, field, label, helper) => {
    const value = categoryPageEditor[section][field] || "";
    const uploadKey = `category-${section}-${field}`;
    return (
      <div className="editor-field category-editor-image-field">
        <label><span>{label}</span><input value={value} onChange={(e) => updateCategoryPageField(section, field, e.target.value)} placeholder="Paste image URL or upload below" /></label>
        <div className="category-editor-image-row">
          <div className="category-editor-image-preview">{value ? <img src={imgSrc(value)} alt={label} /> : <span>No image selected</span>}</div>
          <label className="editor-upload-pill-button">
            <Upload size={15} /> <span>{uploading === uploadKey ? "Uploading..." : "Upload Image"}</span>
            <input type="file" accept="image/*" onChange={(e) => { uploadCategoryImage(section, field, e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        {helper ? <small>{helper}</small> : null}
      </div>
    );
  };

  if (isCategoryEditor) {
    return (
      <div className="editor-overlay editor-overlay-product" onClick={onClose}>
        <div className="editor-panel editor-panel-product editor-panel-configurator category-editor-panel" onClick={(e) => e.stopPropagation()}>
          <div className="editor-sticky-top">
            <div className="editor-header">
              <div>
                <div className="editor-kicker"><Pencil size={15} /> Category page panel</div>
                <h2>Category Page Editor</h2>
                <p>Edit category page copy and campaign images. Logo assets are served from public files, while banner and hero images save with the category page data.</p>
              </div>
              <button onClick={onClose}><X size={22} /></button>
            </div>
            <div className="editor-actions editor-actions-enhanced">
              <button onClick={handleEditorSave} className="save-action"><Save size={16} /> Save Category Page</button>
              <button onClick={reloadProducts} className="secondary-action"><RotateCcw size={16} /> Reload</button>
              {saveStatus && <span className="save-status">{saveStatus}</span>}
            </div>
          </div>

          <div className="category-editor-workspace">
            <div className="category-editor-controls" aria-label="Category page editable fields">
              <section className="editor-card apple-editor-card editor-card-expanded category-editor-card">
                <div className="category-editor-section-head"><span>Top sponsored banner</span><strong>VENETA strip</strong></div>
                <div className="category-editor-grid">
                  {renderCategoryTextField("topBanner", "label", "Sponsored label")}
                  {renderCategoryTextField("topBanner", "headline", "Headline", true)}
                  {renderCategoryTextField("topBanner", "ctaText", "CTA text")}
                  {renderCategoryTextField("topBanner", "ctaUrl", "CTA destination")}
                  <label className="editor-field category-editor-field">
                    <span>Static public logo</span>
                    <input readOnly value={CATEGORY_PAGE_IMAGES.topLogo} />
                  </label>
                  {renderCategoryImageField("topBanner", "imageUrl", "Right banner image", "Use the room/blinds image cropped for the right side of the banner.")}
                </div>
              </section>

              <section className="editor-card apple-editor-card editor-card-expanded category-editor-card">
                <div className="category-editor-section-head"><span>Left sponsored banner</span><strong>Vertical ad</strong></div>
                <div className="category-editor-grid">
                  {renderCategoryTextField("sideBanner", "label", "Sponsored label")}
                  {renderCategoryTextField("sideBanner", "headline", "Headline", true)}
                  {renderCategoryTextField("sideBanner", "ctaText", "CTA text")}
                  {renderCategoryTextField("sideBanner", "ctaUrl", "CTA destination")}
                  <label className="editor-field category-editor-field">
                    <span>Static public logo</span>
                    <input readOnly value={CATEGORY_PAGE_IMAGES.sideLogo} />
                  </label>
                  {renderCategoryImageField("sideBanner", "imageUrl", "Top image", "Image shown below the orange bar.")}
                </div>
              </section>

              <section className="editor-card apple-editor-card editor-card-expanded category-editor-card">
                <div className="category-editor-section-head"><span>Main hero promotion</span><strong>Category hero</strong></div>
                <div className="category-editor-grid">
                  {renderCategoryTextField("hero", "kicker", "Kicker")}
                {renderCategoryTextField("hero", "headline", "Headline")}
                  {renderCategoryTextField("hero", "body", "Body", true)}
                  {renderCategoryTextField("hero", "ctaText", "CTA text")}
                  {renderCategoryImageField("hero", "imageUrl", "Hero image", "Large image on the right side of the hero banner.")}
                </div>
              </section>

              <section className="editor-card apple-editor-card editor-card-expanded category-editor-card">
                <div className="category-editor-section-head">
                  <span>Banner presets</span>
                  <strong>Save / Load / Delete</strong>
                </div>
                <div className="category-editor-grid banner-preset-grid">
                  <label className="editor-field category-editor-field banner-preset-name-field">
                    <span>Preset name</span>
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="e.g. Memorial Day 2026"
                    />
                    <small className="banner-preset-helper">{bannerPresetStatus || "Save the current top, side, and hero banners as a named preset."}</small>
                  </label>

                  <div className="banner-preset-toolbar-actions">
                    <button
                      type="button"
                      className="save-action"
                      onClick={async () => {
                        if (!saveBannerPreset) return;
                        const ok = await saveBannerPreset(newPresetName);
                        if (ok) setNewPresetName("");
                      }}
                    >
                      <Save size={14} /> Save Preset
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => reloadBannerPresets && reloadBannerPresets()}
                    >
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>

                  <div className="banner-preset-list-wrap">
                    {bannerPresets.length === 0 ? (
                      <div className="banner-preset-empty">No saved presets yet. Enter a name and click Save Preset to capture the current banners.</div>
                    ) : (
                      <ul className="banner-preset-list">
                        {bannerPresets.map((preset) => (
                          <li key={preset.id} className="banner-preset-row">
                            <div className="banner-preset-meta">
                              <div className="banner-preset-name">{preset.name}</div>
                              {preset.updatedAt && (
                                <div className="banner-preset-time">Updated {new Date(preset.updatedAt).toLocaleString()}</div>
                              )}
                            </div>
                            <div className="banner-preset-actions">
                              <button
                                type="button"
                                className="save-action"
                                onClick={() => loadBannerPreset && loadBannerPreset(preset.id)}
                              >
                                <Upload size={13} /> Load
                              </button>
                              <button
                                type="button"
                                className="secondary-action"
                                onClick={() => {
                                  if (typeof window === "undefined") return;
                                  const next = window.prompt("Rename preset:", preset.name);
                                  if (next && next.trim() && next.trim() !== preset.name && renameBannerPreset) {
                                    renameBannerPreset(preset.id, next.trim());
                                  }
                                }}
                              >
                                <Pencil size={13} /> Rename
                              </button>
                              <button
                                type="button"
                                className="secondary-action banner-preset-delete"
                                onClick={() => deleteBannerPreset && deleteBannerPreset(preset.id)}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isConfiguratorEditor) {
    return (
      <div className="editor-overlay editor-overlay-product" onClick={onClose}>
        <div className="editor-panel editor-panel-product editor-panel-configurator" role="dialog" aria-modal="true" aria-label="Configurator Editor" onClick={(e) => e.stopPropagation()}>
          <div className="editor-sticky-top">
            <div className="editor-header">
              <div>
                <div className="editor-kicker"><Pencil size={15} /> Product configurator</div>
                <h2>Configurator Editor</h2>
                <p>Edit size rules and option groups for this product. Changes save with the same product data used by the grid and product page.</p>
              </div>
              <button onClick={onClose}><X size={22} /></button>
            </div>
            <div className="editor-actions editor-actions-enhanced">
              <button onClick={handleEditorSave} className="save-action"><Save size={16} /> Save Program Data</button>
              <button onClick={reloadProducts} className="secondary-action"><RotateCcw size={16} /> Reload</button>
              <button type="button" onClick={resetActiveConfiguratorSchema} className="secondary-action" disabled={!activeConfiguratorProduct}><RotateCcw size={16} /> Reset Product Defaults</button>
              {saveStatus && <span className="save-status">{saveStatus}</span>}
            </div>
          </div>
          {activeConfiguratorProduct ? (
            <div className="editor-list editor-list-product config-editor-shell">
              <div className="editor-card apple-editor-card editor-card-expanded config-product-editor-card">
                <div className="editor-compact-summary config-product-summary">
                  <div className="editor-compact-preview">
                    <ProductImage product={activeConfiguratorProduct} hoverEnabled compact />
                  </div>
                  <div className="editor-compact-main">
                    <div className="editor-compact-name config-editor-product-title">
                      <span>Configurator for</span>
                      <strong>{activeConfiguratorProduct.brand || "Product"} {activeConfiguratorProduct.name || "Configurator"}</strong>
                    </div>
                    <div className="editor-compact-meta">
                      <span>{activeConfiguratorProduct.category || "Category needed"}</span>
                      <i />
                      <span>{activeConfiguratorShownSectionCount} visible sections</span>
                      <i />
                      <span>{activeConfiguratorSchema.mountOptions.length + activeConfiguratorSchema.liftOptions.length + activeConfiguratorSchema.headrailOptions.length + activeConfiguratorCustomOptionCount} total options</span>
                    </div>
                    <div className="editor-compact-chips">
                      {editedProductIds.has(activeConfiguratorProduct.id) ? <span className="editor-chip edited">Edited</span> : null}
                      <span className="editor-chip">{activeConfiguratorProduct.configurator || activeConfiguratorProduct.configuratorSchema ? "Product-specific" : "Using defaults"}</span>
                      <span className="editor-chip">Width {Math.min(activeConfiguratorSchema.widthMin, activeConfiguratorSchema.widthMax)}-{Math.max(activeConfiguratorSchema.widthMin, activeConfiguratorSchema.widthMax)} in.</span>
                      <span className="editor-chip">Height {Math.min(activeConfiguratorSchema.heightMin, activeConfiguratorSchema.heightMax)}-{Math.max(activeConfiguratorSchema.heightMin, activeConfiguratorSchema.heightMax)} in.</span>
                    </div>
                  </div>
                </div>
                <div className="editor-more-panel config-editor-more-panel">
                  <ConfiguratorSettingsEditor schema={activeConfiguratorSchema} setSchema={updateActiveConfiguratorSchema} product={activeConfiguratorProduct} isEdited={editedProductIds.has(activeConfiguratorProduct.id)} />
                </div>
              </div>
            </div>
          ) : <div className="editor-empty-state">Open a product configurator before editing configurator settings.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`editor-overlay ${isProductEditor ? "editor-overlay-product" : ""}`} onClick={onClose}>
      <div className={`editor-panel ${isProductEditor ? "editor-panel-product" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="editor-sticky-top">
          <div className="editor-header"><div><div className="editor-kicker"><Pencil size={15} /> {isProductEditor ? "Product page panel" : "Proposal data panel"}</div><h2>{isProductEditor ? "Product Editor" : "Mockup Editor"}</h2><p>{isProductEditor ? "Edit only the product currently open on the product page. Changes stay linked to the grid and save with the same product data." : "Edit product names, prices, primary/hover images, and PDP carousel images. Uploaded images are resized to 1024 × 1024 and stored in Netlify Blobs when running on Netlify Dev or the live site."}</p></div><button onClick={onClose}><X size={22} /></button></div>
          <div className="editor-actions editor-actions-enhanced">
            {!isProductEditor ? (
              <div className="editor-search-shell">
                <Search size={16} />
                <input value={editorSearch} onChange={(e) => setEditorSearch(e.target.value)} placeholder="Search products in editor" />
                {editorSearch ? <button type="button" onClick={() => setEditorSearch("")} aria-label="Clear editor search"><X size={14} /></button> : null}
              </div>
            ) : null}
            {!isProductEditor && <button onClick={addProduct} className="orange-action"><Plus size={16} /> Add Product</button>}
            {!isProductEditor && <button onClick={expandVisibleProducts} className="secondary-action"><ChevronDown size={16} /> Expand All</button>}
            {!isProductEditor && <button onClick={collapseVisibleProducts} className="secondary-action editor-collapse-action"><ChevronDown size={16} /> Collapse All</button>}
            <button onClick={handleEditorSave} className="save-action"><Save size={16} /> Save Program Data</button>
            <button onClick={reloadProducts} className="secondary-action"><RotateCcw size={16} /> Reload</button>
            {saveStatus && <span className="save-status">{saveStatus}</span>}
          </div>
          {!isProductEditor ? (
            <div className="editor-reference-mode-wrap">
              <label className={placeholderNonBordered ? "editor-reference-mode-card active" : "editor-reference-mode-card"}>
                <div className="editor-reference-mode-icon" aria-hidden="true"><Package size={17} /></div>
                <div className="editor-reference-mode-copy">
                  <strong>Reference Products Only</strong>
                  <span>Only products with Reference Border stay real. All others appear as placeholders.</span>
                </div>
                <span className="apple-switch editor-reference-mode-switch" aria-label="Toggle Reference Products Only">
                  <input type="checkbox" checked={placeholderNonBordered} onChange={(e) => setPlaceholderNonBordered(e.target.checked)} />
                  <i />
                </span>
              </label>
            </div>
          ) : null}
        </div>
        <div className={`editor-list ${isProductEditor ? "editor-list-product" : ""}`}>
          {!editorVisibleProducts.length ? (
            <div className="editor-empty-state">No products match your editor search.</div>
          ) : null}
          {editorVisibleProducts.map((p) => {
            const galleryImages = normalizeGallery(p.galleryImages);
            const galleryText = galleryImages.join("\n");
            const isEdited = editedProductIds.has(p.id);
            const carouselCount = galleryImages.filter((item) => Boolean(getGalleryImageUrl(item))).length;
            const detailsId = `editor-more-${p.id}`;
            return (
              <div key={p.id} className={`editor-card apple-editor-card ${isProductEditor ? "editor-card-expanded" : "editor-card-compact"}`}>
                {(() => {
                  const isExpanded = isProductEditor || expandedProducts.has(p.id);
                  return (
                    <>
                      <div className="editor-compact-summary">
                        <div className="editor-compact-preview">
                          <ProductImage product={p} hoverEnabled compact />
                        </div>

                        <div className="editor-compact-main">
                          <label className="editor-compact-name">Name
                            <textarea value={p.name || ""} onChange={(e) => updateProduct(p.id, "name", e.target.value)} rows={2} />
                          </label>
                          <div className="editor-compact-meta">
                            <span>{p.brand || "Brand needed"}</span>
                            <i />
                            <span>{p.category || "Category needed"}</span>
                          </div>
                          <div className="editor-compact-chips">
                            {isEdited ? <span className="editor-chip edited">Edited</span> : null}
                            {!p.imageUrl ? <span className="editor-chip warning">Image Needed</span> : null}
                            {!p.hoverImageUrl ? <span className="editor-chip muted">No Hover</span> : null}
                            <span className="editor-chip">{carouselCount} PDP image{carouselCount === 1 ? "" : "s"}</span>
                          </div>
                        </div>

                        <div className="editor-compact-controls">
                          <div className="editor-top-toggles editor-compact-toggles">
                            <div className="editor-reference-toggle">
                              <span title="Reference Border">Border</span>
                              <label className="apple-switch" aria-label="Toggle reference border">
                                <input type="checkbox" checked={Boolean(p.referenceBorder)} onChange={(e) => updateProduct(p.id, "referenceBorder", e.target.checked)} />
                                <i />
                              </label>
                            </div>
                            <div className="editor-reference-toggle editor-hover-carousel-toggle">
                              <span title="Hover in Carousel">Hover in Carousel</span>
                              <label className="apple-switch" aria-label="Toggle hover image in carousel">
                                <input type="checkbox" checked={p.includeHoverInCarousel !== false} onChange={(e) => updateProduct(p.id, "includeHoverInCarousel", e.target.checked)} />
                                <i />
                              </label>
                            </div>
                          </div>

                          {!isProductEditor ? (
                            <button type="button" className="editor-more-toggle" onClick={() => toggleExpandedProduct(p.id)} aria-expanded={isExpanded} aria-controls={detailsId} aria-label={isExpanded ? "Hide product details" : "Show product details"} title={isExpanded ? "Hide product details" : "Show product details"}>
                              <ChevronDown size={18} />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="editor-more-panel" id={detailsId}>
                          {!isProductEditor ? (
                            <div className="editor-more-heading">
                              <div>
                                <strong>More product settings</strong>
                                <span>Product details and main images.</span>
                              </div>
                              <div className="editor-more-heading-actions">
                                <button type="button" onClick={() => duplicateProduct(p)} className="editor-duplicate-button"><Plus size={13} /> Duplicate</button>
                                <button onClick={() => removeProduct(p.id)} className="remove-button editor-more-remove"><Trash2 size={13} /> Remove</button>
                              </div>
                            </div>
                          ) : null}

                          <div className="editor-fields editor-fields-compact-more editor-section-stack">
                            <EditorAccordionSection
                              productId={p.id}
                              sectionId="details"
                              title="Product Details"
                              description="Core merchandising fields and filters."
                              status={!p.brand || !p.category ? "Needs info" : "Ready"}
                              isOpen={isEditorSectionOpen(p, "details")}
                              onToggle={() => toggleEditorSection(p, "details")}
                            >
                              <div className="editor-section-grid">
                                <label>Brand<input value={p.brand || ""} onChange={(e) => updateProduct(p.id, "brand", e.target.value)} placeholder="Enter brand" /></label>
                                <label>Model<input value={p.model || ""} onChange={(e) => updateProduct(p.id, "model", e.target.value)} /></label>
                                <label>Internet #<input value={p.internetNumber || p.internet || ""} onChange={(e) => updateProduct(p.id, "internetNumber", e.target.value)} placeholder="305091385" /></label>
                                <label>Badge<input value={p.badge || ""} onChange={(e) => updateProduct(p.id, "badge", e.target.value)} placeholder="Best Seller" /></label>
                                <label>Category<select value={p.category || ""} onChange={(e) => updateProduct(p.id, "category", e.target.value)}>{FILTER_GROUPS[0].options.map((x) => <option key={x}>{x}</option>)}</select></label>
                                <label>Light Control<select value={p.light || ""} onChange={(e) => updateProduct(p.id, "light", e.target.value)}>{FILTER_GROUPS[1].options.map((x) => <option key={x}>{x}</option>)}</select></label>
                                <label>Lift System<select value={p.lift || ""} onChange={(e) => updateProduct(p.id, "lift", e.target.value)}>{FILTER_GROUPS[3].options.map((x) => <option key={x}>{x}</option>)}</select></label>
                                <label>Shop Type<select value={normalizeShopType(p.shopType)} onChange={(e) => updateProduct(p.id, "shopType", e.target.value)}>{SHOP_TYPE_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
                              </div>
                            </EditorAccordionSection>

                            {isProductEditor ? (
                            <EditorAccordionSection
                              productId={p.id}
                              sectionId="pricing"
                              title="Pricing & Promo"
                              description="Card and product page promotional copy."
                              status={p.price ? "Ready" : "Needs price"}
                              isOpen={isEditorSectionOpen(p, "pricing")}
                              onToggle={() => toggleEditorSection(p, "pricing")}
                            >
                              <div className="editor-section-grid editor-section-grid-pricing">
                                <label>Price<input value={p.price || ""} onChange={(e) => updateProduct(p.id, "price", e.target.value)} /></label>
                                <label>Was Price<input value={p.was || ""} onChange={(e) => updateProduct(p.id, "was", e.target.value)} /></label>
                                <label className="wide">Promo<input value={p.promo || ""} onChange={(e) => updateProduct(p.id, "promo", e.target.value)} placeholder="Buy 1 or More, Get 25% Off" /></label>
                              </div>
                            </EditorAccordionSection>
                            ) : null}

                            {isProductEditor ? (normalizeShopType(p.shopType) === "Pre-Cut" ? (() => {
                              const stockOptions = getStockOptions(p);
                              return (
                                <EditorAccordionSection
                                  productId={p.id}
                                  sectionId="stock"
                                  title="Stock / Pre-Cut PDP Options"
                                  description="Controls swatches, fixed sizes, fulfillment, and install options for stock product pages."
                                  status={`${stockOptions.colors.length} colors`}
                                  isOpen={isEditorSectionOpen(p, "stock")}
                                  onToggle={() => toggleEditorSection(p, "stock")}
                                  className="editor-section-card-stock"
                                >
                                  <div className="editor-section-grid editor-stock-grid">
                                    <label className="wide">Width Options<input value={stockOptions.widths.join(", ")} onChange={(e) => updateStockField(p.id, "widths", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="35 in, 39 in" /></label>
                                    <label className="wide">Length Options<input value={stockOptions.lengths.join(", ")} onChange={(e) => updateStockField(p.id, "lengths", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="48 in, 64 in, 72 in" /></label>
                                    <label>Default Color<select value={stockOptions.defaultColor} onChange={(e) => updateStockField(p.id, "defaultColor", e.target.value)}>{stockOptions.colors.map((color) => <option key={color.key} value={color.key}>{color.label}</option>)}</select></label>
                                    <label>Default Width<select value={stockOptions.defaultWidth} onChange={(e) => updateStockField(p.id, "defaultWidth", e.target.value)}>{stockOptions.widths.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                                    <label>Default Length<select value={stockOptions.defaultLength} onChange={(e) => updateStockField(p.id, "defaultLength", e.target.value)}>{stockOptions.lengths.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                                    <label>Store Name<input value={stockOptions.fulfillment.storeName || ""} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "storeName", e.target.value)} /></label>
                                    <label>Delivery ZIP<input value={stockOptions.fulfillment.zip || ""} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "zip", e.target.value)} /></label>
                                    <label>Store Stock<input type="number" value={stockOptions.fulfillment.storeStock || 0} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "storeStock", e.target.value)} /></label>
                                    <label>Delivery Stock<input type="number" value={stockOptions.fulfillment.deliveryStock || 0} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "deliveryStock", e.target.value)} /></label>
                                    <label>Faster Delivery Fee<input value={stockOptions.fulfillment.fasterDeliveryFee || ""} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "fasterDeliveryFee", e.target.value)} /></label>
                                    <label>Card Price Mode<select value={stockOptions.priceDisplay.mode || "range"} onChange={(e) => updateStockNestedField(p.id, "priceDisplay", "mode", e.target.value)}><option value="range">Price range</option><option value="single">Single price</option><option value="custom">Custom text</option></select></label>
                                    <label>Range Min<input value={stockOptions.priceDisplay.minPrice || ""} onChange={(e) => updateStockNestedField(p.id, "priceDisplay", "minPrice", e.target.value)} placeholder="24.98" /></label>
                                    <label>Range Max<input value={stockOptions.priceDisplay.maxPrice || ""} onChange={(e) => updateStockNestedField(p.id, "priceDisplay", "maxPrice", e.target.value)} placeholder="119.00" /></label>
                                    <label className="wide">Custom Price Text<input value={stockOptions.priceDisplay.rangeText || ""} onChange={(e) => updateStockNestedField(p.id, "priceDisplay", "rangeText", e.target.value)} placeholder="$24.98 - $119.00" /></label>
                                    <div className="editor-stock-toggle-list wide">
                                      <label><input type="checkbox" checked={Boolean(stockOptions.fulfillment.pickupOnlineAvailable)} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "pickupOnlineAvailable", e.target.checked)} /> Pickup online available</label>
                                      <label><input type="checkbox" checked={Boolean(stockOptions.fulfillment.deliveryAvailable)} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "deliveryAvailable", e.target.checked)} /> Delivery available</label>
                                      <label><input type="checkbox" checked={Boolean(stockOptions.fulfillment.fasterDeliveryAvailable)} onChange={(e) => updateStockNestedField(p.id, "fulfillment", "fasterDeliveryAvailable", e.target.checked)} /> Faster delivery available</label>
                                      <label><input type="checkbox" checked={Boolean(stockOptions.installation.available)} onChange={(e) => updateStockNestedField(p.id, "installation", "available", e.target.checked)} /> Installation available</label>
                                      <label><input type="checkbox" checked={Boolean(stockOptions.installation.defaultSelected)} onChange={(e) => updateStockNestedField(p.id, "installation", "defaultSelected", e.target.checked)} /> Installation selected by default</label>
                                    </div>
                                  </div>
                                  <div className="editor-stock-colors">
                                    <div className="editor-gallery-title-row"><div><strong>Color / Finish Swatches</strong><span>Add, duplicate, reorder, or remove swatches for the stock PDP color selector.</span></div><button type="button" className="editor-add-link-button" onClick={() => addStockColor(p.id)}><Plus size={14} /> Add Color</button></div>
                                    {stockOptions.colors.map((color, index) => (
                                      <div key={`stock-color-${p.id}-${index}`} className="editor-stock-color-row">
                                        <div className="editor-stock-color-preview" style={{ background: color.swatchColor }}>{color.swatchImageUrl ? <img src={imgSrc(color.swatchImageUrl)} alt="" /> : null}</div>
                                        <input value={color.label || ""} onChange={(e) => updateStockColor(p.id, index, "label", e.target.value)} placeholder="Color label" />
                                        <input value={color.key || ""} onChange={(e) => updateStockColor(p.id, index, "key", e.target.value)} placeholder="color-key" />
                                        <input value={color.swatchColor || ""} onChange={(e) => updateStockColor(p.id, index, "swatchColor", e.target.value)} placeholder="#f4f4f4" />
                                        <input value={color.swatchImageUrl || ""} onChange={(e) => updateStockColor(p.id, index, "swatchImageUrl", e.target.value)} placeholder="Optional swatch image URL" />
                                        <div className="editor-stock-color-actions">
                                          <button type="button" onClick={() => moveStockColor(p.id, index, -1)} disabled={index === 0}>↑</button>
                                          <button type="button" onClick={() => moveStockColor(p.id, index, 1)} disabled={index === stockOptions.colors.length - 1}>↓</button>
                                          <button type="button" onClick={() => duplicateStockColor(p.id, index)}><Plus size={13} /></button>
                                          <button type="button" className="editor-gallery-remove" onClick={() => removeStockColor(p.id, index)} disabled={stockOptions.colors.length <= 1}><X size={14} /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </EditorAccordionSection>
                              );
                            })() : normalizeShopType(p.shopType) === "Custom" ? (
                              <EditorAccordionSection
                                productId={p.id}
                                sectionId="stock"
                                title="Stock / Pre-Cut PDP Options"
                                description="Set Shop Type to Pre-Cut to show fixed size, fulfillment, and Add to Cart controls on this product page."
                                status="Custom product"
                                isOpen={isEditorSectionOpen(p, "stock")}
                                onToggle={() => toggleEditorSection(p, "stock")}
                                className="editor-section-card-stock-muted"
                              >
                                <div className="editor-empty-state editor-section-empty-note">Switch Shop Type to Pre-Cut in Product Details to edit stock PDP options.</div>
                              </EditorAccordionSection>
                            ) : null) : null}

                            <EditorAccordionSection
                              productId={p.id}
                              sectionId="images"
                              title="Main Images"
                              description="Upload first. Paste a link only when needed."
                              status={p.imageUrl ? "Ready" : "Needs image"}
                              isOpen={isEditorSectionOpen(p, "images")}
                              onToggle={() => toggleEditorSection(p, "images")}
                              className="editor-section-card-images"
                            >
                              <div className="editor-section-grid editor-section-grid-images">
                                <ImageAssetField
                                  label="Primary Product Image"
                                  value={p.imageUrl || ""}
                                  onChange={(value) => updateProduct(p.id, "imageUrl", value)}
                                  onUpload={(file) => uploadImage(p.id, "imageUrl", file)}
                                  uploading={uploading === `${p.id}-imageUrl`}
                                  helperText="Used on the grid, product page, and first PDP image."
                                />
                                <ImageAssetField
                                  label="Hover Image"
                                  value={p.hoverImageUrl || ""}
                                  onChange={(value) => updateProduct(p.id, "hoverImageUrl", value)}
                                  onUpload={(file) => uploadImage(p.id, "hoverImageUrl", file)}
                                  uploading={uploading === `${p.id}-hoverImageUrl`}
                                  helperText="Optional. Shown when hover image swapping is enabled."
                                />
                              </div>
                            </EditorAccordionSection>

                            {isProductEditor ? (
                            <EditorAccordionSection
                              productId={p.id}
                              sectionId="carousel"
                              title="PDP Carousel Images"
                              description="Drag to reorder. Links stay hidden until you edit them."
                              status={`${carouselCount} images`}
                              isOpen={isEditorSectionOpen(p, "carousel")}
                              onToggle={() => toggleEditorSection(p, "carousel")}
                              className="editor-section-card-gallery"
                            >
                              <div className="editor-gallery-field editor-image-field">
                                <div className="editor-gallery-manager">
                                  <div className="editor-gallery-title-row">
                                    <div><span>Manage the product page thumbnail carousel order.</span></div>
                                    <button type="button" className="editor-add-link-button" onClick={() => addGalleryUrl(p.id)}><Plus size={14} /> Add Link</button>
                                  </div>
                                  <div className="editor-gallery-url-list">
                                    {galleryImages.length ? galleryImages.map((img, i) => {
                                      const isDraggingGalleryRow = galleryDragging && String(galleryDragging.id) === String(p.id) && galleryDragging.index === i;
                                      const isGalleryDropTarget = galleryDropTarget && String(galleryDropTarget.id) === String(p.id) && galleryDropTarget.index === i && !isDraggingGalleryRow;
                                      const galleryDropClass = isGalleryDropTarget ? `gallery-drop-${galleryDropTarget.position}` : "";
                                      return (
                                        <GalleryImageRow
                                          key={`gallery-image-${p.id}-${i}`}
                                          productId={p.id}
                                          img={img}
                                          index={i}
                                          isDragging={isDraggingGalleryRow}
                                          dropClass={galleryDropClass}
                                          uploading={uploading === `${p.id}-galleryImages-${i}`}
                                          onDragOver={handleGalleryDragOver}
                                          onDrop={handleGalleryDrop}
                                          onDragStart={handleGalleryDragStart}
                                          onDragEnd={handleGalleryDragEnd}
                                          onChange={updateGalleryImageAt}
                                          onNameChange={updateGalleryImageNameAt}
                                          onRemove={removeGalleryImage}
                                          onUpload={replaceGalleryImage}
                                        />
                                      );
                                    }) : (
                                      <button type="button" className="editor-gallery-empty" onClick={() => addGalleryUrl(p.id)}><Plus size={16} /> Add your first carousel image</button>
                                    )}
                                  </div>
                                  <div className="editor-gallery-actions-row">
                                    <label className="editor-upload-pill-button">
                                      <Upload size={16} /> <span className="upload-pill-text">Upload Carousel Images</span>
                                      <input type="file" accept="image/*" multiple onChange={(e) => { uploadGalleryImages(p.id, e.target.files); e.target.value = ""; }} />
                                    </label>
                                    {uploading === `${p.id}-galleryImages` ? <span>Uploading…</span> : null}
                                  </div>
                                </div>
                              </div>
                            </EditorAccordionSection>
                            ) : null}

                          </div>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickViewModal({ product, onClose, onOpenProduct }) {
  useModalBehavior(onClose, ".quick-panel");
  const [mode, setMode] = useState("primary");
  const imageToShow = mode === "hover" ? product.hoverImageUrl : product.imageUrl;
  return <div className="quick-overlay" onClick={onClose}><div className="quick-panel" role="dialog" aria-modal="true" aria-label="Quick view" onClick={(e) => e.stopPropagation()}><div className="quick-head"><b>Quick View Mockup</b><button onClick={onClose} aria-label="Close quick view"><X size={20} /></button></div><div className="quick-grid"><div className="quick-image">{imageToShow ? <img src={imgSrc(imageToShow)} alt={product.name} /> : <div className="missing-image">Image Needed</div>}</div><div><div className="quick-tabs"><button className={mode === "primary" ? "active" : ""} onClick={() => setMode("primary")}>Primary Image</button><button className={mode === "hover" ? "active" : ""} onClick={() => setMode("hover")}>Hover Image</button></div><Rating rating={product.rating} reviews={product.reviews} /><h2>{product.brand} {product.name}</h2><p>Model# {product.model}</p><button className="build-button" onClick={() => { onClose(); onOpenProduct(product); }}>View Product</button></div></div></div></div>;
}


const HOME_DEPOT_CATEGORY_IMAGE_BASE = "https://www.homedepot.ca";

const CATEGORY_PAGE_IMAGES = {
  topLogo: VENETA_LOGO_URL,
  topBanner: "",
  hero: "",
  sideLogo: VENETA_LOGO_URL,
  sideAd: "",
  featureCards: {
    fauxWoodBlinds: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/assethub/images/categories/2024-oct-clp-blinds-shades-faux-wood-1000x500.png`,
    woodBlinds: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-wood-1000x500.jpg`,
    cellularHoneycombShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-cellular-1000x500.jpg`
  },
  blindsTiles: {
    woodBlinds: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-wood-1000x500.jpg`,
    premiumFauxWood: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/assethub/images/categories/2024-oct-clp-blinds-shades-faux-wood-1000x500.png`,
    miniBlinds: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/assethub/images/categories/2024-oct-clp-blinds-shades-vinyl-1000x500.png`,
    customBlinds: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/assethub/images/categories/2024-oct-clp-blinds-shades-custom-1000x500.png`,
    verticalBlinds: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-vertical-1000x500.jpg`,
    shutters: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/assethub/images/home-services/2025-oct-hs-blinds-shutters-1400x1400.jpg`
  },
  shadesTiles: {
    cellularShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-cellular-1000x500.jpg`,
    rollerShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-roller-1000x500.jpg`,
    bandedShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-banded-1000x500.jpg`,
    solarShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-solar-1000x500.jpg`,
    customShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/assethub/images/categories/2024-oct-clp-blinds-shades-custom-1000x500.png`,
    blackoutShades: `${HOME_DEPOT_CATEGORY_IMAGE_BASE}/content/dam/homedepot/images/categories/decor/blinds-%26-shades/2023/2023-clp-blinds-shades-roller-1000x500.jpg`
  }
};

function CategoryLandingPage({ products = [], onShopGrid, onCategoryLink, onNavigateCategoryFilter, categoryPageSettings }) {
  const imageCandidates = products.filter((product) => product?.imageUrl || product?.hoverImageUrl || product?.galleryImages?.length);
  const getProductImage = (keywords = [], offset = 0) => {
    const words = Array.isArray(keywords) ? keywords : [keywords];
    const matches = imageCandidates.filter((product) => {
      const haystack = [product?.name, product?.brand, product?.category, product?.light, product?.model, product?.features].flat().join(" ").toLowerCase();
      return words.some((word) => haystack.includes(String(word).toLowerCase()));
    });
    const product = matches[offset % Math.max(matches.length, 1)] || imageCandidates[offset % Math.max(imageCandidates.length, 1)] || {};
    return product?.hoverImageUrl || product?.imageUrl || product?.galleryImages?.[0] || "";
  };
  const categoryImage = (value, fallback) => String(value || "").trim() || fallback || "";
  const categoryPage = mergeCategoryPageSettings(categoryPageSettings);

  const heroImage = categoryImage(categoryPage.hero.imageUrl || CATEGORY_PAGE_IMAGES.hero, getProductImage(["wood", "blind", "faux"], 0));
  const topLogoImage = categoryImage(CATEGORY_PAGE_IMAGES.topLogo, "");
  const bannerImage = categoryImage(categoryPage.topBanner.imageUrl || CATEGORY_PAGE_IMAGES.topBanner, "");
  const sideLogoImage = categoryImage(CATEGORY_PAGE_IMAGES.sideLogo, "");
  const sideAdImage = categoryImage(categoryPage.sideBanner.imageUrl || CATEGORY_PAGE_IMAGES.sideAd, getProductImage(["drill", "hardware", "headrail"], 2) || heroImage);
  const topSponsoredBanner = {
    label: categoryPage.topBanner.label,
    brand: "VENETA",
    headline: categoryPage.topBanner.headline,
    cta: categoryPage.topBanner.ctaText,
    ctaUrl: categoryPage.topBanner.ctaUrl,
    imageAlt: "VENETA shades room promotion"
  };
  const sideSponsoredBanner = {
    label: categoryPage.sideBanner.label,
    brand: "VENETA",
    headline: categoryPage.sideBanner.headline,
    cta: categoryPage.sideBanner.ctaText,
    ctaUrl: categoryPage.sideBanner.ctaUrl,
    imageAlt: "VENETA window treatment promotion"
  };
  const navSections = [
    { title: "", links: ["Blinds", "Shades", "Curtains & Drapes"] },
    { title: "Shop Custom", links: ["Custom Blinds", "Custom Shades"] },
    { title: "Shop by Type", links: ["Cellular Shades", "Faux Wood Blinds", "Roller Shades", "Mini Blinds", "Vertical Blinds", "Wood Blinds", "Blackout Shades", "Roman Shades"] },
    { title: "Shop Hardware", links: ["Curtain Rods", "Curtain Hardware"] }
  ];
  const featureCards = [
    { title: "Faux Wood Blinds", filterLabel: "Faux Wood Blinds", copy: "Get the upscale look of wood blinds with 2 in. slats at an affordable price.", image: categoryImage(CATEGORY_PAGE_IMAGES.featureCards.fauxWoodBlinds, "") },
    { title: "Wood Blinds", filterLabel: "Wood Blinds", copy: "Adds an air of elegance and sophistication. Features thicker slats so they can produce a larger stack when raised.", image: categoryImage(CATEGORY_PAGE_IMAGES.featureCards.woodBlinds, "") },
    { title: "Cellular/Honeycomb Shades", filterLabel: "Cellular Shades", copy: "Save on utility costs with energy-efficient designs that control light and help keep your home comfortable year-round.", image: categoryImage(CATEGORY_PAGE_IMAGES.featureCards.cellularHoneycombShades, "") }
  ];
  const blinds = [
    { name: "Wood Blinds", filterLabel: "Wood Blinds", image: categoryImage(CATEGORY_PAGE_IMAGES.blindsTiles.woodBlinds, "") },
    { name: "Premium Faux Wood", filterLabel: "Faux Wood Blinds", image: categoryImage(CATEGORY_PAGE_IMAGES.blindsTiles.premiumFauxWood, "") },
    { name: "Mini Blinds", filterLabel: "Mini Blinds", image: categoryImage(CATEGORY_PAGE_IMAGES.blindsTiles.miniBlinds, "") },
    { name: "Custom Blinds", filterLabel: "Custom Blinds", image: categoryImage(CATEGORY_PAGE_IMAGES.blindsTiles.customBlinds, "") },
    { name: "Vertical Blinds", filterLabel: "Vertical Blinds", image: categoryImage(CATEGORY_PAGE_IMAGES.blindsTiles.verticalBlinds, "") },
    { name: "Shutters", filterLabel: "Shutters", image: categoryImage(CATEGORY_PAGE_IMAGES.blindsTiles.shutters, "") }
  ];
  const shades = [
    { name: "Cellular Shades", filterLabel: "Cellular Shades", image: categoryImage(CATEGORY_PAGE_IMAGES.shadesTiles.cellularShades, "") },
    { name: "Roller Shades", filterLabel: "Roller Shades", image: categoryImage(CATEGORY_PAGE_IMAGES.shadesTiles.rollerShades, "") },
    { name: "Banded Shades", filterLabel: "Banded Shades", image: categoryImage(CATEGORY_PAGE_IMAGES.shadesTiles.bandedShades, "") },
    { name: "Solar Shades", filterLabel: "Solar Shades", image: categoryImage(CATEGORY_PAGE_IMAGES.shadesTiles.solarShades, "") },
    { name: "Custom Shades", filterLabel: "Custom Shades", image: categoryImage(CATEGORY_PAGE_IMAGES.shadesTiles.customShades, "") },
    { name: "Blackout Shades", filterLabel: "Blackout Shades", image: categoryImage(CATEGORY_PAGE_IMAGES.shadesTiles.blackoutShades, "") }
  ];

  const CategoryImage = ({ src, alt }) => src ? <img src={imgSrc(src)} alt={alt} /> : <span className="hd-category-image-placeholder">Image Needed</span>;
  const handleCategoryLinkClick = (link) => {
    if (typeof onNavigateCategoryFilter === "function") onNavigateCategoryFilter(link);
    else if (typeof onShopGrid === "function") onShopGrid();
  };
  const handleBannerCta = (url) => {
    if (typeof onCategoryLink === "function") {
      onCategoryLink(url);
      return;
    }
    onShopGrid();
  };

  return (
    <div className="hd-category-landing-page">
      <div className="hd-cat-breadcrumb hd-category-landing-breadcrumb"><button type="button" onClick={onShopGrid}>Home</button><span>/</span><span>Window Treatments</span></div>

      <section className="hd-category-sponsored-banner hd-sponsored-veneta-banner" aria-label="Sponsored window treatment promotion">
        <button type="button" className="hd-sponsored-arrow" aria-label="Previous sponsored promotion"><ChevronRight size={17} /></button>
        <div className="hd-sponsored-brand-block hd-sponsored-veneta-brand-block">
          <span>{topSponsoredBanner.label}</span>
          <div className="hd-veneta-logo-frame">
            {topLogoImage ? <img src={imgSrc(topLogoImage)} alt={topSponsoredBanner.brand} className="hd-veneta-logo" /> : <div className="hd-veneta-logo-placeholder">VENETA Logo</div>}
          </div>
        </div>
        <div className="hd-sponsored-message hd-sponsored-veneta-message">{topSponsoredBanner.headline}</div>
        <button type="button" className="hd-sponsored-shop" onClick={() => handleBannerCta(topSponsoredBanner.ctaUrl)}>{topSponsoredBanner.cta}</button>
        <div className="hd-sponsored-image"><CategoryImage src={bannerImage} alt={topSponsoredBanner.imageAlt} /></div>
      </section>

      <div className="hd-category-landing-layout">
        <aside className="hd-category-left-rail" aria-label="Window treatment categories">
          <h1 className="hd-category-landing-title">WINDOW TREATMENTS</h1>
          <nav className="hd-category-side-nav">
            {navSections.map((section, sectionIndex) => (
              <div className="hd-category-nav-section" key={`${section.title || "top"}-${sectionIndex}`}>
                {section.title ? <h2>{section.title}</h2> : null}
                {section.links.map((link) => <button type="button" key={link} onClick={() => handleCategoryLinkClick(link)}>{link}</button>)}
              </div>
            ))}
          </nav>
          <aside className="hd-category-side-ad" aria-label="Sponsored VENETA promotion">
            <div className="hd-category-side-ad-strip" aria-hidden="true" />
            <div className="hd-category-side-ad-image"><CategoryImage src={sideAdImage} alt={sideSponsoredBanner.imageAlt} /></div>
            <span>{sideSponsoredBanner.label}</span>
            {sideLogoImage ? <div className="hd-side-logo-frame"><img src={imgSrc(sideLogoImage)} alt={sideSponsoredBanner.brand} className="hd-side-logo-image" /></div> : <strong><span className="hd-mini-veneta-mark">◢</span>{sideSponsoredBanner.brand}</strong>}
            <h2>{sideSponsoredBanner.headline}</h2>
            <button type="button" onClick={() => handleBannerCta(sideSponsoredBanner.ctaUrl)}>{sideSponsoredBanner.cta}</button>
          </aside>
        </aside>

        <main className="hd-category-landing-main">
          <section className="hd-category-hero-promo">
            <div className="hd-category-hero-copy">
              <p className="hd-category-hero-kicker">{categoryPage.hero.kicker}</p>
              <h2>{categoryPage.hero.headline}</h2>
              <p>{categoryPage.hero.body}</p>
              <button type="button" onClick={onShopGrid}>{categoryPage.hero.ctaText}</button>
            </div>
            <div className="hd-category-hero-image"><CategoryImage src={heroImage} alt="Custom blinds and shades promotion" /></div>
            <div className="hd-category-carousel-control"><ChevronRight size={18} className="hd-category-prev" /><span>1/2</span><ChevronRight size={18} /></div>
          </section>

          <section className="hd-category-module hd-category-feature-module">
            <div className="hd-category-module-heading-row"><h2>CHOOSE YOUR BLINDS OR SHADES</h2></div>
            <div className="hd-category-feature-grid">
              {featureCards.map((card) => (
                <article className="hd-category-feature-card" key={card.title}>
                  <button type="button" className="hd-category-image-action hd-category-feature-image" onClick={() => handleCategoryLinkClick(card.filterLabel)} aria-label={`Shop ${card.title}`}><CategoryImage src={card.image} alt={card.title} /></button>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                  <button type="button" onClick={() => handleCategoryLinkClick(card.filterLabel)}>Shop Now</button>
                </article>
              ))}
            </div>
            <div className="hd-category-small-carousel"><ChevronRight size={16} className="hd-category-prev" /><span>1/3</span><ChevronRight size={16} /></div>
          </section>

          <section className="hd-category-module">
            <div className="hd-category-module-heading-row"><h2>BLINDS</h2></div>
            <div className="hd-category-strip-grid">
              {blinds.map((item) => (
                <article className="hd-category-small-tile" key={item.name}>
                  <button type="button" className="hd-category-image-action" onClick={() => handleCategoryLinkClick(item.filterLabel)} aria-label={`Shop ${item.name}`}><CategoryImage src={item.image} alt={item.name} /></button>
                  <h3>{item.name}</h3>
                </article>
              ))}
            </div>
            <div className="hd-category-small-carousel"><ChevronRight size={16} className="hd-category-prev" /><span>1/2</span><ChevronRight size={16} /></div>
          </section>

          <section className="hd-category-module">
            <div className="hd-category-module-heading-row"><h2>SHADES</h2></div>
            <div className="hd-category-strip-grid">
              {shades.map((item) => (
                <article className="hd-category-small-tile" key={item.name}>
                  <button type="button" className="hd-category-image-action" onClick={() => handleCategoryLinkClick(item.filterLabel)} aria-label={`Shop ${item.name}`}><CategoryImage src={item.image} alt={item.name} /></button>
                  <h3>{item.name}</h3>
                </article>
              ))}
            </div>
            <div className="hd-category-small-carousel"><ChevronRight size={16} className="hd-category-prev" /><span>1/2</span><ChevronRight size={16} /></div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [mockupSettings, setMockupSettings] = useState(DEFAULT_MOCKUP_SETTINGS);
  const initialGridUrlState = useMemo(() => readGridUrlState(getCurrentAppSearch()), []);
  const [searchQuery, setSearchQuery] = useState(initialGridUrlState.searchQuery);
  const [sort, setSort] = useState(initialGridUrlState.sort);
  const [view, setView] = useState("grid");
  const [hoverEnabled, setHoverEnabled] = useState(DEFAULT_MOCKUP_SETTINGS.hoverEnabled);
  const [showReferenceBorders, setShowReferenceBorders] = useState(DEFAULT_MOCKUP_SETTINGS.showReferenceBorders);
  const [placeholderNonBordered, setPlaceholderNonBordered] = useState(DEFAULT_MOCKUP_SETTINGS.placeholderNonBordered);
  const [editorOpen, setEditorOpen] = useState(false);
  const [compare, setCompare] = useState(new Set());
  const [liked, setLiked] = useState(new Set());
  const [quickView, setQuickView] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [bannerPresets, setBannerPresets] = useState([]);
  const [bannerPresetStatus, setBannerPresetStatus] = useState("");

  const loadBannerPresets = async () => {
    try {
      const res = await fetch(FUNCTION_BANNER_PRESETS_URL);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const payload = await res.json().catch(() => ({}));
      const list = Array.isArray(payload?.presets) ? payload.presets : [];
      setBannerPresets(list);
    } catch (error) {
      console.error("Could not load banner presets", error);
    }
  };

  const saveBannerPreset = async (name) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      setBannerPresetStatus("Enter a name to save the preset.");
      return false;
    }
    setBannerPresetStatus("Saving preset...");
    try {
      const res = await fetch(FUNCTION_BANNER_PRESETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          categoryPage: mergeCategoryPageSettings(mockupSettings.categoryPage)
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Save failed (${res.status})`);
      // Optimistically merge returned preset so the list updates immediately,
      // even if the GET refetch is slow due to Blobs eventual consistency.
      if (payload && payload.preset && payload.preset.id) {
        setBannerPresets((prev) => {
          const next = prev.filter((p) => p.id !== payload.preset.id);
          return [payload.preset, ...next];
        });
      }
      setBannerPresetStatus(`Saved "${cleanName}"`);
      // Refetch shortly after to reconcile with server state.
      setTimeout(() => { loadBannerPresets(); }, 400);
      return true;
    } catch (error) {
      console.error(error);
      const message = error?.message === "Failed to fetch"
        ? "Failed to fetch. Run with npx netlify dev or use the live Netlify site."
        : (error.message || "Save failed");
      setBannerPresetStatus(`Save failed - ${message}`);
      return false;
    }
  };

  const loadBannerPreset = (id) => {
    const preset = bannerPresets.find((p) => String(p.id) === String(id));
    if (!preset) {
      setBannerPresetStatus("Preset not found.");
      return;
    }
    setMockupSettings((prev) => ({
      ...prev,
      categoryPage: mergeCategoryPageSettings(preset.categoryPage)
    }));
    setBannerPresetStatus(`Loaded "${preset.name}"`);
  };

  const deleteBannerPreset = async (id) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this banner preset? This cannot be undone.")) return;
    setBannerPresetStatus("Deleting preset...");
    try {
      const res = await fetch(`${FUNCTION_BANNER_PRESETS_URL}?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Delete failed (${res.status})`);
      setBannerPresetStatus("Preset deleted.");
      await loadBannerPresets();
    } catch (error) {
      console.error(error);
      setBannerPresetStatus(`Delete failed - ${error.message || "unknown error"}`);
    }
  };

  const renameBannerPreset = async (id, name) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    setBannerPresetStatus("Renaming preset...");
    try {
      const res = await fetch(FUNCTION_BANNER_PRESETS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: cleanName })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Rename failed (${res.status})`);
      setBannerPresetStatus(`Renamed to "${cleanName}"`);
      await loadBannerPresets();
    } catch (error) {
      console.error(error);
      setBannerPresetStatus(`Rename failed - ${error.message || "unknown error"}`);
    }
  };

  useEffect(() => { loadBannerPresets(); }, []);

  const [selectedProductPage, setSelectedProductPage] = useState(null);
  const [configuratorProductPage, setConfiguratorProductPage] = useState(null);
  const [showCategoryPage, setShowCategoryPage] = useState(false);
  const [routePath, setRoutePath] = useState(getCurrentAppPath);
  const [activeFilters, setActiveFilters] = useState(initialGridUrlState.activeFilters);
  const [storeTodayOnly, setStoreTodayOnly] = useState(initialGridUrlState.storeTodayOnly);
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(initialGridUrlState.freeDeliveryOnly);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [layoutSnapshot, setLayoutSnapshot] = useState(null);
  const [layoutUiSnapshot, setLayoutUiSnapshot] = useState(null);
  const [layoutHistory, setLayoutHistory] = useState([]);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [layoutLiveMessage, setLayoutLiveMessage] = useState("");
  const [layoutDraggingId, setLayoutDraggingId] = useState(null);
  const [layoutDropTarget, setLayoutDropTarget] = useState(null);

  const loadProducts = async () => {
    try {
      const res = await fetch(FUNCTION_PRODUCTS_URL, { cache: "no-store" });
      const contentType = res.headers.get("content-type") || "";
      const rawBody = await res.text();

      if (!res.ok) {
        throw new Error(`Netlify products function failed (${res.status}): ${rawBody.slice(0, 240)}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`Netlify products function did not return JSON. Content-Type: ${contentType || "unknown"}`);
      }

      const data = rawBody ? JSON.parse(rawBody) : {};
      const productList = normalizeProductsPayload(data);
      const loadedSettings = extractMockupSettings(data, productList);

      if (loadedSettings) setMockupSettings(loadedSettings);

      setProducts(migrateRollerConfiguratorOnce(migrateDrillFreeMountOptionsOnce(productList)));

      if (!productList.length) {
        setSaveStatus("No products saved to Netlify Blobs yet");
        return;
      }

      setSaveStatus("");
    } catch (error) {
      console.error("Could not load products from Netlify Blobs.", error);
      setProducts([]);
      setSaveStatus(`Could not load products from Netlify Blobs: ${error.message}`);
    }
  };

  useEffect(() => { loadProducts().catch((error) => { console.error(error); setSaveStatus("Could not load products.json"); }); }, []);

  useEffect(() => {
    setHoverEnabled(Boolean(mockupSettings.hoverEnabled));
    setShowReferenceBorders(Boolean(mockupSettings.showReferenceBorders));
    setPlaceholderNonBordered(Boolean(mockupSettings.placeholderNonBordered));
  }, [mockupSettings]);

  useEffect(() => {
    setMockupSettings((current) => mergeMockupSettings({
      ...current,
      hoverEnabled,
      showReferenceBorders,
      placeholderNonBordered
    }));
  }, [hoverEnabled, showReferenceBorders, placeholderNonBordered]);

  // Auto-save shared grid/editor settings so all viewers see the same mockup mode.
  useEffect(() => {
    if (!products.length) return;
    const timer = window.setTimeout(async () => {
      try {
        // Re-read the latest saved products first so a stale open tab never overwrites newer edits.
        const latestRes = await fetch(FUNCTION_PRODUCTS_URL, { cache: "no-store" });
        const latestPayload = latestRes.ok ? await latestRes.json() : null;
        const latest = Array.isArray(latestPayload) ? latestPayload : latestPayload?.products;
        if (!Array.isArray(latest) || !latest.length) return;
        await fetch(FUNCTION_PRODUCTS_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(applyMockupSettingsToProducts(latest, mockupSettings))
        });
      } catch (error) {
        console.error("Could not auto-save mockup settings", error);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [mockupSettings]);

  const saveProducts = async () => {
    setSaveStatus("Saving...");
    try {
      const res = await fetch(FUNCTION_PRODUCTS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applyMockupSettingsToProducts(products, mockupSettings))
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Save failed (${res.status})`);
      setSaveStatus(`Saved to Netlify Blobs${payload.count ? ` (${payload.count} products)` : ""}`);
      return true;
    } catch (error) {
      console.error(error);
      const message = error?.message === "Failed to fetch"
        ? "Failed to fetch. Run with npx netlify dev or use the live Netlify site so /.netlify/functions/products is available."
        : (error.message || "run with Netlify Dev or use the live Netlify site");
      setSaveStatus(`Save failed - ${message}`);
      return false;
    }
  };

  const setFilter = (key, value) => {
    setActiveFilters((old) => ({ ...old, [key]: value }));
  };

  const clearFilters = () => {
    setActiveFilters(createEmptyActiveFilters());
    setStoreTodayOnly(false);
    setFreeDeliveryOnly(false);
    setSearchQuery("");
  };

  const scrollToPageTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToAppPath = (path, { replace = false } = {}) => {
    const rawPath = String(path || "/");
    const normalizedPath = normalizeAppPath(rawPath);
    const queryMatch = rawPath.match(/\?[^#]*/);
    const nextUrl = `${normalizedPath}${queryMatch ? queryMatch[0] : ""}`;

    if (typeof window !== "undefined") {
      const currentUrl = `${normalizeAppPath(window.location.pathname)}${window.location.search || ""}`;
      if (currentUrl !== nextUrl) {
        const method = replace ? "replaceState" : "pushState";
        window.history[method]({}, "", nextUrl);
      }
    }

    setRoutePath(normalizedPath);
  };

  const showGridPage = () => {
    setShowCategoryPage(false);
    setSelectedProductPage(null);
    setConfiguratorProductPage(null);
  };

  const findRouteProduct = (productModel) => {
    const key = String(productModel || "").trim();
    return products.find((product) => String(product.model || "").trim() === key)
      || products.find((product) => !String(product.model || "").trim() && String(product.id) === key);
  };

  const openCategoryLandingPage = () => {
    navigateToAppPath(CATEGORY_LANDING_PATH);
    setShowCategoryPage(true);
    setSelectedProductPage(null);
    setConfiguratorProductPage(null);
    scrollToPageTop();
  };

  const returnToCategoryGridPage = () => {
    navigateToAppPath(CATEGORY_GRID_PATH);
    showGridPage();
    scrollToPageTop();
  };

  const openCategoryGridPage = () => {
    navigateToAppPath(CATEGORY_GRID_PATH);
    showGridPage();
    clearFilters();
    scrollToPageTop();
  };

  const applyGridStateFromUrl = (search = getCurrentAppSearch()) => {
    const nextGridState = readGridUrlState(search);
    setActiveFilters(nextGridState.activeFilters);
    setStoreTodayOnly(nextGridState.storeTodayOnly);
    setFreeDeliveryOnly(nextGridState.freeDeliveryOnly);
    setSearchQuery(nextGridState.searchQuery);
    setSort(nextGridState.sort);
  };

  const openCategoryGridPageWithFilter = (label) => {
    const categoryOptions = Array.from(new Set(products.map((product) => product?.category).filter(Boolean)));
    const { activeFilters: nextFilters, searchQuery: nextSearchQuery } = getCategoryFilterForLink(label, categoryOptions);
    const nextGridState = { activeFilters: nextFilters, storeTodayOnly: false, freeDeliveryOnly: false, searchQuery: nextSearchQuery, sort: DEFAULT_GRID_SORT };
    navigateToAppPath(getGridRoutePathFromState(nextGridState));
    showGridPage();
    setActiveFilters(nextFilters);
    setStoreTodayOnly(false);
    setFreeDeliveryOnly(false);
    setSearchQuery(nextSearchQuery);
    setSort(DEFAULT_GRID_SORT);
    scrollToPageTop();
  };

  const openCategoryLandingLink = (url) => {
    const destination = String(url || "").trim();
    if (!destination) {
      openCategoryGridPage();
      return;
    }

    if (/^https?:\/\//i.test(destination)) {
      if (typeof window !== "undefined") window.location.assign(destination);
      return;
    }

    if (destination.startsWith("/")) {
      navigateToAppPath(destination);
      scrollToPageTop();
      return;
    }

    openCategoryGridPage();
  };

  const openConfiguratorPage = (product) => {
    if (!product) return;
    navigateToAppPath(getConfiguratorRoutePath(product));
    setShowCategoryPage(false);
    setSelectedProductPage(null);
    setConfiguratorProductPage(product);
    scrollToPageTop();
  };

  const restoreLayoutUiSnapshot = (snapshot = layoutUiSnapshot) => {
    if (!snapshot) return;
    setActiveFilters(snapshot.activeFilters);
    setStoreTodayOnly(snapshot.storeTodayOnly);
    setFreeDeliveryOnly(snapshot.freeDeliveryOnly);
    setSearchQuery(snapshot.searchQuery);
    setSort(snapshot.sort);
    setView(snapshot.view);
  };

  const startLayoutEdit = () => {
    setLayoutSnapshot(products);
    setLayoutUiSnapshot({ activeFilters, storeTodayOnly, freeDeliveryOnly, searchQuery, sort, view });
    setLayoutHistory([]);
    setSaveStatus("");
    setLayoutLiveMessage("Rearrange mode started. Search, filters, and sorting are paused while you reorder the full product grid.");
    setActiveFilters(createEmptyActiveFilters());
    setStoreTodayOnly(false);
    setFreeDeliveryOnly(false);
    setSearchQuery("");
    setSort("top");
    setView("grid");
    setLayoutEditMode(true);
    setLayoutDirty(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelLayoutEdit = () => {
    if (layoutSnapshot) setProducts(layoutSnapshot);
    restoreLayoutUiSnapshot();
    setLayoutEditMode(false);
    setLayoutSnapshot(null);
    setLayoutUiSnapshot(null);
    setLayoutHistory([]);
    setLayoutDirty(false);
    setLayoutLiveMessage("Rearrange canceled. Previous view restored.");
    setLayoutDraggingId(null);
    setLayoutDropTarget(null);
  };

  const saveLayout = async () => {
    if (!layoutDirty || saveStatus === "Saving...") return;
    const saved = await saveProducts();
    if (!saved) {
      setLayoutLiveMessage("Save failed. Your layout changes are still on screen so you can retry.");
      return;
    }
    setLayoutEditMode(false);
    setLayoutSnapshot(null);
    setLayoutUiSnapshot(null);
    setLayoutHistory([]);
    setLayoutDirty(false);
    setLayoutLiveMessage("Layout saved. Top Sellers order updated.");
    setLayoutDraggingId(null);
    setLayoutDropTarget(null);
    setSort("top");
    setView("grid");
  };

  const reorderProducts = (list, dragId, targetId, position = "before") => {
    if (!dragId || !targetId || String(dragId) === String(targetId)) return list;
    const sourceIndex = list.findIndex((p) => String(p.id) === String(dragId));
    if (sourceIndex < 0) return list;
    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    const targetIndex = next.findIndex((p) => String(p.id) === String(targetId));
    if (targetIndex < 0) return list;
    const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
    next.splice(insertIndex, 0, moved);
    const changed = next.some((item, index) => String(item.id) !== String(list[index]?.id));
    return changed ? next : list;
  };

  const applyLayoutOrder = (updater, getMessage) => {
    const next = updater(products);
    if (next === products) return;
    const movedProduct = next.find((item, index) => String(item.id) !== String(products[index]?.id));
    setLayoutHistory((history) => [products, ...history].slice(0, 30));
    setProducts(next);
    setLayoutDirty(true);
    const message = typeof getMessage === "function" ? getMessage(next, products, movedProduct) : "Product order updated.";
    setLayoutLiveMessage(message);
  };

  const moveLayoutProductTo = (dragId, targetId, position = "before") => {
    applyLayoutOrder(
      (prev) => reorderProducts(prev, dragId, targetId, position),
      (next) => {
        const moved = next.find((p) => String(p.id) === String(dragId));
        const newIndex = next.findIndex((p) => String(p.id) === String(dragId));
        return `${moved?.name || "Product"} moved to position ${newIndex + 1} of ${next.length}.`;
      }
    );
  };

  const moveLayoutProductByAction = (productId, action) => {
    applyLayoutOrder((prev) => {
      const index = prev.findIndex((p) => String(p.id) === String(productId));
      if (index < 0) return prev;
      let targetIndex = index;
      if (action === "up") targetIndex = Math.max(0, index - 1);
      if (action === "down") targetIndex = Math.min(prev.length - 1, index + 1);
      if (action === "top") targetIndex = 0;
      if (action === "bottom") targetIndex = prev.length - 1;
      if (targetIndex === index) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    }, (next) => {
      const moved = next.find((p) => String(p.id) === String(productId));
      const newIndex = next.findIndex((p) => String(p.id) === String(productId));
      return `${moved?.name || "Product"} moved to position ${newIndex + 1} of ${next.length}.`;
    });
  };

  const undoLayoutMove = () => {
    setLayoutHistory((history) => {
      if (!history.length) return history;
      const [previous, ...rest] = history;
      setProducts(previous);
      setLayoutDirty(rest.length > 0 || (layoutSnapshot ? previous.some((item, index) => String(item.id) !== String(layoutSnapshot[index]?.id)) : false));
      setLayoutLiveMessage("Last rearrange move undone.");
      return rest;
    });
    setLayoutDraggingId(null);
    setLayoutDropTarget(null);
  };

  const resetLayoutEdit = () => {
    if (!layoutSnapshot) return;
    setLayoutHistory((history) => [products, ...history].slice(0, 30));
    setProducts(layoutSnapshot);
    setLayoutDirty(false);
    setLayoutLiveMessage("Layout reset to the order from when Rearrange mode started.");
    setLayoutDraggingId(null);
    setLayoutDropTarget(null);
  };

  const handleLayoutDragStart = (event, product) => {
    setLayoutDraggingId(product.id);
    setLayoutDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(product.id));
  };

  const handleLayoutDragOver = (event, product) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (typeof window !== "undefined") {
      const edgeSize = 110;
      if (event.clientY < edgeSize) window.scrollBy({ top: -18, behavior: "auto" });
      if (window.innerHeight - event.clientY < edgeSize) window.scrollBy({ top: 18, behavior: "auto" });
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const horizontalPosition = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    const verticalBias = Math.abs(event.clientY - (rect.top + rect.height / 2)) > rect.height * 0.35
      ? (event.clientY < rect.top + rect.height / 2 ? "before" : "after")
      : horizontalPosition;
    setLayoutDropTarget({ id: product.id, position: verticalBias });
  };

  const handleLayoutDrop = (event, product) => {
    event.preventDefault();
    const dragId = event.dataTransfer.getData("text/plain") || layoutDraggingId;
    const position = layoutDropTarget?.id === product.id ? layoutDropTarget.position : "before";
    moveLayoutProductTo(dragId, product.id, position);
    setLayoutDraggingId(null);
    setLayoutDropTarget(null);
  };

  const handleLayoutDragEnd = () => {
    setLayoutDraggingId(null);
    setLayoutDropTarget(null);
  };

  const fieldOptions = useMemo(() => {
    const unique = (field) => Array.from(new Set(products.map((p) => p[field]).filter(Boolean))).sort();
    return {
      category: unique("category"),
      brand: Array.from(new Set([...FILTER_GROUPS[2].options, ...unique("brand")])).sort(),
      lift: unique("lift"),
      shopType: SHOP_TYPE_OPTIONS,
      included: Array.from(new Set(products.flatMap((p) => [p.included, p.feature, p.light].filter(Boolean)))).sort(),
      features: Array.from(new Set(products.flatMap((p) => [p.features, p.light, p.lift].flat().filter(Boolean)))).sort(),
      event: ["Special Buy", "Best Seller", "Custom Order"]
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim();
    const matches = (value, filter) => !filter || normalizeSearchText(value) === normalizeSearchText(filter);
    const includesText = (value, filter) => !filter || searchTextMatches(value, filter);

    const result = products.filter((p) => {
      const haystack = [p.name, p.brand, p.category, p.light, p.model, p.lift, p.badge, p.features, p.feature, p.included, p.promo, p.shopType, p.description].flat().join(" ");
      if (q && !searchTextMatches(haystack, q)) return false;
      if (!matches(p.category, activeFilters.category)) return false;
      if (!matches(p.brand, activeFilters.brand)) return false;
      if (!matches(p.lift, activeFilters.lift)) return false;
      if (activeFilters.shopType && normalizeShopType(p.shopType) !== activeFilters.shopType) return false;
      if (activeFilters.included && !includesText([p.included, p.feature, p.light].join(" "), activeFilters.included)) return false;
      if (activeFilters.features && !includesText([p.features, p.light, p.lift].flat().join(" "), activeFilters.features)) return false;
      if (activeFilters.event && !includesText([p.badge, p.promo].join(" "), activeFilters.event)) return false;
      if (storeTodayOnly && !isStoreTodayShopType(p.shopType)) return false;
      if (freeDeliveryOnly && p.delivery === false) return false;
      return true;
    });

    const sorted = [...result];
    if (sort === "price-low") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-high") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "rating") sorted.sort((a, b) => Number(b.rating) - Number(a.rating));
    if (sort === "reviews") sorted.sort((a, b) => Number(b.reviews) - Number(a.reviews));
    // Top Sellers preserves products.json order so the grid and editor list stay aligned.
    return sorted;
  }, [products, searchQuery, sort, activeFilters, storeTodayOnly, freeDeliveryOnly]);

  const openProductPage = (product) => {
    if (!product) return;
    navigateToAppPath(getProductRoutePath(product));
    setShowCategoryPage(false);
    setSelectedProductPage(product);
    setConfiguratorProductPage(null);
    scrollToPageTop();
  };

  useEffect(() => {
    if (layoutEditMode || normalizeAppPath(routePath) !== CATEGORY_GRID_PATH) return;
    navigateToAppPath(getGridRoutePathFromState({ activeFilters, storeTodayOnly, freeDeliveryOnly, searchQuery, sort }), { replace: true });
  }, [activeFilters, storeTodayOnly, freeDeliveryOnly, searchQuery, sort, routePath, layoutEditMode]);

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = getCurrentAppPath();
      setRoutePath(nextPath);
      if (nextPath === CATEGORY_GRID_PATH) applyGridStateFromUrl(getCurrentAppSearch());
    };
    if (typeof window !== "undefined") window.addEventListener("popstate", handlePopState);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const route = parseAppRoute(routePath);

    if (route.replacePath) {
      navigateToAppPath(route.replacePath, { replace: true });
      return;
    }

    if (route.type === "category") {
      setShowCategoryPage(true);
      setSelectedProductPage(null);
      setConfiguratorProductPage(null);
      return;
    }

    if (route.type === "grid") {
      applyGridStateFromUrl(getCurrentAppSearch());
      showGridPage();
      return;
    }

    let routeProduct = findRouteProduct(route.productModel);
    const activeRouteProduct = route.type === "configurator" ? configuratorProductPage : selectedProductPage;

    if (!routeProduct && activeRouteProduct) {
      routeProduct = products.find((product) => String(product.id) === String(activeRouteProduct.id));
    }

    if (!routeProduct) {
      if (products.length) {
        navigateToAppPath(CATEGORY_GRID_PATH, { replace: true });
        showGridPage();
      }
      return;
    }

    const currentRouteKey = String(route.productModel || "").trim();
    const latestRouteKey = getProductRouteKey(routeProduct);
    if (latestRouteKey && latestRouteKey !== currentRouteKey) {
      navigateToAppPath(route.type === "configurator" ? getConfiguratorRoutePath(routeProduct) : getProductRoutePath(routeProduct), { replace: true });
    }

    setShowCategoryPage(false);
    if (route.type === "configurator") {
      setSelectedProductPage(null);
      setConfiguratorProductPage(routeProduct);
    } else {
      setSelectedProductPage(routeProduct);
      setConfiguratorProductPage(null);
    }
  }, [routePath, products, selectedProductPage, configuratorProductPage]);

  const selectedProduct = selectedProductPage ? (products.find((p) => String(p.id) === String(selectedProductPage.id)) || selectedProductPage) : null;
  const configuratorProduct = configuratorProductPage ? (products.find((p) => String(p.id) === String(configuratorProductPage.id)) || configuratorProductPage) : null;
  const categoryPageSettings = mergeCategoryPageSettings(mockupSettings.categoryPage);
  useEffect(() => {
    if (!selectedProductPage) return;
    const latest = products.find((p) => p.id === selectedProductPage.id);
    if (latest && latest !== selectedProductPage) setSelectedProductPage(latest);
  }, [products, selectedProductPage]);

  useEffect(() => {
    if (!configuratorProductPage) return;
    const latest = products.find((p) => p.id === configuratorProductPage.id);
    if (latest && latest !== configuratorProductPage) setConfiguratorProductPage(latest);
  }, [products, configuratorProductPage]);

  const FilterSelect = ({ label, value, onChange, options }) => (
    <label className="hd-filter-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={16} />
    </label>
  );

  return (
    <div className="hd-root">
      <style>{CSS}</style>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} openEditor={() => setEditorOpen(true)} compareCount={compare.size} />
      <main className={selectedProduct || configuratorProduct ? "page" : showCategoryPage ? "page hd-category-landing-shell" : "page category-screenshot-page"}>
        {configuratorProduct ? (
          <ProductConfigurator
            product={configuratorProduct}
            configuratorSchema={getProductConfiguratorSchema(configuratorProduct)}
            onBack={returnToCategoryGridPage}
            onReturnToPdp={() => openProductPage(configuratorProduct)}
          />
        ) : selectedProduct ? <ProductDetailPage product={selectedProduct} onBack={returnToCategoryGridPage} onCustomize={() => openConfiguratorPage(selectedProduct)} /> : showCategoryPage ? (
          <CategoryLandingPage products={products} onShopGrid={openCategoryGridPage} onCategoryLink={openCategoryLandingLink} onNavigateCategoryFilter={openCategoryGridPageWithFilter} categoryPageSettings={categoryPageSettings} />
        ) : <>
          <div className="hd-cat-breadcrumb"><button type="button" className="pdp-shot-back-button hd-cat-page-button" onClick={openCategoryLandingPage}><ArrowLeft size={14} /> Category Page</button><span>/</span><button type="button" onClick={clearFilters}>Home</button><span>/</span><span>Window Treatments</span></div>
          <section className="hd-cat-title-block hd-cat-title-grid">
            <div>
              <h1>WINDOW TREATMENTS</h1>
              <p><b>{filteredProducts.length}</b> results</p>
            </div>
            <div className={`hd-grid-tools ${layoutEditMode ? "is-editing" : ""}`}>
              <div className="hd-grid-tools-label">Grid Tools</div>
              {!layoutEditMode ? (
                <div className="hd-grid-tools-controls">
                  <label className="hd-hover-chip"><input type="checkbox" checked={hoverEnabled} onChange={(e) => setHoverEnabled(e.target.checked)} /> Hover Preview</label>
                  <label className="hd-hover-chip hd-reference-chip"><input type="checkbox" checked={showReferenceBorders} onChange={(e) => setShowReferenceBorders(e.target.checked)} /> Reference Border</label>
                  <button type="button" className="hd-layout-edit-button" onClick={startLayoutEdit}>Rearrange</button>
                </div>
              ) : (
                <div className="hd-layout-edit-controls">
                  <span>{layoutDirty ? "Unsaved changes" : "Drag handles or use card controls"}</span>
                  <button type="button" className="hd-layout-undo" onClick={undoLayoutMove} disabled={!layoutHistory.length}>Undo</button>
                  <button type="button" className="hd-layout-save" onClick={saveLayout} disabled={!layoutDirty || saveStatus === "Saving..."}>{saveStatus === "Saving..." ? "Saving..." : "Save Layout"}</button>
                  <button type="button" className="hd-layout-cancel" onClick={cancelLayoutEdit}>Cancel</button>
                  <span className="layout-sr-live" aria-live="polite">{layoutLiveMessage}</span>
                </div>
              )}
            </div>
          </section>

          <section className="hd-cat-filter-area">
            <div className="hd-cat-filter-row">
              <button type="button" className="hd-all-filters" onClick={clearFilters}><Menu size={20} /> All Filters</button>
              <FilterSelect label="Category" value={activeFilters.category} onChange={(value) => setFilter("category", value)} options={fieldOptions.category} />
              <FilterSelect label="Shop Type" value={activeFilters.shopType} onChange={(value) => setFilter("shopType", value)} options={fieldOptions.shopType} />
              <FilterSelect label="Lift Systems" value={activeFilters.lift} onChange={(value) => setFilter("lift", value)} options={fieldOptions.lift} />
              <FilterSelect label="Included" value={activeFilters.included} onChange={(value) => setFilter("included", value)} options={fieldOptions.included} />
              <FilterSelect label="Features" value={activeFilters.features} onChange={(value) => setFilter("features", value)} options={fieldOptions.features} />
              <FilterSelect label="Brand" value={activeFilters.brand} onChange={(value) => setFilter("brand", value)} options={fieldOptions.brand} />
              <FilterSelect label="The Home Depot Events" value={activeFilters.event} onChange={(value) => setFilter("event", value)} options={fieldOptions.event} />
            </div>

            <div className="hd-cat-chip-sort-row">
              <div className="hd-cat-chips">
                <button type="button" className={storeTodayOnly ? "hd-fast-chip active" : "hd-fast-chip"} onClick={() => setStoreTodayOnly((v) => !v)}><Store size={22} /> In Stock at Store Today</button>
                <button type="button" className={freeDeliveryOnly ? "hd-fast-chip active" : "hd-fast-chip"} onClick={() => setFreeDeliveryOnly((v) => !v)}><Truck size={22} /> Free 1-2 Day Delivery</button>
              </div>

              

              <label className="hd-sort-control"><span>Sort by</span><select value={sort} onChange={(e) => setSort(e.target.value)} disabled={layoutEditMode}><option value="top">Top Sellers</option><option value="price-low">Price Low to High</option><option value="price-high">Price High to Low</option><option value="rating">Top Rated</option><option value="reviews">Most Reviewed</option></select><ChevronDown size={17} /></label>
            </div>          </section>


          <section className="products-section hd-products-section">
            <div className={view === "grid" ? "product-grid hd-category-grid" : "product-list hd-category-list"}>
              {filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} hoverEnabled={hoverEnabled} showReferenceBorders={showReferenceBorders} placeholderNonBordered={placeholderNonBordered} layoutEditMode={layoutEditMode} layoutIndex={index} layoutTotal={filteredProducts.length} layoutDraggingId={layoutDraggingId} layoutDropTarget={layoutDropTarget} onLayoutDragStart={handleLayoutDragStart} onLayoutDragEnd={handleLayoutDragEnd} onLayoutDragOver={handleLayoutDragOver} onLayoutDrop={handleLayoutDrop} onLayoutMove={moveLayoutProductByAction} view={view} compare={compare} setCompare={setCompare} liked={liked} setLiked={setLiked} setQuickView={setQuickView} openProductPage={openProductPage} />)}
            </div>
          </section>
        </>}
      </main>
      {editorOpen && <EditorPanel products={products} displayProducts={configuratorProduct ? [configuratorProduct] : selectedProduct ? [selectedProduct] : filteredProducts} editorMode={configuratorProduct ? "configurator" : selectedProduct ? "product" : showCategoryPage ? "category" : "grid"} setProducts={setProducts} onClose={() => setEditorOpen(false)} saveProducts={saveProducts} saveStatus={saveStatus} reloadProducts={loadProducts} placeholderNonBordered={placeholderNonBordered} setPlaceholderNonBordered={setPlaceholderNonBordered} mockupSettings={mockupSettings} setMockupSettings={setMockupSettings} bannerPresets={bannerPresets} bannerPresetStatus={bannerPresetStatus} saveBannerPreset={saveBannerPreset} loadBannerPreset={loadBannerPreset} deleteBannerPreset={deleteBannerPreset} renameBannerPreset={renameBannerPreset} reloadBannerPresets={loadBannerPresets} />}
      {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} onOpenProduct={openProductPage} />}
    </div>
  );
}

const CSS = `
.hd-root, .hd-root * { box-sizing: border-box; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
body { margin: 0; background: #f3f3f3; color: #222; }
button, input, select { font: inherit; }
button { cursor: pointer; }
.hd-header { position: sticky; top: 0; z-index: 40; background: #fff; color: #333; border-bottom: 1px solid #d8d8d8; }
.top-strip { text-align: center; font-size: 13px; padding: 4px 0; background: #f96302; color: #fff; }
.main-header { max-width: 1500px; margin: 0 auto; display: flex; align-items: center; gap: 12px; padding: 8px 16px; }
.hd-logo-wrap { width: 64px; height: 64px; background: #fff; padding: 6px; flex: 0 0 auto; }
.custom-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
.department-button, .header-link { background: transparent; border: 0; color: #333; display: flex; align-items: center; gap: 6px; font-weight: 700; padding: 10px 6px; }
.search-wrap { position: relative; flex: 1; }
.search-wrap input { width: 100%; height: 42px; border: 1px solid #bbb; padding: 0 54px 0 12px; outline: 0; color: #222; background: #f3f3f3; }
.search-icon { position: absolute; right: 0; top: 0; width: 46px; height: 42px; padding: 11px 13px; box-sizing: border-box; background: #f96302; color: #fff; border-left: 1px solid #c75300; }
.editor-button { background: #222; color: white; border: 0; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
.cart-link { position: relative; }
.cart-badge { position: absolute; top: 0; right: -8px; background: #000; color: #fff; border-radius: 50%; font-size: 10px; padding: 2px 5px; }
.page { max-width: 1500px; margin: 0 auto; padding: 16px; }
.breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; margin-bottom: 12px; }
.category-hero { background: #fff; border: 1px solid #d8d8d8; margin-bottom: 16px; }
.category-title { padding: 14px 16px; }
.category-title h1 { margin: 0; font-size: 32px; line-height: 1.1; }
.category-title div { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; font-size: 14px; color: #555; }
.results-toolbar { background: #fff; border: 1px solid #d8d8d8; padding: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.results-toolbar p { margin: 0; color: #666; font-size: 12px; }
.toolbar-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.toolbar-actions select, .hover-toggle { height: 38px; border: 1px solid #bbb; background: #fff; padding: 0 10px; display: flex; align-items: center; gap: 6px; }
.view-buttons { display: flex; border: 1px solid #bbb; }
.view-buttons button { border: 0; background: #fff; padding: 9px; }
.view-buttons button.active { background: #333; color: #fff; }
.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-left: 1px solid #d9d9d9; border-top: 1px solid #d9d9d9; }
.product-list { display: grid; gap: 12px; }
.product-card { position: relative; background: #fff; border-right: 1px solid #d9d9d9; border-bottom: 1px solid #d9d9d9; }
.product-grid .product-card:nth-child(3)::after { content: ""; position: absolute; inset: 0; border: 5px solid #f96302; pointer-events: none; z-index: 5; }
.product-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.12); z-index: 4; }
.list-card { display: grid; grid-template-columns: 260px 1fr; border: 1px solid #d9d9d9; }
.clickable { cursor: pointer; }
.product-image { position: relative; aspect-ratio: 1 / 1; overflow: hidden; background: #fff; }
.product-image.compact { aspect-ratio: 4 / 3; }
.product-image img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 16px; transition: 0.25s ease; }
.hover-img { opacity: 0; }
.product-card:hover .primary-img.can-hover { opacity: 0; transform: scale(1.025); }
.product-card:hover .hover-img.can-hover { opacity: 1; transform: scale(1.025); }
.hover-label { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.75); color: #fff; font-size: 10px; padding: 4px 6px; opacity: 0; }
.product-card:hover .hover-label { opacity: 1; }
.missing-image { position: absolute; inset: 16px; border: 1px dashed #bbb; color: #777; display: flex; align-items: center; justify-content: center; font-weight: 700; background: #fafafa; }
.product-info { padding: 12px; display: flex; min-height: 330px; flex-direction: column; }
.badge-row { display: flex; justify-content: space-between; gap: 8px; }
.product-badge { background: #333; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 5px 7px; }
.heart-button { border: 0; background: transparent; color: #666; }
.liked { fill: #f96302; color: #f96302; }
.rating { margin-top: 8px; display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; }
.stars { display: flex; color: #f96302; }
.filled-star { fill: #f96302; }
.model { margin-top: 4px; color: #666; font-size: 11px; font-weight: 600; }
.product-title { font-size: 14px; font-weight: 400; line-height: 1.3; min-height: 64px; margin: 8px 0 0; }
.clickable-title { cursor: pointer; }
.clickable-title:hover { color: #f96302; text-decoration: underline; }
.price-area { margin-top: 10px; }
.starting { color: #777; font-size: 11px; text-transform: uppercase; font-weight: 700; }
.price { display: flex; align-items: flex-start; color: #222; }
.currency, .cents { font-size: 17px; font-weight: 700; padding-top: 5px; }
.dollars { font-size: 38px; line-height: 0.95; font-weight: 700; }
.stock-price-range { display: flex; align-items: flex-start; flex-wrap: nowrap; gap: 4px; color: #222; }
.stock-price-dash { font-size: 28px; line-height: 1; font-weight: 700; padding-top: 3px; margin: 0 1px; }
.stock-price-custom { font-size: 30px; line-height: 1; font-weight: 700; letter-spacing: -0.8px; }
.price.compact-price .currency,
.price.compact-price .cents { font-size: 17px; padding-top: 5px; }
.price.compact-price .dollars { font-size: 38px; }
.was { color: #777; font-size: 12px; }
.was span { text-decoration: line-through; }
.promo { color: #357a20; font-size: 12px; font-weight: 700; margin-top: 3px; }
.fulfillment { margin-top: 10px; display: grid; gap: 4px; font-size: 12px; font-weight: 700; color: #333; }
.fulfillment div { display: flex; align-items: center; gap: 5px; }
.fulfillment svg { color: #237804; }
.card-actions { margin-top: auto; padding-top: 12px; }
.build-button { width: 100%; background: #f96302; color: #fff; border: 0; padding: 10px; font-weight: 700; }
.lower-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12px; }
.lower-actions button { border: 0; background: transparent; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
.editor-overlay, .quick-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 80; }
.editor-overlay { display: flex; justify-content: flex-end; }
.editor-panel { background: #fff; width: min(780px, 100%); height: 100%; overflow-y: auto; box-shadow: -8px 0 25px rgba(0,0,0,0.25); }
.editor-header { position: sticky; top: 0; z-index: 2; background: #fff; border-bottom: 1px solid #ddd; padding: 18px; display: flex; justify-content: space-between; gap: 12px; }
.editor-header h2 { margin: 4px 0; font-size: 26px; }
.editor-header p { margin: 0; color: #666; font-size: 14px; }
.editor-header code { background: #f3f3f3; padding: 2px 4px; }
.editor-header button { background: transparent; border: 0; }
.editor-kicker { color: #f96302; font-size: 12px; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
.editor-actions { padding: 14px 18px; display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #ddd; }
.editor-actions button { border: 0; padding: 9px 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.orange-action, .save-action { background: #f96302; color: #fff; }
.secondary-action { background: #f1f1f1; color: #222; }
.save-status { align-self: center; font-size: 13px; font-weight: 700; }
.editor-list { padding: 18px; display: grid; gap: 14px; }
.editor-card { border: 1px solid #ddd; background: #fafafa; padding: 12px; display: grid; grid-template-columns: 140px 1fr; gap: 14px; }
.editor-preview .product-image { border: 1px solid #ddd; }
.remove-button { width: 100%; margin-top: 8px; background: #fff; border: 1px solid #e5b9b9; color: #a40000; padding: 7px; font-weight: 700; display: inline-flex; justify-content: center; gap: 4px; }
.editor-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.editor-fields label { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; }
.editor-fields input, .editor-fields select { width: 100%; height: 38px; margin-top: 4px; border: 1px solid #bbb; padding: 0 8px; background: #fff; color: #222; text-transform: none; }
.editor-fields .wide { grid-column: 1 / -1; }
.upload-row { margin-top: 6px; display: flex; align-items: center; gap: 6px; text-transform: none; font-weight: 600; color: #333; }
.upload-row input { height: auto; border: 0; padding: 0; }
.quick-overlay { display: flex; align-items: center; justify-content: center; padding: 18px; }
.quick-panel { background: #fff; width: min(980px, 100%); max-height: 92vh; overflow-y: auto; }
.quick-head { padding: 14px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; }
.quick-head button { border: 0; background: transparent; }
.quick-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; padding: 22px; }
.quick-image { position: relative; background: #f7f7f7; border: 1px solid #ddd; min-height: 450px; }
.quick-image img { width: 100%; height: 100%; max-height: 560px; object-fit: contain; padding: 18px; }
.quick-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.quick-tabs button { border: 1px solid #bbb; background: #fff; padding: 8px 12px; font-weight: 700; }
.quick-tabs button.active { background: #333; color: #fff; }
.pdp-wrap { background: #fff; border: 1px solid #d8d8d8; padding: 20px 24px; }
.pdp-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555; margin-bottom: 16px; flex-wrap: wrap; }
.pdp-back-link { background: transparent; border: 0; color: #f96302; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; padding: 0; font-size: 12px; }
.pdp-back-link:hover { text-decoration: underline; }
.pdp-crumb-sep { color: #bbb; }
.pdp-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; }
.pdp-gallery {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.pdp-gallery:focus-visible { outline: 3px solid rgba(249, 99, 2, 0.24); outline-offset: 4px; }
.pdp-thumbs { display: flex; flex-direction: column; gap: 10px; max-height: 620px; overflow-y: auto; padding-right: 2px; }
.pdp-thumb {
  position: relative;
  width: 78px;
  height: 78px;
  border: 1px solid #d8d8d8;
  background: #fff;
  padding: 4px;
  cursor: pointer;
  border-radius: 2px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.pdp-thumb:hover { border-color: #999; }
.pdp-thumb:focus-visible { outline: 3px solid rgba(249, 99, 2, 0.25); outline-offset: 2px; }
.pdp-thumb.active { border: 2px solid #f96302; box-shadow: inset 0 0 0 1px #fff; }
.pdp-thumb img { width: 100%; height: 100%; object-fit: contain; display: block; }
.pdp-thumb-blank { width: 100%; height: 100%; background: #f4f4f4; }
.pdp-hero-wrap { min-width: 0; }
.pdp-hero-wrap-empty { grid-column: 1 / -1; }
.pdp-hero {
  border: 1px solid #d8d8d8;
  background: #fff;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.pdp-hero img { width: 100%; height: 100%; object-fit: contain; padding: 28px; display: block; }
.pdp-hero-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border: 1px solid #cfcfcf;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #222;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}
.pdp-hero-arrow:hover { background: #fff; border-color: #999; }
.pdp-hero-arrow:focus-visible { outline: 3px solid rgba(249, 99, 2, 0.25); outline-offset: 2px; }
.pdp-hero-arrow-left { left: 12px; }
.pdp-hero-arrow-right { right: 12px; }
.pdp-image-meta { margin-top: 8px; color: #666; font-size: 12px; font-weight: 700; text-align: right; }
.pdp-info { display: flex; flex-direction: column; }
.pdp-brand-line { color: #555; font-size: 14px; font-weight: 700; }
.pdp-title { margin: 4px 0 8px; font-size: 26px; line-height: 1.2; font-weight: 700; }
.pdp-rating-row { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.pdp-write-review { border: 0; background: transparent; color: #f96302; font-size: 12px; font-weight: 700; text-decoration: none; }
.pdp-write-review:hover { text-decoration: underline; }
.pdp-desc { color: #444; font-size: 14px; line-height: 1.5; margin: 0 0 14px; }
.pdp-badges { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.pdp-badge-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #237804; }
.pdp-swatch-bar { background: #f7f7f7; border: 1px solid #e0e0e0; padding: 14px; margin-bottom: 18px; }
.pdp-swatch-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.pdp-swatch-bar p { margin: 0 0 10px; font-size: 13px; color: #555; }
.pdp-sample-btn { background: #fff; border: 2px solid #f96302; color: #f96302; padding: 9px 16px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
.pdp-price-block { background: #fff8f1; border-left: 4px solid #f96302; padding: 14px; margin-bottom: 18px; }
.pdp-special-buy { color: #f96302; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.pdp-price-row { display: flex; align-items: flex-start; gap: 4px; }
.pdp-price-currency, .pdp-price-cents { font-size: 18px; font-weight: 700; padding-top: 6px; }
.pdp-price-dollars { font-size: 44px; line-height: 0.95; font-weight: 700; }
.pdp-price-was { margin-left: 10px; align-self: center; color: #777; text-decoration: line-through; font-size: 16px; }
.pdp-save-line { color: #357a20; font-weight: 700; font-size: 13px; margin-top: 4px; }
.pdp-credit { color: #444; font-size: 12px; margin-top: 8px; }
.pdp-size-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.pdp-size-field label { display: block; font-size: 12px; font-weight: 700; color: #444; text-transform: uppercase; margin-bottom: 6px; }
.pdp-size-inputs { display: flex; gap: 6px; }
.pdp-size-inputs select { flex: 1; height: 40px; border: 1px solid #bbb; background: #fff; padding: 0 8px; }
.pdp-customize-btn { background: #f96302; color: #fff; border: 0; padding: 14px; font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 8px; }
.pdp-back-btn { background: #fff; border: 1px solid #bbb; color: #333; padding: 12px; font-weight: 700; }
.pdp-model-line { color: #888; font-size: 11px; margin-top: 14px; }
@media (max-width: 1100px) { .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1000px) { .pdp-grid { grid-template-columns: 1fr; gap: 20px; } }
@media (max-width: 820px) { .department-button, .header-link, .view-buttons, .editor-button { display: none; } .main-header { gap: 8px; } .hd-logo-wrap { width: 54px; height: 54px; } .results-toolbar { display: block; } .toolbar-actions { margin-top: 12px; } .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .editor-card { grid-template-columns: 1fr; } .editor-preview { max-width: 180px; } .editor-fields { grid-template-columns: 1fr; } .quick-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) {
  .pdp-wrap { padding: 14px; }
  .pdp-gallery { grid-template-columns: 1fr; }
  .pdp-thumbs { flex-direction: row; overflow-x: auto; overflow-y: hidden; max-height: none; padding-bottom: 4px; }
  .pdp-thumb { flex: 0 0 60px; width: 60px; height: 60px; }
  .pdp-hero img { padding: 18px; }
  .pdp-hero-arrow { width: 38px; height: 38px; }
  .pdp-image-meta { text-align: left; }
  .pdp-title { font-size: 22px; }
  .pdp-size-row { grid-template-columns: 1fr; }
}
@media (max-width: 520px) { .page { padding: 10px; } .product-grid { grid-template-columns: 1fr 1fr; } .product-info { padding: 10px; } .dollars { font-size: 32px; } .product-title { font-size: 13px; } .category-title h1 { font-size: 26px; } }


/* Screenshot-matched Home Depot header + PDP overrides */
.hd-screenshot-header { position: sticky; top: 0; z-index: 40; background: #fff; border-top: 2px solid #111; border-bottom: 1px solid #cfcfcf; }
.hd-credit-row { height: 24px; display: flex; justify-content: flex-end; align-items: center; gap: 14px; padding: 0 20px 0 0; font-size: 13px; color: #555; }
.hd-editor-mini { border: 0; background: #f96302; color: #fff; font-size: 12px; font-weight: 700; text-transform: uppercase; text-decoration: none; padding: 7px 10px; border-radius: 2px; }
.hd-screenshot-main { max-width: 1534px; height: 94px; margin: 0 auto; display: grid; grid-template-columns: 72px 250px minmax(360px, 1fr) auto; align-items: center; gap: 12px; padding: 0 11px; }
.hd-screenshot-main .hd-logo-wrap { width: 60px; height: 60px; padding: 0; background: #f96302; }
.hd-screenshot-main .custom-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
.hd-store-strip { display: flex; align-items: center; gap: 34px; font-size: 14px; color: #111; }
.hd-store-item { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.hd-store-item b { color: #008a00; margin-left: 3px; }
.hd-search-wrap { display: flex; align-items: center; height: 41px; position: static; }
.hd-search-wrap input { flex: 1; width: auto; height: 41px; border: 0; background: #f1f1f1; color: #333; padding: 0 14px; outline: none; }
.hd-search-submit { width: 42px; height: 41px; border: 0; background: #f96302; color: #fff; display: grid; place-items: center; }
.hd-header-icons { display: flex; align-items: center; gap: 23px; }
.hd-nav-icon { border: 0; background: transparent; color: #111; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 47px; padding: 0; position: relative; }
.hd-nav-icon span { font-size: 16px; line-height: 1; font-weight: 400; }
.hd-nav-icon .cart-badge { position: absolute; top: -6px; right: -4px; background: #000; color: #fff; border-radius: 50%; font-size: 10px; padding: 2px 5px; }

.pdp-screenshot-wrap { background: transparent; border: 0; padding: 0; }
.pdp-shot-breadcrumb { height: 43px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: #777; margin: 0; }
.pdp-shot-breadcrumb span { color: #777; }
.pdp-shot-crumb-button { border: 0; background: transparent; color: #246b98; padding: 0; font-size: 14px; }
.pdp-shot-crumb-button:hover { text-decoration: underline; }
.pdp-screenshot-grid { display: grid; grid-template-columns: minmax(640px, 760px) minmax(500px, 562px); gap: 14px; align-items: start; }
.pdp-shot-panel { background: #fff; border: 0; }
.pdp-shot-gallery-panel { padding: 26px 20px 0 24px; }
.pdp-shot-internet-no { font-size: 11px; color: #333; margin: 0 0 9px 13px; }
.pdp-shot-internet-no strong { font-weight: 400; }
.pdp-shot-gallery-layout { display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 16px; min-height: 525px; }
.pdp-shot-thumb-rail { display: flex; flex-direction: column; gap: 10px; }
.pdp-shot-thumb-btn { width: 84px; height: 84px; border: 1px solid #ddd; background: #fff; padding: 2px; position: relative; cursor: pointer; }
.pdp-shot-thumb-btn.active { border: 2px solid #f96302; padding: 1px; }
.pdp-shot-thumb-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pdp-shot-thumb-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.58); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
.pdp-shot-hero-shell { position: relative; outline: none; }
.pdp-shot-hero-stage { height: 506px; background: #a6bcc0; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
.pdp-shot-hero-stage img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pdp-shot-gallery-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgba(0,0,0,.12); background: rgba(255,255,255,.92); color: #555; display: grid; place-items: center; box-shadow: 0 1px 3px rgba(0,0,0,.08); opacity: 0; pointer-events: none; transition: opacity .16s ease; z-index: 2; }
.pdp-shot-hero-shell:hover .pdp-shot-gallery-arrow, .pdp-shot-hero-shell:focus-within .pdp-shot-gallery-arrow { opacity: .9; pointer-events: auto; }
.pdp-shot-gallery-arrow.left { left: 8px; }
.pdp-shot-gallery-arrow.right { right: 8px; }
.pdp-shot-swatch-bar { margin: 8px 0 0 3px; height: 62px; background: #f2f2f2; border-radius: 3px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 14px 0 30px; }
.pdp-shot-swatch-left { display: flex; align-items: center; gap: 12px; }
.pdp-shot-swatch-icon { width: 29px; height: 29px; background: #f96302; transform: rotate(-19deg); border-radius: 3px; position: relative; flex: 0 0 auto; }
.pdp-shot-swatch-icon:after { content: ''; position: absolute; left: 9px; top: 0; bottom: 0; width: 3px; background: #fff; opacity: .95; }
.pdp-shot-swatch-copy strong { display: block; font-size: 16px; color: #28638b; margin-bottom: 4px; }
.pdp-shot-swatch-copy p { margin: 0; color: #111; font-size: 15px; }
.pdp-shot-swatch-btn { width: 227px; height: 32px; border: 1px solid #f96302; color: #f96302; background: #fff; font-weight: 700; }
.pdp-shot-detail-panel { padding: 17px 16px 26px 16px; min-height: 669px; }
.pdp-shot-product-title { font-size: 18px; line-height: 1.45; font-weight: 400; margin: 0 0 2px; color: #333; }
.pdp-shot-brand-line { font-size: 12px; color: #333; margin-bottom: 18px; }
.pdp-shot-brand-line a { color: #333; text-decoration: none; }
.pdp-shot-rating-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 19px; font-size: 12px; }
.pdp-shot-rating-stars { display: inline-flex; align-items: center; gap: 0; }
.pdp-shot-star-wrap { position: relative; width: 20px; height: 20px; display: inline-block; }
.pdp-shot-star-empty, .pdp-shot-star-solid { position: absolute; inset: 0; }
.pdp-shot-star-empty { color: #ddd; fill: #ddd; }
.pdp-shot-star-fill { position: absolute; inset: 0 auto 0 0; overflow: hidden; }
.pdp-shot-star-solid { color: #f96302; fill: #f96302; }
.pdp-shot-rating-link { color: #111; text-decoration: none; }
.pdp-shot-qa-link { color: #1f5f88; text-decoration: none; margin-left: 5px; }
.pdp-shot-rule { height: 1px; background: #bbb; margin: 0 0 16px; }
.pdp-shot-desc { color: #333; font-size: 12px; line-height: 1.35; margin: 0 0 5px; }
.pdp-shot-cross-sell { color: #333; font-size: 13px; line-height: 1.4; margin: 0 0 14px; }
.pdp-shot-cross-sell strong { font-weight: 700; }
.pdp-shot-read-more { color: #1f5f88; text-decoration: none; }
.pdp-shot-benefit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0 16px; }
.pdp-shot-benefit-row { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #333; }
.pdp-shot-benefit-row.fit { color: #1f5f88; }
.pdp-shot-benefit-row svg { color: #444; }
.pdp-shot-benefit-row.fit svg { color: #f96302; }
.pdp-shot-help-line { margin: 2px 0 16px; color: #333; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.pdp-shot-help-line svg { color: #555; }
.pdp-shot-price-box { margin-bottom: 16px; }
.pdp-shot-price-line { display: flex; align-items: flex-end; gap: 4px; line-height: 1; margin-bottom: 4px; }
.pdp-shot-special-badge { width: 43px; height: 37px; background: #d80000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-7deg); margin-right: 6px; line-height: .9; }
.pdp-shot-special-badge span { background: #fff200; color: #111; font-size: 10px; font-weight: 700; padding: 1px 2px; margin-bottom: 1px; }
.pdp-shot-special-badge b { font-size: 15px; }
.pdp-shot-price-dollar { font-size: 24px; font-weight: 700; transform: translateY(-7px); }
.pdp-shot-price-major { font-size: 43px; font-weight: 700; letter-spacing: -1px; }
.pdp-shot-price-cents { font-size: 21px; font-weight: 700; transform: translateY(-8px); }
.pdp-shot-was-save { display: flex; flex-direction: column; gap: 1px; align-self: center; margin-left: 4px; }
.pdp-shot-was-price { color: #777; text-decoration: line-through; font-size: 12px; }
.pdp-shot-was-save b { color: #05812f; font-size: 13px; }
.pdp-shot-size-line { font-size: 12px; color: #333; align-self: center; margin-left: 4px; }
.pdp-shot-promo-line { font-weight: 700; color: #333; font-size: 13px; line-height: 1.2; margin-top: 7px; }
.pdp-shot-card-line { display: flex; align-items: flex-start; gap: 9px; margin-top: 16px; color: #333; font-size: 12px; line-height: 1.4; }
.pdp-shot-card-line svg { color: #f96302; flex: 0 0 auto; }
.pdp-shot-card-line a { color: #1f5f88; }
.pdp-shot-measure-wrap { margin-top: 18px; display: flex; flex-direction: column; gap: 13px; }
.pdp-shot-measure-label { display: block; font-size: 13px; color: #333; margin-bottom: 6px; }
.pdp-shot-measure-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.pdp-shot-select-shell { position: relative; }
.pdp-shot-select-shell select { width: 100%; height: 37px; border: 1px solid #aaa; background: #fff; color: #333; appearance: none; padding: 0 34px 0 7px; }
.pdp-shot-select-shell svg { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); color: #f96302; pointer-events: none; }
.pdp-shot-customize-btn { margin-top: 18px; width: 100%; background: #f96302; color: #fff; border: 0; padding: 13px; font-weight: 700; text-transform: uppercase; }

@media (max-width: 1200px) {
  .hd-screenshot-main { grid-template-columns: 72px 1fr; row-gap: 10px; height: auto; padding: 10px; }
  .hd-store-strip, .hd-search-wrap, .hd-header-icons { grid-column: 1 / -1; }
  .pdp-screenshot-grid { grid-template-columns: 1fr; }
  .pdp-shot-gallery-layout { grid-template-columns: 82px minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .pdp-shot-gallery-layout { grid-template-columns: 1fr; }
  .pdp-shot-thumb-rail { order: 2; flex-direction: row; overflow: auto; }
  .pdp-shot-hero-stage { height: 360px; }
  .pdp-shot-swatch-bar { height: auto; align-items: flex-start; flex-direction: column; padding: 14px; }
  .pdp-shot-swatch-btn { width: 100%; }
  .pdp-shot-benefit-grid, .pdp-shot-measure-controls { grid-template-columns: 1fr; }
  .hd-header-icons { flex-wrap: wrap; }
  .pdp-shot-product-title { font-size: 17px; }
}



/* Screenshot-matched category/results page */
.category-screenshot-page { max-width: 1226px; margin: 0 auto; padding: 10px 0 40px; }
.hd-cat-breadcrumb { height: 43px; display: flex; align-items: center; gap: 8px; font-size: 14px; color: #555; }
.hd-cat-breadcrumb button { border: 0; background: transparent; padding: 0; color: #555; text-decoration: underline; }
.hd-cat-breadcrumb .hd-cat-page-button { color: #f96302; display: inline-flex; align-items: center; gap: 4px; font-weight: 700; text-decoration: none; }
.hd-cat-breadcrumb .hd-cat-page-button:hover { text-decoration: underline; }
.hd-cat-breadcrumb span:last-child { text-decoration: underline; }
.hd-cat-title-block { padding-top: 34px; }
.hd-cat-title-block h1 { margin: 0; font-size: 44px; line-height: 1; letter-spacing: .6px; font-weight: 700; color: #111; }
.hd-cat-title-block p { margin: 26px 0 20px; font-size: 16px; color: #111; }
.hd-cat-filter-area { margin-bottom: 13px; }
.hd-cat-filter-row { display: flex; align-items: center; gap: 34px; flex-wrap: wrap; margin-bottom: 22px; }
.hd-all-filters { border: 0; background: transparent; display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 0; color: #111; }
.hd-filter-select { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #111; }
.hd-filter-select span { white-space: nowrap; }
.hd-filter-select select { position: absolute; inset: 0; opacity: 0; cursor: pointer; min-width: 100%; }
.hd-filter-select svg { color: #111; }
.hd-cat-chip-sort-row { display: flex; align-items: center; justify-content: space-between; gap: 22px; }
.hd-cat-chips { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.hd-fast-chip { height: 40px; border: 1px solid #bbb; background: #fff; border-radius: 6px; padding: 0 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: #111; }
.hd-fast-chip.active { border-color: #f96302; box-shadow: inset 0 0 0 1px #f96302; }
.hd-hover-chip { height: 40px; border: 1px solid #d0d0d0; background: #fff; border-radius: 6px; padding: 0 10px; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #333; }
.hd-sort-control { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #777; }
.hd-sort-control select { border: 0; background: transparent; appearance: none; padding: 0 24px 0 0; color: #111; font-weight: 500; }
.hd-sort-control svg { position: absolute; right: 0; color: #111; pointer-events: none; }
.hd-products-section { margin-top: 0; }
.category-screenshot-page .product-grid.hd-category-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; border: 0; }
.category-screenshot-page .product-list.hd-category-list { display: grid; gap: 10px; }
.category-screenshot-page .product-card.hd-category-card { background: #fff; border: 0; min-height: 365px; box-shadow: none; position: relative; }
.category-screenshot-page .product-card.hd-category-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,.10); z-index: 3; }
.category-screenshot-page .product-grid .product-card:nth-child(3)::after { display: none; }
.hd-card-topline { height: 38px; display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 0 16px; }
.hd-best-badge { background: #9fe1d7; color: #006f65; font-size: 11px; font-weight: 700; text-transform: none; padding: 2px 5px; }
.hd-card-heart { border: 0; background: transparent; color: #333; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.category-screenshot-page .product-image { aspect-ratio: 1 / 1; margin: 28px 14px 0; background: #fff; }
.category-screenshot-page .product-image img { padding: 0; object-fit: contain; }
.category-screenshot-page .hover-label { display: none; }
.category-screenshot-page .hd-card-info { min-height: auto; padding: 10px 16px 16px; }
.category-screenshot-page .product-title { min-height: 46px; font-size: 14px; line-height: 1.28; margin-top: 8px; }
.category-screenshot-page .rating { margin-top: 4px; }
.category-screenshot-page .model { font-size: 11px; }
.category-screenshot-page .price-area { margin-top: 8px; }
.category-screenshot-page .fulfillment { font-size: 12px; margin-top: 8px; }
.category-screenshot-page .card-actions { padding-top: 10px; }
.category-screenshot-page .build-button { background: #f96302; }

/* Hover-image reliability helpers */
.product-image .primary-img, .product-image .hover-img { backface-visibility: hidden; }
.product-image .hover-img { pointer-events: none; }

@media (max-width: 1280px) {
  .category-screenshot-page { padding-left: 12px; padding-right: 12px; }
  .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hd-cat-filter-row { gap: 20px; }
}
@media (max-width: 900px) {
  .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hd-cat-title-block h1 { font-size: 34px; }
  .hd-cat-chip-sort-row { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 560px) {
  .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: 1fr; }
  .hd-cat-filter-row { gap: 14px; }
  .hd-filter-select { font-size: 13px; }
  .hd-cat-title-block { padding-top: 18px; }
}



/* Screenshot product-card refinement + carousel editor */
.category-screenshot-page .product-card.hd-category-card { min-height: 700px; display: flex; flex-direction: column; }
.category-screenshot-page .product-card.hd-category-card:hover { box-shadow: none; }
.category-screenshot-page .hd-card-topline { height: 42px; padding: 17px 20px 0 20px; }
.category-screenshot-page .hd-best-badge { background: #a7eadf; color: #00695f; font-size: 11px; line-height: 1; padding: 3px 5px; border-radius: 0; }
.category-screenshot-page .hd-card-heart svg { stroke-width: 2; }
.category-screenshot-page .hd-card-image-wrap { display: block; margin: 18px 16px 0; }
.category-screenshot-page .product-image { aspect-ratio: 1 / 1; margin: 0; background: #fff; }
.category-screenshot-page .product-image img { padding: 0; object-fit: cover; }
.category-screenshot-page .hd-card-info { flex: 1; display: flex; flex-direction: column; padding: 96px 20px 14px; }
.category-screenshot-page .product-title { order: 1; min-height: 38px; font-size: 13px; line-height: 1.3; margin: 0 0 4px; color: #111; font-weight: 400; }
.category-screenshot-page .product-title b { font-weight: 700; }
.category-screenshot-page .hd-card-rating-line { order: 2; height: 18px; display: flex; align-items: center; }
.category-screenshot-page .hd-card-rating-line .rating { margin: 0; font-size: 12px; gap: 5px; color: #111; }
.category-screenshot-page .hd-card-rating-line .stars svg { width: 13px; height: 13px; }
.category-screenshot-page .model { order: 3; font-size: 11px; color: #666; margin: 2px 0 10px; }
.category-screenshot-page .hd-card-price-area { order: 4; margin-top: 0; }
.category-screenshot-page .starting { font-size: 16px; text-transform: none; color: #111; font-weight: 400; margin-bottom: 2px; }
.category-screenshot-page .hd-card-price-row { display: flex; align-items: flex-end; gap: 8px; }
.category-screenshot-page .hd-card-price { display: flex; align-items: flex-start; min-width: 84px; }
.category-screenshot-page .hd-card-price .currency { font-size: 14px; padding-top: 2px; font-weight: 700; }
.category-screenshot-page .hd-card-price .dollars { font-size: 28px; line-height: .92; font-weight: 700; letter-spacing: -.8px; }
.category-screenshot-page .hd-card-price .cents { font-size: 12px; padding-top: 1px; font-weight: 700; }
.category-screenshot-page .hd-card-stock-price-range { gap: 4px; align-items: flex-start; flex-wrap: nowrap; }
.category-screenshot-page .hd-card-stock-price-range .stock-price-dash { font-size: 28px; padding-top: 2px; }
.category-screenshot-page .hd-card-stock-price-range .stock-price-custom { font-size: 28px; line-height: .92; font-weight: 700; letter-spacing: -.8px; }
.category-screenshot-page .hd-card-savings { display: grid; gap: 0; font-size: 10px; line-height: 1.15; color: #666; padding-bottom: 2px; }
.category-screenshot-page .hd-card-savings span:last-child { color: #008a2e; }
.category-screenshot-page .hd-card-promo { margin-top: 14px; display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; background: #9fe6c4; color: #111; padding: 6px 10px; border-radius: 3px; font-size: 12px; font-weight: 700; }
.category-screenshot-page .hd-card-promo svg { color: #006f3c; stroke-width: 2.4; }
.category-screenshot-page .hd-card-fulfillment { order: 5; display: none; }
.category-screenshot-page .hd-card-actions { order: 6; margin-top: auto; padding-top: 18px; }
.category-screenshot-page .hd-card-build { height: 42px; background: #fff; color: #f96302; border: 1px solid #f96302; border-radius: 7px; font-size: 14px; font-weight: 700; }
.category-screenshot-page .hd-card-build:hover { background: #fff8f3; }
.category-screenshot-page .hd-card-lower-actions { display: none; }
.category-screenshot-page .product-list .hd-category-card { min-height: auto; display: grid; grid-template-columns: 260px 1fr; }
.category-screenshot-page .product-list .hd-card-info { padding-top: 20px; }
.editor-gallery-field span { display: block; margin-top: 2px; color: #777; font-size: 10px; text-transform: none; font-weight: 600; }
.editor-gallery-field textarea { width: 100%; min-height: 92px; margin-top: 4px; border: 1px solid #bbb; padding: 8px; resize: vertical; font-family: inherit; font-size: 12px; text-transform: none; }
.editor-gallery-preview { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; background: #fff; border: 1px solid #ddd; }
.editor-gallery-thumb { position: relative; width: 70px; height: 70px; border: 1px solid #ddd; background: #f7f7f7; }
.editor-gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.editor-gallery-thumb button { position: absolute; top: -7px; right: -7px; width: 20px; height: 20px; border: 1px solid #bbb; border-radius: 999px; background: #fff; color: #a40000; display: grid; place-items: center; padding: 0; }
@media (max-width: 1280px) { .category-screenshot-page .hd-card-info { padding-top: 44px; } }
@media (max-width: 900px) { .category-screenshot-page .product-card.hd-category-card { min-height: 650px; } .category-screenshot-page .hd-card-info { padding-top: 34px; } }
@media (max-width: 560px) { .category-screenshot-page .product-card.hd-category-card { min-height: auto; } .category-screenshot-page .hd-card-info { padding-top: 26px; } }



/* Fixes: orange editor button and linked editor order */
.hd-editor-orange { background: #f96302 !important; color: #fff !important; border: 1px solid #f96302 !important; padding: 6px 10px !important; border-radius: 2px; font-weight: 700; text-decoration: none !important; text-transform: uppercase; }
.hd-editor-orange:hover { background: #d35400 !important; border-color: #d35400 !important; }



/* Latest fixes: editor placement, hover swap, 1024 gallery note */
.hd-credit-row { height: 14px !important; justify-content: flex-end; }
.hd-editor-main-button { align-self: center; background: #f96302; color: #fff; border: 1px solid #f96302; border-radius: 2px; padding: 9px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
.hd-editor-main-button:hover { background: #d35400; border-color: #d35400; }
.product-image:hover .primary-img.can-hover { opacity: 0; transform: scale(1.025); }
.product-image:hover .hover-img.can-hover { opacity: 1; transform: scale(1.025); }
.product-image .hover-img.can-hover { opacity: 0; }
.editor-gallery-field span { color: #555; }



/* PDP defaults/equal-height panel/back-button refinements */
.pdp-screenshot-grid { align-items: stretch !important; }
.pdp-shot-panel { height: 100%; }
.pdp-shot-gallery-panel, .pdp-shot-detail-panel { min-height: 669px; }
.pdp-shot-gallery-panel { display: flex; flex-direction: column; }
.pdp-shot-gallery-layout { flex: 1; }
.pdp-shot-swatch-bar { margin-top: auto; }
.pdp-shot-back-button { border: 0; background: transparent; color: #f96302; padding: 0; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 700; }
.pdp-shot-back-button:hover { text-decoration: underline; }
@media (max-width: 1200px) { .pdp-shot-gallery-panel, .pdp-shot-detail-panel { min-height: auto; } }



/* Align Color Sample Swatches with Customize and Buy */
.pdp-shot-gallery-layout { flex: 0 0 auto !important; min-height: 478px !important; }
.pdp-shot-hero-stage { height: 458px !important; }
.pdp-shot-swatch-bar { margin-top: 12px !important; margin-bottom: 0; }
@media (max-width: 1200px) {
  .pdp-shot-gallery-layout { min-height: auto !important; }
  .pdp-shot-hero-stage { height: 506px !important; }
}
@media (max-width: 760px) {
  .pdp-shot-hero-stage { height: 360px !important; }
}



/* Reference-border toggle and fixed review polish */
.category-screenshot-page .product-card.hd-category-card.reference-border { position: relative; }
.category-screenshot-page .product-card.hd-category-card.reference-border::after { content: ""; position: absolute; inset: 0; border: 5px solid #f96302; pointer-events: none; z-index: 5; }
.hd-reference-chip.active, .hd-reference-chip:has(input:checked) { border-color: #f96302; box-shadow: inset 0 0 0 1px #f96302; }
.editor-check-row { display: flex !important; flex-direction: column; gap: 6px; justify-content: center; }
.editor-check-row input[type="checkbox"] { width: auto; height: auto; margin: 0; }
.editor-check-row span { color: #666; font-size: 10px; font-weight: 600; text-transform: none; }



/* Fix reference border on third grid item + Apple-style editor redesign */
.category-screenshot-page .product-grid .product-card.hd-category-card.reference-border:nth-child(3)::after { display: block !important; }
.editor-overlay { background: rgba(15, 23, 42, 0.28) !important; backdrop-filter: blur(10px); }
.editor-panel { background: #f5f5f7 !important; width: min(920px, 100%) !important; box-shadow: -24px 0 70px rgba(0,0,0,.22) !important; }
.editor-header { background: rgba(245,245,247,.88) !important; backdrop-filter: blur(18px); border-bottom: 1px solid rgba(0,0,0,.08) !important; padding: 24px 28px !important; align-items: flex-start; }
.editor-header h2 { margin: 6px 0 6px !important; font-size: 32px !important; letter-spacing: -0.03em; font-weight: 700; color: #111; }
.editor-header p { max-width: 620px; color: #6e6e73 !important; font-size: 14px !important; line-height: 1.45; }
.editor-header button { width: 38px; height: 38px; border-radius: 999px !important; background: #e8e8ed !important; display: grid; place-items: center; color: #1d1d1f; }
.editor-kicker { color: #f96302 !important; letter-spacing: .08em; font-size: 11px !important; }
.editor-actions { position: sticky; top: 105px; z-index: 3; background: rgba(245,245,247,.92) !important; backdrop-filter: blur(18px); border-bottom: 1px solid rgba(0,0,0,.08) !important; padding: 14px 28px !important; gap: 10px !important; }
.editor-actions button { border-radius: 999px !important; padding: 10px 16px !important; font-size: 13px; box-shadow: none; }
.orange-action, .save-action { background: #f96302 !important; color: #fff !important; }
.secondary-action { background: #fff !important; color: #1d1d1f !important; border: 1px solid rgba(0,0,0,.08) !important; }
.save-status { color: #6e6e73; }
.editor-list { padding: 22px 28px 34px !important; gap: 18px !important; }
.editor-card.apple-editor-card { position: relative; border: 1px solid rgba(0,0,0,.08) !important; background: rgba(255,255,255,.86) !important; border-radius: 22px; padding: 22px !important; grid-template-columns: 168px minmax(0,1fr) !important; gap: 22px !important; box-shadow: 0 18px 50px rgba(0,0,0,.07); overflow: hidden; }
.editor-card.apple-editor-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 1px; background: rgba(255,255,255,.85); }
.editor-reference-toggle { position: absolute; top: 18px; right: 20px; display: flex; align-items: center; gap: 12px; z-index: 2; color: #1d1d1f; font-size: 13px; font-weight: 700; }
.apple-switch { position: relative; width: 58px; height: 34px; display: inline-block; }
.apple-switch input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2; }
.apple-switch i { position: absolute; inset: 0; border-radius: 999px; background: #d2d2d7; transition: .18s ease; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
.apple-switch i::after { content: ""; position: absolute; width: 30px; height: 30px; left: 2px; top: 2px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.22); transition: .18s ease; }
.apple-switch input:checked + i { background: #34c759; }
.apple-switch input:checked + i::after { transform: translateX(24px); }
.editor-preview { padding-top: 28px; }
.editor-preview .product-image { border: 0 !important; border-radius: 16px; background: #f5f5f7; overflow: hidden; }
.remove-button { border-radius: 999px !important; border: 0 !important; background: #fff1f1 !important; color: #b42318 !important; margin-top: 12px !important; padding: 9px 12px !important; }
.editor-fields { padding-top: 36px; grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 14px !important; }
.editor-fields label { color: #6e6e73 !important; font-size: 11px !important; letter-spacing: .04em; }
.editor-fields input, .editor-fields select, .editor-gallery-field textarea { border: 1px solid rgba(0,0,0,.10) !important; background: #f9f9fb !important; border-radius: 12px; height: 42px; padding: 0 12px !important; color: #1d1d1f; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
.editor-gallery-field textarea { height: auto !important; min-height: 104px; padding: 12px !important; }
.editor-fields input:focus, .editor-fields select:focus, .editor-gallery-field textarea:focus { outline: none; border-color: #f96302 !important; box-shadow: 0 0 0 4px rgba(249,99,2,.14); background: #fff !important; }
.upload-row { background: #f5f5f7; border-radius: 12px; padding: 8px 10px; margin-top: 8px !important; }
.editor-gallery-preview { border: 0 !important; background: #f5f5f7 !important; border-radius: 16px; padding: 12px !important; }
.editor-gallery-thumb { width: 76px !important; height: 76px !important; border: 0 !important; border-radius: 14px; overflow: visible; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
.editor-gallery-thumb img { border-radius: 14px; }
@media (max-width: 820px) {
  .editor-card.apple-editor-card { grid-template-columns: 1fr !important; }
  .editor-reference-toggle { position: static; justify-content: space-between; margin-bottom: 8px; }
  .editor-preview, .editor-fields { padding-top: 0; }
  .editor-fields { grid-template-columns: 1fr !important; }
}



/* Image URL system quick-fix helper */
.editor-image-url-note { margin-top: 6px; color: #6e6e73; font-size: 11px; line-height: 1.35; text-transform: none; font-weight: 600; }



/* Apple-style inline image link/upload controls */
.editor-image-field { display: grid !important; gap: 6px; }
.editor-url-upload-field, .editor-gallery-upload-field { position: relative; display: flex; align-items: center; }
.editor-url-upload-field input { padding-right: 96px !important; width: 100%; }
.editor-gallery-upload-field textarea { padding-right: 96px !important; width: 100%; }
.editor-upload-icon-button { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 999px; background: #fff; color: #1d1d1f; border: 1px solid rgba(0,0,0,.10); display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); cursor: pointer; transition: background .15s ease, transform .15s ease, box-shadow .15s ease; }
.editor-upload-icon-button:hover { background: #f96302; color: #fff; transform: translateY(-50%) scale(1.04); box-shadow: 0 4px 12px rgba(249,99,2,.24); }
.editor-upload-icon-button input { position: absolute !important; inset: 0; opacity: 0; width: 100% !important; height: 100% !important; cursor: pointer; margin: 0 !important; padding: 0 !important; }
.editor-inline-status { position: absolute; right: 46px; top: 50%; transform: translateY(-50%); color: #f96302; font-size: 11px; font-weight: 700; text-transform: none; pointer-events: none; }
.editor-gallery-upload-field { align-items: stretch; }
.editor-gallery-upload-field .editor-upload-icon-button { top: auto; bottom: 8px; transform: none; }
.editor-gallery-upload-field .editor-upload-icon-button:hover { transform: scale(1.04); }
.editor-gallery-upload-field .gallery-status { top: auto; bottom: 17px; transform: none; }
.editor-gallery-preview::before { content: "Carousel images"; width: 100%; color: #6e6e73; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }



/* Multiline gallery URL editor + product order controls */
.editor-gallery-field textarea { min-height: 132px !important; line-height: 1.35 !important; white-space: pre-wrap; resize: vertical !important; }
.editor-order-controls { position: absolute; top: 18px; left: 20px; display: inline-flex; gap: 6px; z-index: 2; }
.editor-order-controls button { width: 34px; height: 34px; border: 1px solid rgba(0,0,0,.10); border-radius: 999px; background: #fff; color: #1d1d1f; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.editor-order-controls button:hover:not(:disabled) { background: #1d1d1f; color: #fff; }
.editor-order-controls button:disabled { opacity: .35; cursor: not-allowed; }
@media (max-width: 820px) { .editor-order-controls { position: static; margin-bottom: 8px; } }



/* Cleaner sticky editor actions + gallery URL manager */
.editor-actions { top: 0 !important; min-height: 78px; padding: 18px 28px !important; background: #f5f5f7 !important; box-shadow: 0 14px 30px rgba(0,0,0,.08); z-index: 20 !important; position: sticky; }
.editor-actions::before { content: ""; position: absolute; left: 0; right: 0; top: -180px; height: 180px; background: #f5f5f7; z-index: -1; }
.editor-actions button, .editor-actions .save-status { position: relative; z-index: 1; }
.editor-gallery-manager { background: #f7f7fa; border: 1px solid rgba(0,0,0,.08); border-radius: 18px; padding: 14px !important; }
.editor-gallery-title-row { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
.editor-gallery-title-row strong { display: block; color: #1d1d1f; font-size: 12px; text-transform: none; letter-spacing: 0; }
.editor-gallery-title-row span { display: block; margin-top: 4px; color: #6e6e73; font-size: 11px; line-height: 1.35; text-transform: none; font-weight: 600; }
.editor-add-link-button { flex: 0 0 auto; border: 0; background: #fff; color: #1d1d1f; border-radius: 999px; padding: 8px 12px; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.editor-add-link-button:hover { background: #1d1d1f; color: #fff; }
.editor-gallery-url-list { display: grid; gap: 9px; }
.editor-gallery-url-row { display: grid; grid-template-columns: 28px 46px minmax(0,1fr) 34px; align-items: center; gap: 9px; background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 16px; padding: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.editor-gallery-number { width: 28px; height: 28px; border-radius: 999px; background: #f5f5f7; color: #6e6e73; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
.editor-gallery-row-preview { width: 46px; height: 46px; border-radius: 12px; background: #f5f5f7; overflow: hidden; display: grid; place-items: center; color: #8e8e93; }
.editor-gallery-row-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.editor-gallery-url-row input { height: 40px !important; border: 0 !important; background: transparent !important; padding: 0 4px !important; font-size: 12px; min-width: 0; }
.editor-gallery-url-row input:focus { box-shadow: none !important; background: transparent !important; }
.editor-gallery-remove { width: 34px; height: 34px; border: 0; border-radius: 999px; background: #fff1f1; color: #b42318; display: grid; place-items: center; }
.editor-gallery-remove:hover { background: #fee4e2; }
.editor-gallery-empty { border: 1px dashed rgba(0,0,0,.18); background: #fff; border-radius: 16px; min-height: 58px; color: #6e6e73; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; }
.editor-gallery-actions-row { margin-top: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.editor-upload-pill-button { position: relative; overflow: hidden; border: 0; background: #f96302; color: #fff !important; border-radius: 999px; padding: 10px 14px; display: inline-flex !important; align-items: center; gap: 8px; font-size: 12px !important; font-weight: 700 !important; text-transform: none !important; letter-spacing: 0 !important; cursor: pointer; }
.editor-upload-pill-button input { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; opacity: 0; cursor: pointer; }
.editor-gallery-actions-row span { color: #6e6e73; font-size: 11px; font-weight: 700; text-transform: none; }
@media (max-width: 640px) { .editor-gallery-title-row { flex-direction: column; } .editor-gallery-url-row { grid-template-columns: 24px 40px minmax(0,1fr) 32px; gap: 7px; } }



/* Final Apple-like control polish */
.editor-upload-pill-button, .editor-upload-pill-button * { color: #fff !important; }
.hd-editor-main-button { min-height: 46px !important; padding: 0 20px !important; border-radius: 999px !important; font-size: 14px !important; letter-spacing: -0.01em; box-shadow: 0 8px 22px rgba(249,99,2,.22); }
.hd-editor-main-button:hover { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(249,99,2,.28); }
.hd-hover-chip { min-height: 40px; border: 1px solid rgba(0,0,0,.10) !important; background: rgba(255,255,255,.82) !important; border-radius: 999px !important; box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 0 14px !important; font-weight: 700; color: #1d1d1f !important; backdrop-filter: blur(14px); }
.hd-hover-chip input { accent-color: #34c759; width: 16px; height: 16px; }
.hd-hover-chip:has(input:checked) { background: #ecfff3 !important; border-color: rgba(52,199,89,.55) !important; box-shadow: inset 0 0 0 1px rgba(52,199,89,.18), 0 1px 3px rgba(0,0,0,.06); }
.pdp-shot-back-button { background: rgba(255,255,255,.82) !important; color: #1d1d1f !important; border: 1px solid rgba(0,0,0,.10) !important; border-radius: 999px; padding: 8px 13px !important; box-shadow: 0 1px 4px rgba(0,0,0,.07); backdrop-filter: blur(14px); text-decoration: none !important; }
.pdp-shot-back-button:hover { background: #f5f5f7 !important; transform: translateY(-1px); }
.editor-upload-pill-button { background: #f96302 !important; }



/* Final PDP/editor spacing and gallery heading polish */
.pdp-shot-breadcrumb { margin-bottom: 14px !important; min-height: 48px; align-items: center; }
.editor-upload-pill-button, .editor-upload-pill-button svg, .editor-upload-pill-button span { color: #fff !important; fill: none; }
.editor-upload-pill-button { color: #fff !important; }
.editor-upload-pill-button * { color: #fff !important; }
.editor-gallery-title-row strong { color: #6e6e73 !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: .04em !important; }



/* Carousel label placement + white upload button text fix */
.editor-standalone-label { color: #6e6e73; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
.editor-gallery-field.editor-image-field { gap: 6px !important; }
.editor-gallery-manager { width: 100%; }
.editor-upload-pill-button, .editor-upload-pill-button span, .editor-upload-pill-button svg { color: #fff !important; stroke: #fff !important; }
.editor-upload-pill-button svg * { stroke: #fff !important; }



/* Move carousel label outside and force upload pill text to white */
.editor-gallery-outside-label { margin: 2px 0 -8px !important; color: #6e6e73 !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: .04em !important; }
.editor-upload-pill-button, label.editor-upload-pill-button, .editor-upload-pill-button .upload-pill-text { color: #fff !important; -webkit-text-fill-color: #fff !important; }
.editor-upload-pill-button svg, label.editor-upload-pill-button svg { color: #fff !important; stroke: #fff !important; }
.editor-upload-pill-button .upload-pill-text { font-size: 12px !important; font-weight: 700 !important; text-transform: none !important; letter-spacing: 0 !important; }



/* Context-aware product-page editor mode */
.editor-panel-product { width: min(820px, 100%) !important; }
.editor-overlay-product .editor-actions { min-height: 72px; }
.editor-list-product { padding: 22px 28px 34px !important; }
.editor-list-product .editor-card.apple-editor-card { grid-template-columns: 210px minmax(0,1fr) !important; min-height: auto; }
.editor-list-product .editor-reference-toggle { top: 20px; right: 24px; }
.editor-list-product .editor-preview { padding-top: 34px; }
.editor-list-product .editor-preview .product-image { aspect-ratio: 1 / 1; }
.editor-list-product .editor-fields { padding-top: 42px; grid-template-columns: 1fr 1fr !important; }
.editor-list-product .editor-gallery-manager { background: #fff; }
.editor-list-product .remove-button, .editor-list-product .editor-order-controls { display: none !important; }
@media (max-width: 820px) { .editor-list-product .editor-card.apple-editor-card { grid-template-columns: 1fr !important; } .editor-list-product .editor-fields { grid-template-columns: 1fr !important; padding-top: 0; } }



/* Editor action bar balance: show header, then cover cleanly while scrolling */
.editor-actions { top: 104px !important; min-height: 58px !important; padding: 10px 28px !important; box-shadow: 0 10px 20px rgba(0,0,0,.06) !important; }
.editor-actions::before { top: -104px !important; height: 104px !important; }
.editor-actions button { padding: 8px 14px !important; font-size: 12px !important; }
.editor-overlay-product .editor-actions { min-height: 58px !important; }
@media (max-width: 820px) { .editor-actions { top: 88px !important; } .editor-actions::before { top: -88px !important; height: 88px !important; } }



/* Mockup Editor header/action layout fix */
.editor-panel { display: flex !important; flex-direction: column; }
.editor-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 40 !important;
  min-height: 132px !important;
  padding: 24px 28px 18px !important;
  background: rgba(245,245,247,.96) !important;
  box-shadow: none !important;
}
.editor-actions {
  position: sticky !important;
  top: 132px !important;
  z-index: 39 !important;
  min-height: 64px !important;
  padding: 12px 28px 14px !important;
  background: rgba(245,245,247,.96) !important;
  backdrop-filter: blur(18px);
  box-shadow: 0 10px 24px rgba(0,0,0,.08) !important;
}
.editor-actions::before { content: none !important; display: none !important; }
.editor-list { padding-top: 22px !important; }
.editor-header h2 { display: block !important; }
.editor-header p { display: block !important; }
.editor-overlay-product .editor-actions { top: 132px !important; }
@media (max-width: 820px) {
  .editor-header { min-height: 150px !important; padding: 20px 20px 16px !important; }
  .editor-actions { top: 150px !important; padding: 10px 20px 12px !important; }
}



/* Mockup Editor compact spacing cleanup */
.editor-header { min-height: auto !important; padding: 20px 28px 10px !important; }
.editor-header h2 { margin: 4px 0 6px !important; line-height: 1.05 !important; }
.editor-header p { margin: 0 !important; max-width: 720px !important; line-height: 1.35 !important; }
.editor-actions { top: 112px !important; min-height: 54px !important; padding: 10px 28px !important; align-items: center !important; gap: 8px !important; }
.editor-actions button { padding: 8px 14px !important; line-height: 1 !important; }
.editor-list { padding-top: 20px !important; }
.editor-card.apple-editor-card { padding: 18px !important; gap: 18px !important; }
.editor-preview { padding-top: 20px !important; }
.editor-fields { padding-top: 28px !important; gap: 12px !important; }
.editor-reference-toggle { top: 16px !important; right: 18px !important; }
.editor-order-controls { top: 16px !important; left: 18px !important; }
.editor-fields input, .editor-fields select, .editor-gallery-field textarea { height: 40px !important; }
.editor-url-upload-field input { height: 40px !important; }
.editor-gallery-manager { padding: 12px !important; }
@media (max-width: 820px) {
  .editor-header { padding: 18px 20px 10px !important; }
  .editor-actions { top: 128px !important; padding: 10px 20px !important; }
  .editor-preview, .editor-fields { padding-top: 0 !important; }
}



/* PDP carousel image: force 1:1 and show the full image */
.pdp-shot-hero-stage { aspect-ratio: 1 / 1 !important; height: auto !important; min-height: 0 !important; background: #fff !important; }
.pdp-shot-hero-stage img { width: 100% !important; height: 100% !important; object-fit: contain !important; background: #fff; }
@media (max-width: 1200px) { .pdp-shot-hero-stage { height: auto !important; } }
@media (max-width: 760px) { .pdp-shot-hero-stage { height: auto !important; } }



/* Grid page width to match Home Depot reference screenshot */
.category-screenshot-page { max-width: 1284px !important; width: calc(100vw - 608px); min-width: min(100%, 980px); }
.category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 8px !important; }
@media (max-width: 1500px) { .category-screenshot-page { width: auto; max-width: 1284px !important; padding-left: 12px; padding-right: 12px; } }
@media (max-width: 1280px) { .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
@media (max-width: 900px) { .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
@media (max-width: 560px) { .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: 1fr !important; } }



/* Final grid width and full-image fit refinements */
.category-screenshot-page { max-width: 1248px !important; width: calc(100% - 48px) !important; }
.category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 8px !important; }
.category-screenshot-page .hd-card-image-wrap { margin-left: 16px !important; margin-right: 16px !important; }
.category-screenshot-page .product-image { width: 100%; background: #fff !important; }
.category-screenshot-page .product-image img { width: 100% !important; height: 100% !important; object-fit: contain !important; object-position: center center !important; }
.category-screenshot-page .product-card:hover .product-image img { transform: none !important; }
.hd-fast-chip.active { border-color: #f96302 !important; box-shadow: inset 0 0 0 1px #f96302 !important; }
@media (max-width: 1280px) { .category-screenshot-page { width: calc(100% - 24px) !important; } }
@media (max-width: 900px) { .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
@media (max-width: 560px) { .category-screenshot-page { width: calc(100% - 20px) !important; } .category-screenshot-page .product-grid.hd-category-grid { grid-template-columns: 1fr !important; } }



/* PDP side carousel thumbnails: 1:1 and full-image fit */
.pdp-shot-thumb-btn { aspect-ratio: 1 / 1 !important; width: 84px !important; height: 84px !important; background: #fff !important; }
.pdp-shot-thumb-btn img { width: 100% !important; height: 100% !important; object-fit: contain !important; object-position: center center !important; background: #fff !important; }
@media (max-width: 760px) { .pdp-shot-thumb-btn { width: 64px !important; height: 64px !important; flex: 0 0 64px !important; } }



/* Product-data toggle: include hover image in PDP carousel */
.editor-top-toggles { position: absolute; top: 16px; right: 18px; display: grid; gap: 10px; z-index: 3; }
.editor-top-toggles .editor-reference-toggle { position: static !important; display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.editor-hover-carousel-toggle span { white-space: nowrap; }
.editor-list-product .editor-top-toggles { top: 20px; right: 24px; }
@media (max-width: 820px) {
  .editor-top-toggles { position: static; margin-bottom: 10px; align-items: stretch; }
  .editor-top-toggles .editor-reference-toggle { justify-content: space-between; }
}



/* Fix product-page editor toggle overlap */
.editor-list-product .editor-top-toggles {
  position: static !important;
  grid-column: 1 / -1;
  display: flex !important;
  justify-content: flex-end;
  align-items: center;
  gap: 18px;
  margin: 0 0 6px;
}
.editor-list-product .editor-top-toggles .editor-reference-toggle {
  position: static !important;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: auto;
}
.editor-list-product .editor-top-toggles .editor-reference-toggle span {
  white-space: nowrap;
  font-size: 12px;
}
.editor-list-product .editor-preview { padding-top: 0 !important; }
.editor-list-product .editor-fields { padding-top: 0 !important; }
@media (max-width: 640px) {
  .editor-list-product .editor-top-toggles { align-items: stretch; flex-direction: column; gap: 10px; }
  .editor-list-product .editor-top-toggles .editor-reference-toggle { justify-content: space-between; }
}



/* Grid editor toggle row + Apple-style carousel reorder controls */
.editor-card.apple-editor-card { padding-top: 72px !important; }
.editor-top-toggles { top: 18px !important; right: 20px !important; grid-auto-flow: column; grid-auto-columns: max-content; align-items: center; gap: 18px !important; }
.editor-top-toggles .editor-reference-toggle span { white-space: nowrap; font-size: 12px; }
.editor-order-controls { top: 18px !important; left: 20px !important; }
.editor-preview, .editor-fields { padding-top: 0 !important; }
.editor-gallery-url-row { grid-template-columns: 28px 46px minmax(0,1fr) 108px !important; }
.editor-gallery-row-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: 5px; }
.editor-gallery-row-actions button { width: 30px; height: 30px; border: 1px solid rgba(0,0,0,.10); border-radius: 999px; background: #fff; color: #1d1d1f; display: grid; place-items: center; font-size: 12px; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.editor-gallery-row-actions button:hover:not(:disabled) { background: #1d1d1f; color: #fff; }
.editor-gallery-row-actions button:disabled { opacity: .32; cursor: not-allowed; }
.editor-gallery-row-actions .editor-gallery-remove { background: #fff1f1; color: #b42318; border: 0; }
.editor-gallery-row-actions .editor-gallery-remove:hover { background: #fee4e2; color: #b42318; }
.editor-list-product .editor-card.apple-editor-card { padding-top: 18px !important; }
@media (max-width: 980px) { .editor-top-toggles { grid-auto-flow: row; justify-items: end; gap: 8px !important; } .editor-card.apple-editor-card { padding-top: 112px !important; } }
@media (max-width: 820px) { .editor-card.apple-editor-card { padding-top: 18px !important; } .editor-gallery-url-row { grid-template-columns: 24px 40px minmax(0,1fr); } .editor-gallery-row-actions { grid-column: 1 / -1; justify-content: flex-end; } }



/* PDP panel bottom whitespace to match Home Depot spacing */
.pdp-shot-gallery-panel { padding-bottom: 18px !important; }
.pdp-shot-detail-panel { padding-bottom: 46px !important; }
.pdp-shot-swatch-bar { margin-bottom: 16px !important; }
.pdp-screenshot-grid { align-items: stretch !important; }
.pdp-shot-panel { height: 100%; }



/* Editor helper text cleanup */
.editor-gallery-title-row { gap: 16px !important; }
.editor-gallery-title-row span { white-space: nowrap; display: inline-flex; align-items: center; min-height: 32px; margin: 0; }
.editor-image-url-note { margin-top: 6px !important; }
@media (max-width: 900px) { .editor-gallery-title-row span { white-space: normal; } }



/* Editor header spacing + drag-to-reorder controls */
.editor-header { padding-bottom: 18px !important; }
.editor-actions { margin-top: 0 !important; border-top: 1px solid rgba(0,0,0,.06); }
.editor-header p { max-width: 760px !important; }
.editor-order-controls { gap: 7px !important; }
.editor-order-controls .editor-drag-handle { cursor: grab; letter-spacing: -3px; padding-right: 8px; }
.editor-order-controls .editor-drag-handle:active { cursor: grabbing; }
.editor-card.apple-editor-card.is-dragging { opacity: .58; transform: scale(.995); }
.editor-card.apple-editor-card { transition: opacity .16s ease, transform .16s ease, box-shadow .16s ease; }
.editor-card.apple-editor-card:has(.editor-drag-handle:hover) { box-shadow: 0 22px 60px rgba(0,0,0,.10); }



/* FINAL editor header/action spacing fix: no overlap */
.editor-header {
  position: relative !important;
  top: auto !important;
  z-index: 2 !important;
  min-height: 0 !important;
  padding: 20px 28px 14px !important;
  border-bottom: 1px solid rgba(0,0,0,.08) !important;
}
.editor-header h2 { margin: 4px 0 8px !important; }
.editor-header p { margin: 0 !important; padding: 0 !important; max-width: 760px !important; line-height: 1.35 !important; }
.editor-actions {
  position: sticky !important;
  top: 0 !important;
  z-index: 30 !important;
  min-height: 50px !important;
  margin: 0 !important;
  padding: 10px 28px !important;
  background: rgba(245,245,247,.98) !important;
  border-top: 0 !important;
  border-bottom: 1px solid rgba(0,0,0,.08) !important;
  box-shadow: 0 8px 18px rgba(0,0,0,.07) !important;
  align-items: center !important;
}
.editor-actions::before { content: none !important; display: none !important; }
.editor-actions button { padding: 8px 14px !important; line-height: 1 !important; }
.editor-overlay-product .editor-actions { top: 0 !important; }
.editor-list { padding-top: 22px !important; }
.editor-drag-handle::after { content: " drag"; letter-spacing: 0; font-size: 10px; font-weight: 700; margin-left: 6px; opacity: .7; }
@media (max-width: 820px) {
  .editor-header { padding: 18px 20px 14px !important; }
  .editor-actions { top: 0 !important; padding: 10px 20px !important; }
}



/* TRUE FINAL editor layout reset: remove sticky overlap entirely */
.editor-header {
  position: relative !important;
  top: auto !important;
  z-index: 1 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  min-height: 0 !important;
  padding: 22px 28px 12px !important;
  background: #f5f5f7 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}
.editor-header h2 { margin: 4px 0 8px !important; line-height: 1.05 !important; }
.editor-header p { margin: 0 !important; padding: 0 !important; max-width: 780px !important; line-height: 1.35 !important; color: #6e6e73 !important; }
.editor-actions {
  position: relative !important;
  top: auto !important;
  z-index: 1 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 10px 28px 14px !important;
  background: #f5f5f7 !important;
  border-top: 0 !important;
  border-bottom: 1px solid rgba(0,0,0,.08) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
}
.editor-actions::before { content: none !important; display: none !important; }
.editor-actions button { padding: 9px 14px !important; line-height: 1 !important; }
.editor-overlay-product .editor-actions { top: auto !important; }
.editor-list { padding-top: 22px !important; }
.editor-card.apple-editor-card { margin-top: 0 !important; }
@media (max-width: 820px) {
  .editor-header { padding: 18px 20px 12px !important; }
  .editor-actions { padding: 10px 20px 14px !important; flex-wrap: wrap !important; }
}



/* Grid Mockup Editor: header and action buttons move as one unit */
.editor-panel:not(.editor-panel-product) .editor-header {
  position: static !important;
  top: auto !important;
  z-index: auto !important;
  border-bottom: 0 !important;
  padding-bottom: 8px !important;
}
.editor-panel:not(.editor-panel-product) .editor-actions {
  position: static !important;
  top: auto !important;
  z-index: auto !important;
  min-height: 54px !important;
  padding: 8px 28px 16px !important;
  background: rgba(245,245,247,.96) !important;
  border-bottom: 1px solid rgba(0,0,0,.08) !important;
  box-shadow: 0 10px 24px rgba(0,0,0,.06) !important;
}
.editor-panel:not(.editor-panel-product) .editor-actions::before {
  content: none !important;
  display: none !important;
}
.editor-panel:not(.editor-panel-product) .editor-list {
  padding-top: 22px !important;
}



/* Unified Mockup/Product Editor appearance with purpose-specific controls */
.editor-panel-product { width: min(920px, 100%) !important; }
.editor-list-product { padding: 22px 28px 34px !important; }
.editor-list-product .editor-card.apple-editor-card { grid-template-columns: 168px minmax(0,1fr) !important; padding: 72px 18px 18px !important; gap: 18px !important; }
.editor-list-product .editor-top-toggles { position: absolute !important; top: 18px !important; right: 20px !important; display: grid !important; grid-auto-flow: column; grid-auto-columns: max-content; align-items: center; justify-content: end; gap: 18px !important; margin: 0 !important; }
.editor-list-product .editor-preview { padding-top: 0 !important; }
.editor-list-product .editor-fields { padding-top: 0 !important; grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 12px !important; }
.editor-list-product .editor-gallery-manager { background: #f7f7fa; }
.editor-list-product .remove-button, .editor-list-product .editor-order-controls { display: none !important; }
.editor-list-product .editor-reference-toggle span { white-space: nowrap; font-size: 12px; }
.editor-overlay-product .editor-actions { top: 112px !important; min-height: 54px !important; padding: 10px 28px !important; }
@media (max-width: 980px) { .editor-list-product .editor-card.apple-editor-card { padding-top: 112px !important; } .editor-list-product .editor-top-toggles { grid-auto-flow: row; justify-items: end; gap: 8px !important; } }
@media (max-width: 820px) { .editor-list-product .editor-card.apple-editor-card { grid-template-columns: 1fr !important; padding: 18px !important; } .editor-list-product .editor-top-toggles { position: static !important; margin-bottom: 10px !important; align-items: stretch; } .editor-list-product .editor-fields { grid-template-columns: 1fr !important; } }



/* Equal header sizing for Mockup Editor and Product Editor */
.editor-header { min-height: 128px !important; height: 128px !important; overflow: hidden; }
.editor-header h2 { font-size: 30px !important; line-height: 1.05 !important; }
.editor-header p { max-width: 720px !important; display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.editor-actions { top: 128px !important; }
.editor-overlay-product .editor-actions { top: 128px !important; }
@media (max-width: 820px) { .editor-header { min-height: 146px !important; height: 146px !important; } .editor-actions, .editor-overlay-product .editor-actions { top: 146px !important; } }



/* Best-behavior editor top area: one unified sticky toolbar */
.editor-sticky-top {
  position: sticky;
  top: 0;
  z-index: 60;
  background: rgba(245,245,247,.97);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(0,0,0,.08);
  box-shadow: 0 10px 24px rgba(0,0,0,.06);
}
.editor-sticky-top .editor-header {
  position: static !important;
  top: auto !important;
  z-index: auto !important;
  min-height: auto !important;
  padding: 18px 28px 8px !important;
  background: transparent !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}
.editor-sticky-top .editor-header h2 { margin: 4px 0 5px !important; line-height: 1.05 !important; }
.editor-sticky-top .editor-header p { margin: 0 !important; max-width: 760px !important; line-height: 1.32 !important; }
.editor-sticky-top .editor-actions {
  position: static !important;
  top: auto !important;
  z-index: auto !important;
  min-height: auto !important;
  padding: 8px 28px 14px !important;
  background: transparent !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  align-items: center !important;
  gap: 8px !important;
}
.editor-sticky-top .editor-actions::before { content: none !important; display: none !important; }
.editor-sticky-top .editor-actions button { padding: 8px 14px !important; line-height: 1 !important; }
.editor-list { padding-top: 22px !important; }
.editor-overlay-product .editor-sticky-top .editor-actions { min-height: auto !important; }
@media (max-width: 820px) {
  .editor-sticky-top .editor-header { padding: 16px 20px 8px !important; }
  .editor-sticky-top .editor-actions { padding: 8px 20px 12px !important; flex-wrap: wrap; }
}



/* Product reorder controls removed from Mockup Editor */
.editor-order-controls { display: none !important; }
.editor-card.apple-editor-card { padding-top: 72px !important; }
@media (max-width: 820px) { .editor-card.apple-editor-card { padding-top: 18px !important; } }



/* Drag-to-reorder removed */
.editor-drag-handle { display: none !important; }
.editor-card.apple-editor-card.is-dragging { opacity: 1 !important; transform: none !important; }



/* Grid Layout Edit Mode */
.hd-layout-edit-button, .hd-layout-save, .hd-layout-cancel { min-height: 40px; border-radius: 999px; border: 1px solid rgba(0,0,0,.10); padding: 0 15px; font-weight: 700; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.hd-layout-edit-button { background: #1d1d1f; color: #fff; }
.hd-layout-edit-button:hover { background: #f96302; border-color: #f96302; }
.hd-layout-edit-controls { display: inline-flex; align-items: center; gap: 8px; padding: 4px; border-radius: 999px; background: rgba(255,255,255,.82); border: 1px solid rgba(0,0,0,.10); box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.hd-layout-edit-controls span { padding: 0 8px; color: #6e6e73; font-size: 12px; font-weight: 700; white-space: nowrap; }
.hd-layout-save { background: #f96302; color: #fff; border-color: #f96302; }
.hd-layout-cancel { background: #fff; color: #1d1d1f; }
.category-screenshot-page .product-card.hd-category-card.layout-edit-card { border-radius: 16px; outline: 1px solid rgba(0,0,0,.08); box-shadow: 0 8px 24px rgba(0,0,0,.08); cursor: default; transition: transform .15s ease, box-shadow .15s ease, outline-color .15s ease, opacity .15s ease; }
.category-screenshot-page .product-card.hd-category-card.layout-edit-card:hover { outline-color: rgba(249,99,2,.55); box-shadow: 0 16px 34px rgba(0,0,0,.14); }
.category-screenshot-page .product-card.hd-category-card.layout-dragging { opacity: .55; transform: scale(.985); }
.layout-drag-handle { position: absolute; left: 14px; top: 13px; z-index: 8; width: 34px; height: 28px; border: 1px solid rgba(0,0,0,.10); border-radius: 999px; background: rgba(255,255,255,.92); color: #1d1d1f; display: grid; place-items: center; font-weight: 700; letter-spacing: -4px; cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,.10); backdrop-filter: blur(12px); }
.layout-drag-handle:active { cursor: grabbing; }
.layout-edit-card .hd-card-topline { padding-left: 58px !important; }
.layout-edit-card .clickable, .layout-edit-card .clickable-title, .layout-edit-card .build-button { cursor: grab !important; }
@media (max-width: 900px) { .hd-layout-edit-controls { border-radius: 18px; flex-wrap: wrap; justify-content: flex-start; padding: 8px; } .hd-layout-edit-controls span { width: 100%; } }



/* Clearer grid layout editing: dedicated tools + drop guide */
.hd-cat-chip-sort-row { align-items: stretch !important; }
.hd-grid-tools { background: rgba(255,255,255,.86); border: 1px solid rgba(0,0,0,.10); border-radius: 18px; padding: 10px 12px; display: grid; gap: 7px; min-width: 420px; box-shadow: 0 1px 4px rgba(0,0,0,.06); backdrop-filter: blur(14px); }
.hd-grid-tools-label { color: #6e6e73; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.hd-grid-tools-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hd-grid-tools .hd-hover-chip { min-height: 34px; padding: 0 12px !important; }
.hd-layout-edit-button, .hd-layout-save, .hd-layout-cancel { border: 0; border-radius: 999px; min-height: 34px; padding: 0 14px; font-size: 12px; font-weight: 700; }
.hd-layout-edit-button { background: #1d1d1f; color: #fff; }
.hd-layout-edit-button:hover { transform: translateY(-1px); }
.hd-grid-tools.is-editing { border-color: rgba(249,99,2,.45); background: #fff8f3; }
.hd-layout-edit-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hd-layout-edit-controls span { color: #9f3d00; font-size: 12px; font-weight: 700; }
.hd-layout-save { background: #f96302; color: #fff; }
.hd-layout-cancel { background: #fff; color: #1d1d1f; border: 1px solid rgba(0,0,0,.12); }
.hd-sort-control select:disabled { opacity: .45; cursor: not-allowed; }
.layout-edit-card { cursor: default; outline: 1px solid rgba(0,0,0,.08); border-radius: 4px; transition: transform .14s ease, box-shadow .14s ease, outline-color .14s ease; }
.layout-edit-card:hover { box-shadow: 0 12px 30px rgba(0,0,0,.12) !important; outline-color: rgba(249,99,2,.40); }
.layout-drag-handle { position: absolute; top: 12px; left: 12px; z-index: 8; width: 38px; height: 34px; border: 1px solid rgba(0,0,0,.12); border-radius: 999px; background: rgba(255,255,255,.94); color: #1d1d1f; font-weight: 700; letter-spacing: -3px; cursor: grab; box-shadow: 0 4px 12px rgba(0,0,0,.12); }
.layout-drag-handle:active { cursor: grabbing; }
.layout-dragging { opacity: .42; transform: scale(.985); }
.layout-drop-before::before, .layout-drop-after::after { content: "Drop here"; position: absolute; top: 10px; bottom: 10px; width: 7px; border-radius: 999px; background: #f96302; color: #fff; z-index: 20; display: flex; align-items: center; justify-content: center; writing-mode: vertical-rl; text-orientation: mixed; font-size: 10px; font-weight: 700; letter-spacing: .04em; box-shadow: 0 0 0 4px rgba(249,99,2,.18), 0 8px 20px rgba(249,99,2,.28); pointer-events: none; }
.layout-drop-before::before { left: -7px; }
.layout-drop-after::after { right: -7px; }
@media (max-width: 1100px) { .hd-cat-chip-sort-row { flex-direction: column; align-items: stretch !important; } .hd-grid-tools { min-width: 0; width: 100%; } }
@media (max-width: 640px) { .hd-grid-tools-controls, .hd-layout-edit-controls { align-items: stretch; flex-direction: column; } .hd-grid-tools .hd-hover-chip, .hd-layout-edit-button, .hd-layout-save, .hd-layout-cancel { width: 100%; justify-content: center; } }



/* Move Grid Tools into right-side gray title space + hide reference borders in edit mode */
.hd-cat-title-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 24px; }
.hd-cat-title-grid .hd-grid-tools { align-self: end; margin-bottom: 10px; }
.hd-cat-chip-sort-row { align-items: center !important; }
.layout-edit-card.reference-border::after { display: none !important; }
@media (max-width: 1100px) { .hd-cat-title-grid { grid-template-columns: 1fr; align-items: start; } .hd-cat-title-grid .hd-grid-tools { justify-self: stretch; margin-bottom: 0; } }


/* FINAL requested updates: Grid Tools alignment, dark Edit Layout, no Drop here text, Pre-Cut polish */
.hd-cat-title-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: start !important;
  gap: 24px !important;
}

.hd-cat-title-grid .hd-grid-tools {
  align-self: start !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.hd-cat-chip-sort-row {
  align-items: center !important;
}

.layout-edit-card.reference-border::after {
  display: none !important;
}

.hd-layout-edit-button {
  background: #1d1d1f !important;
  color: #fff !important;
  border-color: #1d1d1f !important;
  box-shadow: 0 8px 18px rgba(0,0,0,.14) !important;
}

.hd-layout-edit-button:hover {
  background: #000 !important;
  border-color: #000 !important;
  transform: translateY(-1px);
}

/* Remove "Drop here" text while preserving the orange layout drop guide */
.layout-drop-before::before,
.layout-drop-after::after {
  content: "" !important;
  position: absolute !important;
  top: 10px !important;
  bottom: 10px !important;
  width: 7px !important;
  border-radius: 999px !important;
  background: #f96302 !important;
  color: transparent !important;
  z-index: 20 !important;
  display: block !important;
  writing-mode: initial !important;
  text-orientation: initial !important;
  font-size: 0 !important;
  letter-spacing: 0 !important;
  box-shadow: 0 0 0 4px rgba(249,99,2,.18), 0 8px 20px rgba(249,99,2,.28) !important;
  pointer-events: none !important;
}

.layout-drop-before::before {
  left: -7px !important;
}

.layout-drop-after::after {
  right: -7px !important;
}

@media (max-width: 1100px) {
  .hd-cat-title-grid {
    grid-template-columns: 1fr !important;
    align-items: start !important;
  }

  .hd-cat-title-grid .hd-grid-tools {
    justify-self: stretch !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
}


/* PDP carousel update: allow six side thumbnails */
.pdp-shot-thumb-rail {
  gap: 8px !important;
}

@media (min-width: 761px) {
  .pdp-shot-gallery-layout {
    align-items: start !important;
  }

  .pdp-shot-thumb-rail {
    overflow: visible !important;
  }
}


/* FINAL requested PDP carousel interaction + back button polish */
.pdp-shot-thumb-btn {
  overflow: hidden !important;
}

.pdp-shot-thumb-overlay {
  z-index: 3 !important;
  pointer-events: none !important;
  font-size: 20px !important;
  font-weight: 700 !important;
}

.pdp-shot-thumb-btn:hover,
.pdp-shot-thumb-btn:focus-visible {
  border-color: #f96302 !important;
  box-shadow: 0 0 0 2px rgba(249,99,2,.16) !important;
}

.pdp-shot-back-button {
  background: #f96302 !important;
  color: #fff !important;
  border: 1px solid #f96302 !important;
  border-radius: 999px !important;
  padding: 8px 14px !important;
  box-shadow: 0 8px 22px rgba(249,99,2,.22) !important;
  text-decoration: none !important;
}

.pdp-shot-back-button svg {
  color: #fff !important;
  stroke: #fff !important;
}

.pdp-shot-back-button:hover {
  background: #d35400 !important;
  border-color: #d35400 !important;
  color: #fff !important;
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(249,99,2,.28) !important;
}


/* PDP thumbnail count note: +remaining includes primary image and hover image when enabled */
.pdp-shot-thumb-btn:nth-child(6) .pdp-shot-thumb-overlay {
  display: flex !important;
}


/* PDP carousel remaining-count behavior: the +badge appears on the 6th TOTAL thumbnail slot.
   Primary image and optional hover image count before uploaded carousel images. */
.pdp-shot-thumb-btn:nth-child(6) .pdp-shot-thumb-overlay {
  display: flex !important;
}


/* PDP +remaining tile behavior: the 6th thumbnail becomes the +tile.
   Example: primary + 5 gallery images = 6 total, so thumbnail 6 shows +1. */
.pdp-shot-thumb-btn:nth-child(6) .pdp-shot-thumb-overlay {
  display: flex !important;
}



/* Rearrange mode UX upgrade: focused command bar, positions, undo, and touch controls */
.layout-command-bar {
  position: sticky;
  top: 0;
  z-index: 45;
  margin: 0 0 18px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, .94);
  border: 1px solid rgba(249, 99, 2, .28);
  border-left: 7px solid #f96302;
  border-radius: 18px;
  box-shadow: 0 14px 42px rgba(0, 0, 0, .12);
  backdrop-filter: blur(18px);
}
.layout-command-copy { display: grid; gap: 3px; }
.layout-command-copy strong { color: #1d1d1f; font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
.layout-command-copy span { color: #666; font-size: 12px; font-weight: 750; }
.layout-command-status { display: flex; align-items: center; gap: 8px; color: #6e6e73; font-size: 12px; font-weight: 700; white-space: nowrap; }
.layout-command-status .is-unsaved { color: #9f3d00; }
.layout-command-status em { font-style: normal; color: #9f3d00; }
.layout-command-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.layout-command-actions button,
.hd-layout-undo {
  min-height: 36px;
  border: 1px solid rgba(0,0,0,.14);
  border-radius: 999px;
  padding: 0 13px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease;
}
.layout-command-actions button:hover:not(:disabled),
.hd-layout-undo:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(0,0,0,.12); }
.layout-command-actions button:disabled,
.hd-layout-save:disabled,
.hd-layout-undo:disabled { opacity: .42; cursor: not-allowed; box-shadow: none !important; transform: none !important; }
.layout-command-actions .primary { background: #f96302; border-color: #f96302; color: #fff; }
.layout-command-actions .secondary { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
.layout-sr-live { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.category-screenshot-page .product-card.hd-category-card.layout-edit-card {
  overflow: visible;
  isolation: isolate;
  background: linear-gradient(180deg, #fff 0%, #fff 72%, #fffaf6 100%);
}
.layout-position-badge {
  position: absolute;
  left: 57px;
  top: 13px;
  z-index: 8;
  min-width: 38px;
  height: 28px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 12px;
  font-weight: 950;
  box-shadow: 0 5px 14px rgba(0,0,0,.16);
}
.layout-edit-card .hd-card-topline { padding-left: 104px !important; }
.layout-edit-card .hd-card-heart,
.layout-edit-card .hd-card-lower-actions,
.layout-edit-card .hd-card-fulfillment { opacity: .24; pointer-events: none; }
.layout-edit-card .hd-card-rating-line,
.layout-edit-card .model { opacity: .55; }
.layout-edit-card .hd-card-build { pointer-events: none; filter: grayscale(.2); opacity: .65; }
.layout-edit-card .clickable,
.layout-edit-card .clickable-title,
.layout-edit-card .build-button { cursor: default !important; }
.layout-drag-handle {
  width: 40px !important;
  height: 34px !important;
  font-size: 16px !important;
  letter-spacing: -4px !important;
  border-color: rgba(249,99,2,.25) !important;
}
.layout-drag-handle:hover { background: #fff7f0 !important; border-color: #f96302 !important; color: #f96302 !important; }
.layout-dragging .layout-position-badge { background: #f96302; }

.layout-mobile-controls {
  display: none;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin: 8px 12px 0;
}
.layout-mobile-controls button {
  min-height: 34px;
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 10px;
  background: #fff;
  color: #1d1d1f;
  font-weight: 700;
  font-size: 12px;
}
.layout-mobile-controls button:disabled { opacity: .35; }
.layout-drop-before::before,
.layout-drop-after::after {
  width: 8px !important;
  box-shadow: 0 0 0 5px rgba(249,99,2,.16), 0 10px 28px rgba(249,99,2,.34) !important;
}
.layout-drop-before::before { left: -8px !important; }
.layout-drop-after::after { right: -8px !important; }

@media (max-width: 980px) {
  .layout-command-bar { grid-template-columns: 1fr; align-items: stretch; }
  .layout-command-status { justify-content: space-between; white-space: normal; }
  .layout-command-actions { justify-content: stretch; }
  .layout-command-actions button { flex: 1 1 140px; }
}
@media (max-width: 760px) {
  .layout-command-bar { top: 0; border-radius: 14px; margin-left: 0; margin-right: 0; }
  .layout-mobile-controls { display: grid; }
  .layout-edit-card .hd-card-topline { padding-left: 98px !important; }
  .layout-position-badge { left: 56px; }
}



/* Compact grid Mockup Editor: scan-first Apple-style product rows */
.editor-card.apple-editor-card.editor-card-compact,
.editor-card.apple-editor-card.editor-card-expanded {
  display: block !important;
  grid-template-columns: none !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: rgba(255,255,255,.92) !important;
  border-radius: 22px !important;
}
.editor-compact-summary {
  display: grid;
  grid-template-columns: 104px minmax(240px, 1fr) minmax(240px, 330px);
  align-items: center;
  gap: 18px;
  padding: 18px;
}
.editor-compact-preview {
  width: 104px;
  height: 104px;
  border-radius: 18px;
  background: #f5f5f7;
  border: 1px solid rgba(0,0,0,.08);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.editor-compact-preview .product-image {
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  background: #fff !important;
}
.editor-compact-main {
  min-width: 0;
  display: grid;
  gap: 9px;
}
.editor-compact-name {
  display: grid;
  gap: 6px;
  color: #6e6e73;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.editor-compact-name input {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 14px;
  background: #fff;
  color: #1d1d1f;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -.01em;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
  transition: border-color .16s ease, box-shadow .16s ease;
  text-transform: none;
}
.editor-compact-name input:focus {
  border-color: rgba(249,99,2,.72);
  box-shadow: 0 0 0 4px rgba(249,99,2,.13);
}
.editor-compact-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6e6e73;
  font-size: 12px;
  font-weight: 700;
  min-width: 0;
}
.editor-compact-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.editor-compact-meta i {
  width: 4px;
  height: 4px;
  flex: 0 0 4px;
  border-radius: 50%;
  background: #c7c7cc;
}
.editor-compact-controls {
  display: grid;
  justify-items: end;
  gap: 12px;
}
.editor-compact-toggles.editor-top-toggles {
  position: static !important;
  display: grid !important;
  gap: 8px !important;
  width: 100%;
  margin: 0 !important;
}
.editor-compact-toggles .editor-reference-toggle {
  position: static !important;
  min-height: 36px;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  padding: 2px 0;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 850;
}
.editor-compact-toggles .apple-switch {
  width: 50px;
  height: 30px;
  flex: 0 0 50px;
}
.editor-compact-toggles .apple-switch i::after {
  width: 26px;
  height: 26px;
}
.editor-compact-toggles .apple-switch input:checked + i::after {
  transform: translateX(20px);
}
.editor-more-toggle {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 999px;
  background: #f5f5f7;
  color: #1d1d1f;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background .16s ease, transform .16s ease, box-shadow .16s ease;
}
.editor-more-toggle:hover {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0,0,0,.10);
}
.editor-more-toggle[aria-expanded="true"] svg {
  transform: rotate(180deg);
}
.editor-more-panel {
  margin: 0 14px 14px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f5f5f7, #fbfbfd);
  border: 1px solid rgba(0,0,0,.07);
  animation: editorExpand .18s ease-out;
}
@keyframes editorExpand {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
.editor-more-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 0 0 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(0,0,0,.08);
}
.editor-more-heading div {
  display: grid;
  gap: 3px;
}
.editor-more-heading strong {
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 950;
}
.editor-more-heading span {
  color: #6e6e73;
  font-size: 12px;
  font-weight: 750;
}
.editor-more-remove.remove-button {
  width: auto !important;
  margin-top: 0 !important;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  white-space: nowrap;
}
.editor-fields-compact-more {
  gap: 12px !important;
}
.editor-field-section-title {
  margin-top: 4px;
  color: #1d1d1f !important;
  font-size: 12px !important;
  font-weight: 950 !important;
  letter-spacing: .02em;
  text-transform: uppercase;
}
.editor-field-section-title:first-child { margin-top: 0; }
.editor-card-compact .editor-fields label,
.editor-card-expanded .editor-fields label {
  color: #6e6e73;
}
.editor-card-compact .editor-fields input,
.editor-card-compact .editor-fields select,
.editor-card-expanded .editor-fields input,
.editor-card-expanded .editor-fields select {
  border-radius: 12px;
  border-color: rgba(0,0,0,.11);
  height: 40px;
}
.editor-overlay-product .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
  grid-template-columns: 128px minmax(260px, 1fr) minmax(260px, 340px);
  padding: 22px;
}
.editor-overlay-product .editor-compact-preview {
  width: 128px;
  height: 128px;
}
@media (max-width: 920px) {
  .editor-compact-summary {
    grid-template-columns: 84px minmax(0, 1fr);
    align-items: start;
  }
  .editor-compact-preview { width: 84px; height: 84px; border-radius: 15px; }
  .editor-compact-controls {
    grid-column: 1 / -1;
    justify-items: stretch;
  }
  .editor-compact-toggles.editor-top-toggles {
    grid-template-columns: 1fr 1fr;
  }
  .editor-more-toggle { width: 100%; }
}
@media (max-width: 620px) {
  .editor-list { padding-left: 12px !important; padding-right: 12px !important; }
  .editor-compact-summary {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
  }
  .editor-compact-preview { width: 72px; height: 72px; }
  .editor-compact-toggles.editor-top-toggles { grid-template-columns: 1fr; }
  .editor-more-panel { margin: 0 10px 10px; padding: 12px; }
  .editor-more-heading { flex-direction: column; }
  .editor-more-remove.remove-button { width: 100% !important; }
}



/* Compact editor spacing refinement: roomier rows, icon-only disclosure, unclipped toggles */
.editor-panel:not(.editor-panel-product) {
  width: min(1060px, 100%) !important;
}
.editor-panel:not(.editor-panel-product) .editor-list {
  padding: 26px 32px 38px !important;
  gap: 20px !important;
}
.editor-card.apple-editor-card.editor-card-compact,
.editor-card.apple-editor-card.editor-card-expanded {
  overflow: visible !important;
}
.editor-card.apple-editor-card.editor-card-compact::before,
.editor-card.apple-editor-card.editor-card-expanded::before {
  border-radius: 22px 22px 0 0;
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
  grid-template-columns: 96px minmax(280px, 1fr) minmax(390px, 430px) !important;
  gap: 22px !important;
  padding: 20px 22px !important;
  align-items: center !important;
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-preview,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-preview {
  width: 96px !important;
  height: 96px !important;
  border-radius: 20px !important;
}
.editor-compact-main {
  align-self: center;
}
.editor-compact-name input {
  min-height: 46px !important;
  border-radius: 16px !important;
  font-size: 15px !important;
}
.editor-compact-controls {
  width: 100%;
  display: grid !important;
  grid-template-columns: minmax(310px, 1fr) 44px !important;
  align-items: center !important;
  justify-items: stretch !important;
  gap: 16px !important;
}
.editor-compact-toggles.editor-top-toggles {
  min-width: 0;
  gap: 10px !important;
}
.editor-compact-toggles .editor-reference-toggle {
  min-height: 38px !important;
  padding: 0 !important;
  gap: 18px !important;
  overflow: visible !important;
}
.editor-compact-toggles .editor-reference-toggle span {
  min-width: 0;
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
  color: #1d1d1f;
}
.editor-compact-toggles .apple-switch {
  margin-right: 0 !important;
  overflow: visible !important;
}
.editor-more-toggle {
  width: 44px !important;
  height: 44px !important;
  min-height: 44px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  font-size: 0 !important;
  background: #fff !important;
  border-color: rgba(0,0,0,.12) !important;
  box-shadow: 0 4px 14px rgba(0,0,0,.08) !important;
  align-self: center;
}
.editor-more-toggle svg {
  flex: 0 0 auto;
  color: #1d1d1f;
  transition: transform .18s ease;
}
.editor-more-toggle:hover {
  background: #fff7f0 !important;
  border-color: rgba(249,99,2,.45) !important;
  box-shadow: 0 10px 24px rgba(249,99,2,.16) !important;
}
.editor-more-panel {
  margin: 0 18px 18px !important;
}
.editor-overlay-product .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
  grid-template-columns: 116px minmax(260px, 1fr) minmax(390px, 430px) !important;
}
.editor-overlay-product .editor-compact-preview {
  width: 116px !important;
  height: 116px !important;
}
@media (max-width: 980px) {
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary,
  .editor-overlay-product .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
    grid-template-columns: 88px minmax(0, 1fr) !important;
    gap: 16px !important;
  }
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-preview,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-preview,
  .editor-overlay-product .editor-compact-preview {
    width: 88px !important;
    height: 88px !important;
  }
  .editor-compact-controls {
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) 44px !important;
    align-items: center !important;
  }
  .editor-compact-toggles.editor-top-toggles {
    grid-template-columns: 1fr 1fr !important;
  }
}
@media (max-width: 680px) {
  .editor-panel:not(.editor-panel-product) .editor-list {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary,
  .editor-overlay-product .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
    grid-template-columns: 76px minmax(0, 1fr) !important;
    gap: 13px !important;
    padding: 15px !important;
  }
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-preview,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-preview,
  .editor-overlay-product .editor-compact-preview {
    width: 76px !important;
    height: 76px !important;
    border-radius: 16px !important;
  }
  .editor-compact-controls {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  .editor-compact-toggles.editor-top-toggles {
    grid-template-columns: 1fr !important;
  }
  .editor-more-toggle {
    width: 100% !important;
    border-radius: 999px !important;
  }
  .editor-more-toggle::after {
    content: "Details";
    margin-left: 8px;
    color: #1d1d1f;
    font-size: 12px;
    font-weight: 700;
  }
}



/* Product editor refinement: calmer list rows, horizontal controls, search, section cards */
.editor-panel:not(.editor-panel-product) {
  width: min(1120px, 100%) !important;
}
.editor-actions-enhanced {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
}
.editor-search-shell {
  flex: 1 1 280px;
  min-width: 260px;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 12px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75);
}
.editor-search-shell svg { color: #6e6e73; flex: 0 0 auto; }
.editor-search-shell input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 750;
}
.editor-search-shell button {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  border-radius: 50% !important;
  display: grid !important;
  place-items: center !important;
  background: #f5f5f7 !important;
  color: #6e6e73 !important;
}
.editor-collapse-action svg { transform: rotate(180deg); }
.editor-empty-state {
  padding: 34px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  color: #6e6e73;
  font-size: 14px;
  font-weight: 850;
  text-align: center;
}

.editor-card.apple-editor-card.editor-card-compact,
.editor-card.apple-editor-card.editor-card-expanded {
  box-shadow: 0 10px 30px rgba(0,0,0,.055) !important;
  border-color: rgba(0,0,0,.075) !important;
  background: rgba(255,255,255,.96) !important;
}
.editor-card.apple-editor-card.editor-card-compact:hover,
.editor-card.apple-editor-card.editor-card-expanded:hover {
  box-shadow: 0 14px 38px rgba(0,0,0,.075) !important;
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
  grid-template-columns: 88px minmax(320px, 1fr) minmax(430px, auto) !important;
  gap: 22px !important;
  padding: 20px 22px !important;
  min-height: 130px;
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-preview,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-preview {
  width: 88px !important;
  height: 88px !important;
  border-radius: 18px !important;
}
.editor-compact-name {
  gap: 5px !important;
  font-size: 10px !important;
  letter-spacing: .07em !important;
}
.editor-compact-name input {
  height: 44px !important;
  min-height: 44px !important;
  font-size: 15.5px !important;
  font-weight: 700 !important;
}
.editor-compact-main { gap: 7px !important; }
.editor-compact-meta {
  font-size: 12px !important;
  line-height: 1.25;
  max-width: 100%;
}
.editor-compact-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 22px;
}
.editor-chip {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f5f5f7;
  border: 1px solid rgba(0,0,0,.06);
  color: #6e6e73;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}
.editor-chip.edited { background: #fff3ea; border-color: rgba(249,99,2,.22); color: #b84a05; }
.editor-chip.warning { background: #fff5d8; border-color: rgba(182,132,0,.22); color: #7a5600; }
.editor-chip.muted { color: #8e8e93; }
.editor-compact-controls {
  grid-template-columns: auto 44px !important;
  gap: 14px !important;
  align-items: center !important;
  justify-content: end !important;
}
.editor-compact-toggles.editor-top-toggles {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 14px !important;
  width: auto !important;
}
.editor-compact-toggles .editor-reference-toggle {
  min-height: 36px !important;
  gap: 9px !important;
  justify-content: flex-end !important;
  white-space: nowrap;
}
.editor-compact-toggles .editor-reference-toggle span {
  font-size: 12px !important;
  font-weight: 700 !important;
}
.editor-compact-toggles .apple-switch {
  width: 46px !important;
  height: 28px !important;
}
.editor-compact-toggles .apple-switch i::after {
  width: 24px !important;
  height: 24px !important;
}
.editor-compact-toggles .apple-switch input:checked + i::after {
  transform: translateX(18px) !important;
}
.editor-more-toggle {
  box-shadow: none !important;
}
.editor-more-toggle::after { content: none !important; }

.editor-more-panel {
  margin: 0 !important;
  padding: 18px 22px 22px !important;
  border-radius: 0 0 22px 22px !important;
  border: 0 !important;
  border-top: 1px solid rgba(0,0,0,.075) !important;
  background: #f5f5f7 !important;
}
.editor-more-heading {
  background: transparent !important;
  padding: 0 0 14px !important;
  margin-bottom: 16px !important;
}
.editor-more-heading-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.editor-duplicate-button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 999px;
  padding: 0 12px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 700;
}
.editor-section-stack {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 14px !important;
}
.editor-section-card {
  background: #fff;
  border: 1px solid rgba(0,0,0,.075);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 1px 0 rgba(255,255,255,.7);
}
.editor-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(0,0,0,.07);
}
.editor-section-heading strong {
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 950;
}
.editor-section-heading span {
  color: #8e8e93;
  font-size: 11.5px;
  font-weight: 750;
  text-align: right;
}
.editor-section-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.editor-section-grid label {
  min-width: 0;
}
.editor-section-grid .wide,
.editor-section-card .wide {
  grid-column: 1 / -1;
}
.editor-section-grid-images {
  grid-template-columns: 1fr !important;
}
.editor-section-card-gallery .editor-gallery-manager {
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
}
.editor-section-card-gallery .editor-gallery-title-row {
  padding-top: 0 !important;
}
@media (max-width: 1050px) {
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
    grid-template-columns: 84px minmax(0, 1fr) !important;
    min-height: auto;
  }
  .editor-compact-controls {
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) 44px !important;
  }
  .editor-compact-toggles.editor-top-toggles {
    justify-content: flex-start !important;
  }
  .editor-section-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .editor-actions-enhanced { align-items: stretch !important; }
  .editor-search-shell { flex-basis: 100%; min-width: 0; }
  .editor-actions-enhanced > button { flex: 1 1 140px; justify-content: center; }
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
    grid-template-columns: 74px minmax(0, 1fr) !important;
    padding: 15px !important;
  }
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-preview,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-preview {
    width: 74px !important;
    height: 74px !important;
  }
  .editor-compact-controls { grid-template-columns: 1fr 42px !important; gap: 10px !important; }
  .editor-compact-toggles.editor-top-toggles { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
  .editor-compact-toggles .editor-reference-toggle { justify-content: space-between !important; }
  .editor-section-heading { display: grid; gap: 3px; }
  .editor-section-heading span { text-align: left; }
  .editor-section-grid { grid-template-columns: 1fr; }
  .editor-more-panel { padding: 14px !important; }
}



/* Final compact editor cleanup: simpler meta and matched detail action buttons */
.editor-more-heading-actions {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  flex-wrap: nowrap !important;
  flex: 0 0 auto;
}
.editor-duplicate-button,
.editor-more-remove.remove-button {
  width: 112px !important;
  height: 36px !important;
  min-height: 36px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  white-space: nowrap !important;
  text-transform: none !important;
}
.editor-duplicate-button {
  background: #fff !important;
  color: #1d1d1f !important;
  border: 1px solid rgba(0,0,0,.12) !important;
}
.editor-more-remove.remove-button {
  background: #fff !important;
  color: #a40000 !important;
  border: 1px solid #e5b9b9 !important;
}
.editor-compact-toggles.editor-top-toggles {
  gap: 16px !important;
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
  grid-template-columns: 88px minmax(330px, 1fr) minmax(470px, auto) !important;
}
@media (max-width: 1050px) {
  .editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
  .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
    grid-template-columns: 84px minmax(0, 1fr) !important;
  }
}
@media (max-width: 700px) {
  .editor-more-heading-actions {
    width: 100%;
    justify-content: stretch !important;
  }
  .editor-duplicate-button,
  .editor-more-remove.remove-button {
    width: 50% !important;
    flex: 1 1 0 !important;
  }
}



/* Compact editor product names: allow full Home Depot-style titles to wrap while typing */
.editor-compact-name textarea {
  width: 100%;
  min-height: 62px;
  max-height: 142px;
  resize: vertical;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 16px;
  background: #fff;
  color: #1d1d1f;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 15.5px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -.01em;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
  transition: border-color .16s ease, box-shadow .16s ease;
  text-transform: none;
}
.editor-compact-name textarea:focus {
  border-color: rgba(249,99,2,.72);
  box-shadow: 0 0 0 4px rgba(249,99,2,.13);
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-summary,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary {
  align-items: start !important;
  min-height: 150px !important;
}
.editor-card.apple-editor-card.editor-card-compact .editor-compact-preview,
.editor-card.apple-editor-card.editor-card-expanded .editor-compact-preview {
  margin-top: 4px;
}
.editor-compact-controls {
  align-self: start !important;
  padding-top: 13px;
}
.editor-compact-name input {
  display: none;
}
@media (max-width: 700px) {
  .editor-compact-name textarea {
    min-height: 74px;
    font-size: 14px;
  }
  .editor-compact-controls {
    padding-top: 0;
  }
}



/* Apple-like PDP carousel drag reorder controls */
.editor-gallery-url-row {
  position: relative !important;
  grid-template-columns: 34px 30px 48px minmax(0,1fr) 108px !important;
  gap: 8px !important;
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease, opacity .16s ease;
}
.editor-gallery-url-row:hover {
  border-color: rgba(249,99,2,.22) !important;
  box-shadow: 0 6px 18px rgba(0,0,0,.07) !important;
}
.editor-gallery-drag-handle {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 999px;
  background: #f5f5f7;
  color: #6e6e73;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 950;
  letter-spacing: -4px;
  cursor: grab;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
  touch-action: none;
}
.editor-gallery-drag-handle:hover {
  background: #fff7f0;
  border-color: rgba(249,99,2,.40);
  color: #f96302;
}
.editor-gallery-drag-handle:active {
  cursor: grabbing;
}
.editor-gallery-number {
  width: 30px !important;
  height: 30px !important;
}
.gallery-row-dragging {
  opacity: .48;
  transform: scale(.992);
  border-color: rgba(249,99,2,.35) !important;
  background: #fffaf6 !important;
}
.gallery-drop-before::before,
.gallery-drop-after::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  height: 3px;
  border-radius: 999px;
  background: #f96302;
  z-index: 6;
  box-shadow: 0 0 0 4px rgba(249,99,2,.14), 0 8px 18px rgba(249,99,2,.24);
  pointer-events: none;
}
.gallery-drop-before::before { top: -6px; }
.gallery-drop-after::after { bottom: -6px; }
.editor-section-card-gallery .editor-section-heading span::after {
  content: " Drag handles reorder the carousel.";
}
@media (max-width: 820px) {
  .editor-gallery-url-row {
    grid-template-columns: 34px 28px 42px minmax(0,1fr) !important;
  }
  .editor-gallery-row-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
@media (max-width: 560px) {
  .editor-gallery-url-row {
    grid-template-columns: 34px 28px minmax(0,1fr) !important;
  }
  .editor-gallery-row-preview {
    grid-column: 2;
  }
  .editor-gallery-url-row input {
    grid-column: 3;
  }
}



/* PDP carousel row cleanup after drag reorder: remove arrow-button space and refine rhythm */
.editor-gallery-url-row {
  grid-template-columns: 34px 32px 52px minmax(0,1fr) 42px !important;
  gap: 10px !important;
  padding: 10px !important;
  min-height: 68px;
}
.editor-gallery-row-preview {
  width: 52px !important;
  height: 52px !important;
  border-radius: 14px !important;
}
.editor-gallery-url-row input {
  height: 44px !important;
  font-size: 13px !important;
  padding: 0 8px !important;
}
.editor-gallery-row-actions {
  width: 42px !important;
  display: flex !important;
  justify-content: center !important;
}
.editor-gallery-row-actions .editor-gallery-remove {
  width: 34px !important;
  height: 34px !important;
  border: 1px solid rgba(180,35,24,.10) !important;
  box-shadow: none !important;
}
.editor-gallery-drag-handle {
  width: 34px !important;
  height: 34px !important;
}
.editor-gallery-number {
  width: 32px !important;
  height: 32px !important;
  font-size: 12px !important;
}
.editor-gallery-url-list {
  gap: 10px !important;
}
.editor-section-card-gallery .editor-gallery-title-row {
  margin-bottom: 10px;
}
@media (max-width: 820px) {
  .editor-gallery-url-row {
    grid-template-columns: 34px 30px 48px minmax(0,1fr) 38px !important;
  }
  .editor-gallery-row-actions {
    grid-column: auto !important;
    width: 38px !important;
  }
}
@media (max-width: 620px) {
  .editor-gallery-url-row {
    grid-template-columns: 34px 30px minmax(0,1fr) 38px !important;
  }
  .editor-gallery-row-preview {
    display: none !important;
  }
}



/* Ensure every PLP product heart stays pinned to the right, even when no badge exists */
.category-screenshot-page .product-card.hd-category-card .hd-card-topline {
  position: relative !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  width: 100% !important;
  padding-right: 54px !important;
}
.category-screenshot-page .product-card.hd-category-card .hd-card-heart {
  position: absolute !important;
  top: 15px !important;
  right: 20px !important;
  left: auto !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: 24px !important;
  height: 24px !important;
  z-index: 7 !important;
}
.category-screenshot-page .product-card.hd-category-card .hd-best-badge {
  margin-right: auto !important;
}
.category-screenshot-page .product-card.hd-category-card.layout-edit-card .hd-card-heart {
  right: 20px !important;
}



/* Mockup Editor: Reference Products Only presentation mode */
.editor-placeholder-toggle {
  transition: background .16s ease, color .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease;
}
.editor-placeholder-toggle.active {
  background: #1d1d1f !important;
  color: #fff !important;
  border-color: #1d1d1f !important;
  box-shadow: 0 8px 20px rgba(0,0,0,.16) !important;
}
.editor-placeholder-toggle.active svg {
  color: #fff !important;
  stroke: #fff !important;
}
.category-screenshot-page .product-card.hd-category-card.is-placeholder-product {
  background: #fff !important;
  border: 1px solid rgba(0,0,0,.04) !important;
  box-shadow: none !important;
  cursor: default !important;
}
.category-screenshot-page .product-card.hd-category-card.is-placeholder-product:hover {
  box-shadow: none !important;
  transform: none !important;
}
.category-screenshot-page .product-card.hd-category-card.is-placeholder-product .hd-card-topline {
  height: 42px;
}
.hd-placeholder-image-wrap {
  display: block !important;
  margin: 18px 16px 0 !important;
  cursor: default !important;
}
.hd-placeholder-image {
  aspect-ratio: 1 / 1;
  width: 100%;
  min-height: 0;
  border: 1px dashed rgba(0,0,0,.18);
  border-radius: 2px;
  background:
    radial-gradient(circle at 26% 22%, rgba(255,255,255,.9), transparent 26%),
    linear-gradient(135deg, #f1f1f3 0%, #fafafa 52%, #eeeeef 100%);
  color: #8e8e93;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -.01em;
  text-align: center;
}
.hd-placeholder-image svg {
  color: #b5b5bb;
  stroke-width: 1.8;
}
.category-screenshot-page .is-placeholder-product .hd-card-info {
  padding-top: 24px !important;
  min-height: auto;
}
.hd-placeholder-info {
  display: grid;
  gap: 11px;
  padding: 0;
  margin: 0;
}
.hd-placeholder-line {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, #ececef 0%, #f8f8f9 45%, #ececef 100%);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.015);
}
.hd-placeholder-line.wide { width: 92%; }
.hd-placeholder-line.medium { width: 68%; }
.hd-placeholder-line.short { width: 42%; }
.hd-placeholder-line.price {
  width: 54%;
  height: 32px;
  margin-top: 14px;
  border-radius: 10px;
}
.hd-placeholder-line.lower {
  width: 74%;
  margin-top: 8px;
}
.category-screenshot-page .is-placeholder-product .reference-border::after {
  display: none !important;
}
@media (max-width: 560px) {
  .hd-placeholder-image-wrap { margin: 16px 14px 0 !important; }
  .category-screenshot-page .is-placeholder-product .hd-card-info { padding-top: 20px !important; }
}



/* Reference Products Only: window/blind placeholder artwork */
.hd-placeholder-image {
  background:
    linear-gradient(180deg, #fbfbfc 0%, #f3f3f5 100%) !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  border-radius: 4px !important;
  position: relative;
  overflow: hidden;
}
.hd-placeholder-image::before {
  content: "";
  position: absolute;
  inset: 18px;
  border-radius: 22px;
  background: radial-gradient(circle at 50% 12%, rgba(255,255,255,.88), transparent 42%);
  pointer-events: none;
}
.hd-placeholder-image > svg,
.hd-placeholder-image > span {
  display: none !important;
}
.hd-placeholder-window {
  position: relative;
  width: min(68%, 190px);
  aspect-ratio: 4 / 5;
  border-radius: 14px 14px 10px 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%);
  border: 1px solid rgba(0,0,0,.13);
  box-shadow: 0 18px 38px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.95);
  overflow: hidden;
}
.hd-placeholder-window::before {
  content: "";
  position: absolute;
  inset: 12px 14px 14px;
  border-radius: 8px;
  background: linear-gradient(180deg, #eef5f8 0%, #f9fbfc 100%);
  border: 1px solid rgba(0,0,0,.08);
}
.hd-placeholder-window-bar {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 10px;
  height: 8px;
  border-radius: 999px;
  background: #d9d9dd;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
  z-index: 2;
}
.hd-placeholder-window-slat {
  position: absolute;
  left: 18px;
  right: 18px;
  height: 9px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff, #dedee3);
  border: 1px solid rgba(0,0,0,.055);
  z-index: 3;
  box-shadow: 0 2px 4px rgba(0,0,0,.04);
}
.hd-placeholder-window-slat:nth-of-type(2) { top: 34%; }
.hd-placeholder-window-slat:nth-of-type(3) { top: 44%; }
.hd-placeholder-window-slat:nth-of-type(4) { top: 54%; }
.hd-placeholder-window-slat:nth-of-type(5) { top: 64%; }
.hd-placeholder-window-slat:nth-of-type(6) { top: 74%; }
.hd-placeholder-window-pull {
  position: absolute;
  right: 22px;
  top: 32%;
  width: 2px;
  height: 46%;
  background: rgba(110,110,115,.38);
  z-index: 4;
}
.hd-placeholder-window-pull::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 8px;
  height: 8px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #c7c7cc;
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}



/* Reference Products Only: separated Apple-like presentation mode control */
.editor-panel:not(.editor-panel-product) .editor-actions-enhanced {
  border-bottom: 0 !important;
  box-shadow: none !important;
  padding-bottom: 10px !important;
}
.editor-reference-mode-wrap {
  padding: 0 28px 18px;
  background: rgba(245,245,247,.96);
  border-bottom: 1px solid rgba(0,0,0,.08);
}
.editor-reference-mode-card {
  min-height: 70px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,.86);
  border: 1px solid rgba(0,0,0,.08);
  box-shadow: 0 10px 28px rgba(0,0,0,.055), inset 0 1px 0 rgba(255,255,255,.75);
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.editor-reference-mode-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 34px rgba(0,0,0,.075), inset 0 1px 0 rgba(255,255,255,.8);
}
.editor-reference-mode-card.active {
  background: linear-gradient(180deg, #fffaf6 0%, #fff 100%);
  border-color: rgba(249,99,2,.30);
  box-shadow: 0 14px 34px rgba(249,99,2,.10), inset 0 1px 0 rgba(255,255,255,.85);
}
.editor-reference-mode-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #f5f5f7;
  color: #6e6e73;
  border: 1px solid rgba(0,0,0,.06);
}
.editor-reference-mode-card.active .editor-reference-mode-icon {
  background: #fff1e8;
  color: #f96302;
  border-color: rgba(249,99,2,.18);
}
.editor-reference-mode-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.editor-reference-mode-copy strong {
  color: #1d1d1f;
  font-size: 14px;
  line-height: 1.15;
  font-weight: 950;
  letter-spacing: -.01em;
}
.editor-reference-mode-copy span {
  color: #6e6e73;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 750;
}
.editor-reference-mode-switch {
  flex: 0 0 auto;
}
.editor-reference-mode-switch input:checked + i {
  background: #f96302 !important;
}

/* Placeholder image label */
.hd-placeholder-product-label {
  position: relative;
  z-index: 5;
  margin-top: 12px;
  color: #6e6e73;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.01em;
  text-align: center;
}
.hd-placeholder-image {
  gap: 12px !important;
}
.hd-placeholder-window {
  width: min(62%, 172px) !important;
}
@media (max-width: 820px) {
  .editor-reference-mode-wrap { padding: 0 20px 16px; }
  .editor-reference-mode-card { grid-template-columns: 38px minmax(0, 1fr) auto; padding: 13px 14px; }
}
@media (max-width: 560px) {
  .editor-reference-mode-card {
    grid-template-columns: 36px minmax(0, 1fr);
  }
  .editor-reference-mode-switch {
    grid-column: 1 / -1;
    justify-self: end;
    margin-top: 2px;
  }
  .hd-placeholder-product-label { font-size: 11px; }
}



/* Ensure Placeholder Product label is visible inside placeholder artwork */
.hd-placeholder-image > .hd-placeholder-product-label {
  display: block !important;
}
.hd-placeholder-product-label {
  position: relative !important;
  z-index: 8 !important;
  margin-top: 12px !important;
  color: #6e6e73 !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 950 !important;
  letter-spacing: -.01em !important;
  text-align: center !important;
}



/* Cleaner Apple-like Reference Products Only placeholders; mode supersedes rearrange visuals */
.category-screenshot-page .product-card.hd-category-card.is-placeholder-product {
  background: linear-gradient(180deg, #fff 0%, #fbfbfd 100%) !important;
  border: 1px solid rgba(0,0,0,.055) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.category-screenshot-page .product-card.hd-category-card.is-placeholder-product.layout-edit-card {
  outline: 1px solid rgba(0,0,0,.06) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.055) !important;
}
.category-screenshot-page .is-placeholder-product .hd-card-topline {
  min-height: 42px !important;
}
.category-screenshot-page .is-placeholder-product .layout-drag-handle,
.category-screenshot-page .is-placeholder-product .layout-position-badge {
  display: inline-grid !important;
}
.hd-placeholder-image-wrap {
  margin: 18px 18px 0 !important;
}
.hd-placeholder-image {
  border: 0 !important;
  border-radius: 22px !important;
  background:
    radial-gradient(circle at 50% 6%, rgba(255,255,255,.95), rgba(255,255,255,0) 44%),
    linear-gradient(180deg, #f7f7f9 0%, #ffffff 58%, #f1f1f4 100%) !important;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.9) !important;
  gap: 14px !important;
}
.hd-placeholder-image::before {
  inset: 22px !important;
  border-radius: 24px !important;
  background:
    linear-gradient(180deg, rgba(255,255,255,.75), rgba(255,255,255,0)),
    radial-gradient(circle at 50% 0%, rgba(255,255,255,.85), transparent 48%) !important;
}
.hd-placeholder-window {
  width: min(58%, 164px) !important;
  border-radius: 18px !important;
  background: rgba(255,255,255,.86) !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  box-shadow: 0 18px 42px rgba(0,0,0,.075), inset 0 1px 0 rgba(255,255,255,.95) !important;
}
.hd-placeholder-window::before {
  background: linear-gradient(180deg, #f1f6f8 0%, #fbfcfd 100%) !important;
  border-color: rgba(0,0,0,.055) !important;
}
.hd-placeholder-window-bar {
  background: #d8d8de !important;
}
.hd-placeholder-window-slat {
  height: 8px !important;
  background: linear-gradient(180deg, #fff 0%, #e6e6eb 100%) !important;
  border-color: rgba(0,0,0,.045) !important;
}
.hd-placeholder-window-pull {
  background: rgba(110,110,115,.30) !important;
}
.hd-placeholder-product-label {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(0,0,0,.06);
  color: #6e6e73 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 14px rgba(0,0,0,.045);
}
.category-screenshot-page .is-placeholder-product .hd-card-info {
  padding: 22px 22px 16px !important;
}
.hd-placeholder-info {
  gap: 12px !important;
}
.hd-placeholder-line {
  background: linear-gradient(90deg, #ededf0 0%, #fafafa 50%, #ededf0 100%) !important;
  opacity: .92;
}
.hd-placeholder-line.price {
  height: 30px !important;
  border-radius: 12px !important;
}



/* Placeholder Product label refinement: cleaner typography and balanced spacing */
.hd-placeholder-image {
  padding: 26px 22px 24px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 16px !important;
}
.hd-placeholder-window {
  width: min(52%, 148px) !important;
  flex: 0 0 auto !important;
}
.hd-placeholder-product-label {
  display: block !important;
  min-height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #6e6e73 !important;
  font-size: 12px !important;
  line-height: 1.15 !important;
  font-weight: 700 !important;
  letter-spacing: .01em !important;
  text-align: center !important;
  opacity: .92;
}
.category-screenshot-page .is-placeholder-product .hd-card-info {
  padding-top: 20px !important;
}
.hd-placeholder-info {
  gap: 10px !important;
}
.hd-placeholder-line.price {
  margin-top: 10px !important;
}
@media (max-width: 560px) {
  .hd-placeholder-image {
    padding: 22px 18px 20px !important;
    gap: 13px !important;
  }
  .hd-placeholder-window {
    width: min(54%, 138px) !important;
  }
  .hd-placeholder-product-label {
    font-size: 11.5px !important;
  }
}



/* Final Apple-style placeholder label typography */
.hd-placeholder-image {
  gap: 18px !important;
}
.hd-placeholder-product-label {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  font-weight: 700 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
  color: #86868b !important;
  opacity: 1 !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
.hd-placeholder-product-label::before {
  content: "";
  display: block;
  width: 28px;
  height: 1px;
  margin: 0 auto 10px;
  background: rgba(134,134,139,.30);
}
@media (max-width: 560px) {
  .hd-placeholder-product-label {
    font-size: 10.5px !important;
    letter-spacing: .055em !important;
  }
  .hd-placeholder-product-label::before {
    margin-bottom: 8px;
  }
}



/* Native Customize and Buy configurator */
.config-page {
  max-width: 1226px;
  margin: 0 auto;
  padding: 10px 0 44px;
  color: #1d1d1f;
}
.config-breadcrumb {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #777;
  font-size: 14px;
  flex-wrap: wrap;
}
.config-breadcrumb button {
  border: 0;
  background: transparent;
  color: #246b98;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 30px 0 22px;
}
.config-kicker {
  color: #f96302;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .09em;
  text-transform: uppercase;
}
.config-header h1 {
  margin: 6px 0 8px;
  font-size: 46px;
  line-height: 1;
  letter-spacing: -.035em;
  font-weight: 700;
}
.config-header p {
  max-width: 760px;
  margin: 0;
  color: #6e6e73;
  font-size: 15px;
  line-height: 1.45;
  font-weight: 700;
}
.config-exit {
  min-height: 38px;
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 999px;
  background: #fff;
  color: #1d1d1f;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
}
.config-layout {
  display: grid;
  grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.config-preview-card,
.config-workspace {
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 24px;
  box-shadow: 0 18px 54px rgba(0,0,0,.07);
}
.config-preview-card {
  position: sticky;
  top: 92px;
  padding: 20px;
}
.config-product-art {
  height: 310px;
  border-radius: 20px;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.config-product-art img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
  background: #fff;
}
.config-product-copy {
  display: grid;
  gap: 6px;
  padding: 16px 2px 12px;
}
.config-product-copy strong {
  font-size: 15px;
  line-height: 1.28;
  font-weight: 850;
}
.config-product-copy span,
.config-preview-card small {
  color: #6e6e73;
  font-size: 12px;
  font-weight: 750;
}
.config-price {
  display: flex;
  align-items: flex-start;
  color: #1d1d1f;
  margin-top: 4px;
}
.config-price span,
.config-price sup {
  font-size: 18px;
  font-weight: 950;
  padding-top: 9px;
}
.config-price strong {
  font-size: 48px;
  line-height: .95;
  letter-spacing: -.04em;
  font-weight: 950;
}
.config-workspace {
  padding: 20px;
}
.config-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0,1fr));
  gap: 8px;
  padding: 6px;
  border-radius: 18px;
  background: #f5f5f7;
  margin-bottom: 18px;
}
.config-steps button {
  min-height: 46px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #6e6e73;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 950;
}
.config-steps button span {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e8e8ed;
  color: #6e6e73;
  font-size: 11px;
}
.config-steps button.active {
  background: #fff;
  color: #1d1d1f;
  box-shadow: 0 8px 18px rgba(0,0,0,.08);
}
.config-steps button.active span,
.config-steps button.complete span {
  background: #f96302;
  color: #fff;
}
.config-step-card {
  min-height: 430px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.06);
  padding: 22px;
}
.config-section-title {
  display: grid;
  gap: 5px;
  padding-bottom: 18px;
}
.config-section-title strong {
  font-size: 22px;
  letter-spacing: -.025em;
  font-weight: 950;
}
.config-section-title span {
  color: #6e6e73;
  font-size: 13px;
  line-height: 1.45;
  font-weight: 700;
}
.config-measure-grid,
.config-option-grid,
.config-swatch-grid,
.config-review-list {
  display: grid;
  gap: 12px;
}
.config-measure-grid {
  grid-template-columns: repeat(2, minmax(0,1fr));
}
.config-field {
  display: grid;
  gap: 7px;
  color: #6e6e73;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: .045em;
}
.config-select-shell {
  position: relative;
}
.config-select-shell select {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.12);
  background: #fff;
  padding: 0 38px 0 13px;
  appearance: none;
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 700;
}
.config-select-shell svg {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #f96302;
  pointer-events: none;
}
.config-help-card {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 16px;
  background: #fff7f0;
  color: #854000;
  font-size: 13px;
  font-weight: 750;
}
.config-option-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
.config-option-grid.two { grid-template-columns: repeat(2, minmax(0,1fr)); }
.config-option-card {
  min-height: 128px;
  border: 1px solid rgba(0,0,0,.09);
  border-radius: 18px;
  background: #fff;
  padding: 16px;
  display: grid;
  gap: 8px;
  justify-items: start;
  text-align: left;
  color: #1d1d1f;
}
.config-option-card strong { font-size: 15px; font-weight: 950; }
.config-option-card small { color: #6e6e73; font-size: 12px; font-weight: 750; }
.config-option-card.active,
.config-swatch.active {
  border-color: rgba(249,99,2,.55);
  box-shadow: 0 0 0 4px rgba(249,99,2,.12);
}
.config-window-icon {
  width: 42px;
  height: 52px;
  border-radius: 10px;
  background: repeating-linear-gradient(180deg, #fff 0 7px, #e5e5ea 8px 10px);
  border: 1px solid rgba(0,0,0,.10);
}
.config-swatch-grid { grid-template-columns: repeat(5, minmax(0,1fr)); }
.config-swatch {
  min-height: 128px;
  border: 1px solid rgba(0,0,0,.09);
  border-radius: 18px;
  background: #fff;
  padding: 14px;
  display: grid;
  gap: 10px;
  justify-items: center;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 700;
}
.config-swatch i {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,.12);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.75);
}
.config-review-list {
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 18px;
  overflow: hidden;
}
.config-review-list div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 15px 16px;
  border-bottom: 1px solid rgba(0,0,0,.06);
}
.config-review-list div:last-child { border-bottom: 0; }
.config-review-list span { color: #6e6e73; font-size: 13px; font-weight: 700; }
.config-review-list strong { font-size: 13px; font-weight: 950; text-align: right; }
.config-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
}
.config-primary,
.config-secondary {
  min-height: 44px;
  border-radius: 999px;
  padding: 0 20px;
  font-weight: 950;
  border: 1px solid rgba(0,0,0,.12);
}
.config-primary { background: #f96302; color: #fff; border-color: #f96302; }
.config-secondary { background: #fff; color: #1d1d1f; }
.config-secondary:disabled { opacity: .38; cursor: not-allowed; }
@media (max-width: 1000px) {
  .config-layout { grid-template-columns: 1fr; }
  .config-preview-card { position: static; display: grid; grid-template-columns: 180px 1fr auto; align-items: center; gap: 16px; }
  .config-product-art { height: 160px; }
}
@media (max-width: 700px) {
  .config-page { padding-left: 12px; padding-right: 12px; }
  .config-header { display: grid; }
  .config-header h1 { font-size: 34px; }
  .config-preview-card { grid-template-columns: 1fr; }
  .config-steps { grid-template-columns: 1fr; }
  .config-measure-grid, .config-option-grid, .config-option-grid.two, .config-swatch-grid { grid-template-columns: 1fr; }
  .config-footer-actions { display: grid; grid-template-columns: 1fr 1fr; }
}



/* Screenshot-matched Home Depot configurator, no color section */
.hd-configurator-page {
  max-width: 1226px;
  margin: 0 auto;
  padding: 8px 0 60px;
  color: #333;
  background: #fff;
}
.hd-configurator-breadcrumb {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #4f7d94;
}
.hd-configurator-breadcrumb button {
  border: 0;
  background: transparent;
  padding: 0;
  color: #4f7d94;
  font-size: 11px;
}
.hd-configurator-layout {
  display: grid;
  grid-template-columns: 560px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.hd-configurator-form {
  padding-top: 34px;
}
.hd-configurator-form h1 {
  margin: 0 0 22px;
  text-align: center;
  font-size: 18px;
  line-height: 1.2;
  font-weight: 500;
  color: #333;
}
.hd-config-fit-bar {
  height: 42px;
  margin-bottom: 22px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #555;
  font-size: 16px;
  font-weight: 500;
}
.hd-config-fit-icon {
  color: #f96302;
  font-size: 34px;
  line-height: 1;
  transform: rotate(-10deg);
}
.hd-config-section {
  margin-bottom: 28px;
}
.hd-config-section h2 {
  margin: 0 0 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid #bfbfbf;
  font-size: 18px;
  line-height: 1.2;
  color: #333;
  font-weight: 400;
}
.hd-config-section h2 span {
  font-size: 12px;
  color: #333;
}
.hd-config-name-field {
  display: grid;
  gap: 2px;
}
.hd-config-name-field span {
  color: #f96302;
  font-size: 12px;
  font-weight: 400;
}
.hd-config-name-field em {
  color: #777;
  font-style: normal;
}
.hd-config-name-field input {
  height: 30px;
  border: 0;
  border-bottom: 1px solid #9b9b9b;
  padding: 0;
  font-size: 12px;
  outline: none;
}
.hd-config-name-field small {
  color: #777;
  font-size: 10px;
}
.hd-config-mount-list {
  display: grid;
  gap: 20px;
}
.hd-config-mount-option {
  display: grid;
  grid-template-columns: 174px minmax(0, 1fr);
  gap: 18px;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  color: #333;
}
.hd-config-mount-option.active .hd-config-mount-media {
  outline: 3px solid #f96302;
  outline-offset: 2px;
}
.hd-config-mount-media {
  position: relative;
  height: 112px;
  background: #eee;
  overflow: hidden;
}
.hd-config-play {
  position: absolute;
  left: 0;
  bottom: -16px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid #8c8c8c;
  background: #fff;
  color: #777;
  display: grid;
  place-items: center;
  font-size: 18px;
  transform: rotate(180deg);
}
.hd-config-mount-copy {
  padding-top: 4px;
}
.hd-config-mount-copy strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}
.hd-config-mount-copy b {
  display: block;
  color: #168044;
  font-size: 11px;
  margin-bottom: 4px;
}
.hd-config-mount-copy p {
  margin: 0;
  color: #555;
  font-size: 11px;
  line-height: 1.35;
}
.hd-config-mount-copy em {
  display: block;
  margin-top: 4px;
  color: #333;
  font-size: 11px;
  font-weight: 700;
}
.hd-config-mount-illustration {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #d9d9d9, #f7f7f7);
}
.hd-config-mount-frame {
  position: absolute;
  left: 18px;
  top: 16px;
  width: 154px;
  height: 84px;
  background: #fff;
  border: 6px solid #d2d2d2;
  box-shadow: 0 4px 8px rgba(0,0,0,.15);
  transform: perspective(280px) rotateY(-14deg);
  overflow: hidden;
}
.hd-config-mount-frame span {
  display: block;
  height: 9px;
  margin: 5px 8px;
  background: linear-gradient(180deg, #fff, #bfc6c8);
  border-radius: 999px;
}
.hd-config-mount-blue {
  position: absolute;
  left: 30px;
  top: 21px;
  width: 142px;
  height: 12px;
  background: #3ba0c4;
  transform: perspective(280px) rotateY(-14deg);
}
.hd-config-size-section {
  margin-top: 34px;
}
.hd-config-validation {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 10px 0 20px;
  color: #f96302;
  font-size: 11px;
}
.hd-config-size-row {
  margin-bottom: 28px;
}
.hd-config-size-row h3 {
  margin: 0 0 8px;
  color: #333;
  font-size: 16px;
  font-weight: 400;
}
.hd-config-size-row h3 em {
  color: #333;
  font-style: normal;
}
.hd-config-size-controls {
  display: flex;
  gap: 4px;
}
.hd-config-mini-select {
  position: relative;
  display: inline-flex;
  width: 50px;
  height: 35px;
  border: 1px solid #bbb;
  background: #fff;
}
.hd-config-mini-select select {
  width: 100%;
  height: 100%;
  border: 0;
  appearance: none;
  background: transparent;
  padding: 0 14px 0 5px;
  color: #333;
  font-size: 11px;
}
.hd-config-mini-select select:disabled {
  color: #999;
  background: #fafafa;
}
.hd-config-mini-select svg {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  color: #f96302;
  pointer-events: none;
}
.hd-configurator-preview {
  position: sticky;
  top: 88px;
  padding-top: 24px;
}
.hd-config-product-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
  min-height: 92px;
}
.hd-config-product-summary h2 {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 700;
  color: #333;
}
.hd-config-product-summary p {
  margin: 0 0 2px;
  font-size: 11px;
  line-height: 1.25;
  color: #333;
}
.hd-config-product-summary a {
  color: #126b93;
  text-decoration: none;
}
.hd-config-price-block {
  text-align: right;
}
.hd-config-price-block div {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  color: #333;
}
.hd-config-price-block div span,
.hd-config-price-block div sup {
  font-size: 15px;
  font-weight: 700;
  padding-top: 5px;
}
.hd-config-price-block div strong {
  font-size: 34px;
  line-height: .9;
  font-weight: 700;
}
.hd-config-price-block s,
.hd-config-price-block b,
.hd-config-price-block small {
  display: block;
  font-size: 11px;
}
.hd-config-price-block b {
  color: #168044;
}
.hd-config-preview-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  color: #555;
}
.hd-config-preview-kicker span {
  display: inline-block;
  margin-right: 6px;
  background: #ffcf00;
  color: #333;
  padding: 2px 5px;
  font-size: 11px;
  font-weight: 700;
}
.hd-config-preview-stage {
  position: relative;
  height: 445px;
  background: #d7d7d7;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hd-config-zoom {
  position: absolute;
  top: -27px;
  right: 10px;
  height: 26px;
  border: 2px solid #f96302;
  background: #fff;
  color: #f96302;
  font-size: 11px;
  font-weight: 700;
}
.hd-config-window-preview {
  width: 390px;
  height: 315px;
  background: #ededed;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.20);
}
.hd-config-window-frame {
  position: relative;
  width: 360px;
  height: 280px;
  border: 8px solid #c7c7c7;
  background: #fff;
  box-shadow: inset 0 0 0 2px #efefef;
  overflow: hidden;
}
.hd-config-cellular-shade {
  position: absolute;
  inset: 0 0 108px;
  background: #e6e6e1;
  padding-top: 8px;
  border-bottom: 4px solid #9a9a92;
}
.hd-config-cellular-shade span {
  display: block;
  height: 7px;
  margin: 0 0 3px;
  background: linear-gradient(180deg, #fafafa, #b8bab4 60%, #efefea);
  border-bottom: 1px solid rgba(0,0,0,.18);
}
.hd-config-window-view {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 108px;
  background: linear-gradient(180deg, #eff6ef, #d8ead6);
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}
.hd-config-window-view i {
  border-right: 4px solid #d9d9d9;
  background: radial-gradient(circle at 50% 70%, #a7d39d 0 18%, transparent 19%), linear-gradient(180deg, #f8fbff, #dfeede);
}
.hd-config-feedback {
  position: fixed;
  right: 0;
  top: 190px;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  border: 2px solid #f96302;
  background: #fff;
  color: #f96302;
  padding: 7px 4px;
  font-size: 11px;
  font-weight: 700;
  z-index: 50;
}
@media (max-width: 1000px) {
  .hd-configurator-layout { grid-template-columns: 1fr; }
  .hd-configurator-preview { position: static; }
}
@media (max-width: 620px) {
  .hd-configurator-page { padding: 8px 12px 40px; }
  .hd-config-mount-option { grid-template-columns: 130px 1fr; }
  .hd-config-mount-media { height: 92px; }
  .hd-config-product-summary { grid-template-columns: 1fr; }
  .hd-config-price-block { text-align: left; }
  .hd-config-price-block div { justify-content: flex-start; }
  .hd-config-preview-stage { height: 330px; }
  .hd-config-window-preview { width: 290px; height: 240px; }
  .hd-config-window-frame { width: 260px; height: 205px; }
}



/* Detailed Home Depot custom blinds configurator mockup, color section intentionally omitted */
.hdc-page, .hdc-page * { box-sizing: border-box; }
.hdc-page {
  max-width: 1260px;
  margin: 0 auto;
  padding: 0 16px 56px;
  background: #fff;
  color: #333;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.hdc-category-row {
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-bottom: 1px solid #e5e5e5;
  color: #444;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
}
.hdc-breadcrumb {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #517d91;
  font-size: 12px;
}
.hdc-breadcrumb button {
  border: 0;
  background: transparent;
  padding: 0;
  color: #517d91;
  font-size: 12px;
}
.hdc-layout {
  display: grid;
  grid-template-columns: minmax(0, 65%) minmax(340px, 35%);
  gap: 32px;
  align-items: start;
}
.hdc-left { min-width: 0; }
.hdc-title-block {
  padding: 28px 0 14px;
}
.hdc-title-block h1 {
  margin: 0 0 18px;
  text-align: center;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 500;
  color: #333;
}
.hdc-fit {
  height: 42px;
  background: #f4f4f4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #555;
  font-size: 16px;
}
.hdc-fit span {
  color: #f96302;
  font-size: 25px;
  font-weight: 700;
  transform: rotate(-10deg);
}
.hdc-section {
  margin: 0 0 34px;
}
.hdc-section h2 {
  margin: 0 0 12px;
  padding-bottom: 7px;
  border-bottom: 1px solid #c7c7c7;
  font-size: 20px;
  line-height: 1.2;
  color: #333;
  font-weight: 500;
}
.hdc-section h2 span {
  margin-left: 3px;
  font-size: 12px;
  font-weight: 400;
}
.hdc-window-name {
  display: grid;
  gap: 5px;
}
.hdc-window-name span {
  color: #f96302;
  font-size: 12px;
}
.hdc-window-name em {
  color: #777;
  font-style: normal;
  margin-left: 2px;
}
.hdc-window-name input {
  width: 100%;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 0;
  padding: 0 10px;
  color: #333;
  font-size: 16px;
}
.hdc-window-name small {
  color: #666;
  font-size: 11px;
}
.hdc-option-stack {
  display: grid;
  gap: 12px;
}
.hdc-option-card {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: 24px 132px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  border: 1px solid #d6d6d6;
  border-radius: 0;
  background: #fff;
  padding: 14px 16px;
  color: #333;
  text-align: left;
}
.hdc-option-stack.no-media .hdc-option-card,
.hdc-option-stack.compact .hdc-option-card {
  grid-template-columns: 24px minmax(0, 1fr);
}
.hdc-option-card.selected {
  border-color: #f96302;
  box-shadow: inset 0 0 0 1px #f96302;
}
.hdc-radio {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border-radius: 50%;
  border: 1px solid #777;
  background: #fff;
}
.hdc-option-card.selected .hdc-radio {
  border: 5px solid #f96302;
}
.hdc-option-media {
  width: 132px;
  height: 96px;
  border: 1px solid #d6d6d6;
  background: #eee;
  overflow: hidden;
}
.hdc-mini-art {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ddd, #f7f7f7);
}
.hdc-mini-window {
  position: absolute;
  left: 18px;
  top: 14px;
  width: 116px;
  height: 70px;
  border: 5px solid #c6c6c6;
  background: #fff;
  box-shadow: 0 3px 8px rgba(0,0,0,.16);
  transform: perspective(240px) rotateY(-13deg);
  overflow: hidden;
}
.hdc-mini-window span {
  display: block;
  height: 5px;
  margin: 3px 6px;
  background: linear-gradient(180deg, #fff, #bfc4c5);
  border-radius: 999px;
}
.hdc-mini-art i {
  position: absolute;
  left: 27px;
  top: 19px;
  width: 104px;
  height: 8px;
  background: #389bc0;
  transform: perspective(240px) rotateY(-13deg);
}
.hdc-option-copy { min-width: 0; }
.hdc-option-title-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}
.hdc-option-title-row strong {
  color: #333;
  font-size: 14px;
  line-height: 1.2;
  font-weight: 700;
}
.hdc-option-price {
  display: grid;
  justify-items: end;
  gap: 1px;
  min-width: 86px;
}
.hdc-option-price b {
  color: #333;
  font-size: 13px;
  font-weight: 700;
}
.hdc-option-price em {
  color: #168044;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}
.hdc-option-copy p {
  margin: 5px 0 0;
  color: #555;
  font-size: 12px;
  line-height: 1.35;
}
.hdc-option-copy small {
  display: block;
  margin-top: 5px;
  color: #333;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 700;
  font-style: italic;
}
.hdc-alert {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 10px 0 18px;
  color: #f96302;
  font-size: 12px;
}
.hdc-alert.small { margin: 8px 0 0; }
.hdc-measure-group {
  margin-bottom: 24px;
}
.hdc-measure-group h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #333;
  font-weight: 500;
}
.hdc-measure-group h3 em { font-style: normal; }
.hdc-measure-selects {
  display: flex;
  gap: 8px;
}
.hdc-select-box {
  display: grid;
  gap: 4px;
  color: #666;
  font-size: 11px;
}
.hdc-select-box select {
  width: 86px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 0;
  background: #fff;
  color: #333;
  padding: 0 8px;
  font-size: 12px;
}
.hdc-select-box select:disabled {
  color: #999;
  background: #f8f8f8;
}
.hdc-right {
  position: sticky;
  top: 20px;
  display: grid;
  gap: 16px;
  padding-top: 28px;
}
.hdc-review-card,
.hdc-preview-card {
  background: #fff;
  border: 1px solid #d6d6d6;
  border-radius: 0;
  padding: 16px;
}
.hdc-review-card h2 {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ccc;
  font-size: 19px;
  font-weight: 700;
}
.hdc-review-rows {
  display: grid;
  gap: 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 12px;
}
.hdc-review-rows div,
.hdc-review-ship,
.hdc-qty {
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #eee;
  font-size: 13px;
}
.hdc-review-rows span,
.hdc-review-ship span,
.hdc-qty span {
  color: #666;
}
.hdc-review-rows b,
.hdc-review-ship strong {
  color: #333;
  font-weight: 700;
  text-align: right;
}
.hdc-review-ship strong { color: #168044; }
.hdc-qty input {
  width: 62px;
  height: 36px;
  border: 1px solid #ccc;
  padding: 0 6px;
  text-align: center;
}
.hdc-total {
  padding: 12px 0;
  text-align: right;
  border-top: 1px solid #eee;
}
.hdc-total > span {
  float: left;
  color: #333;
  font-size: 15px;
  font-weight: 700;
}
.hdc-total s {
  display: block;
  color: #666;
  font-size: 13px;
}
.hdc-total b {
  display: block;
  color: #c44900;
  font-size: 12px;
  text-transform: uppercase;
}
.hdc-total div,
.hdc-side-price strong {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  color: #333;
}
.hdc-total div span,
.hdc-total div sup {
  font-size: 20px;
  font-weight: 700;
  padding-top: 6px;
}
.hdc-total div strong {
  font-size: 42px;
  line-height: .95;
  font-weight: 700;
}
.hdc-add-cart {
  width: 100%;
  height: 48px;
  border: 0;
  background: #f96302;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
}
.hdc-save-product {
  width: 100%;
  margin-top: 10px;
  border: 0;
  background: transparent;
  color: #126b93;
  font-size: 13px;
  font-weight: 700;
}
.hdc-preview-summary h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
}
.hdc-preview-summary p {
  margin: 0 0 2px;
  color: #333;
  font-size: 14px;
  line-height: 1.28;
}
.hdc-preview-summary a { color: #126b93; }
.hdc-side-price {
  margin-top: 8px;
  text-align: right;
}
.hdc-side-price s,
.hdc-side-price b,
.hdc-side-price small {
  display: block;
  font-size: 12px;
}
.hdc-side-price b { color: #c44900; }
.hdc-side-price strong {
  display: block;
  font-size: 26px;
  font-weight: 700;
}
@media (max-width: 980px) {
  .hdc-layout { grid-template-columns: 1fr; }
  .hdc-right { position: static; padding-top: 0; }
}
@media (max-width: 640px) {
  .hdc-page { padding-left: 10px; padding-right: 10px; }
  .hdc-category-row { flex-wrap: wrap; white-space: normal; gap: 8px 14px; padding: 8px 0; }
  .hdc-option-card, .hdc-option-stack.no-media .hdc-option-card, .hdc-option-stack.compact .hdc-option-card { grid-template-columns: 24px minmax(0, 1fr); }
  .hdc-option-media { display: none; }
  .hdc-option-title-row { grid-template-columns: 1fr; }
  .hdc-option-price { justify-items: start; }
  .hdc-measure-selects { flex-wrap: wrap; }
}



/* Screenshot calibration for Home Depot configurator: spacing, columns, borders, sticky preview */
.hdc-category-row {
  display: none !important;
}
.hdc-page {
  max-width: 1390px !important;
  padding: 0 34px 70px !important;
}
.hdc-breadcrumb {
  height: 45px !important;
  min-height: 45px !important;
  margin: 0 -34px 0 !important;
  padding: 0 40px !important;
  background: #f3f3f3 !important;
  border-top: 1px solid #d8d8d8;
  border-bottom: 1px solid #e5e5e5;
  gap: 10px !important;
  color: #2d6f91 !important;
  font-size: 13px !important;
}
.hdc-breadcrumb button,
.hdc-breadcrumb span {
  color: #2d6f91 !important;
  font-size: 13px !important;
}
.hdc-layout {
  grid-template-columns: minmax(560px, 1fr) minmax(560px, 1.03fr) !important;
  gap: 28px !important;
  align-items: start !important;
}
.hdc-left {
  padding-top: 32px;
}
.hdc-title-block {
  padding: 0 0 28px !important;
}
.hdc-title-block h1 {
  margin: 0 0 28px !important;
  font-size: 24px !important;
  line-height: 1.2 !important;
  font-weight: 400 !important;
  text-align: center !important;
}
.hdc-fit {
  width: 100% !important;
  height: 48px !important;
  background: #f5f5f5 !important;
  color: #666 !important;
  font-size: 24px !important;
  font-weight: 300 !important;
}
.hdc-fit span {
  font-size: 31px !important;
}
.hdc-section {
  margin-bottom: 34px !important;
}
.hdc-section h2 {
  position: relative;
  margin-bottom: 14px !important;
  padding-bottom: 8px !important;
  border-bottom: 1px solid #bdbdbd !important;
  font-size: 24px !important;
  font-weight: 400 !important;
}
.hdc-section h2::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 64px;
  height: 2px;
  background: #f96302;
}
.hdc-section h2 span {
  font-size: 14px !important;
}
.hdc-window-name input {
  height: 38px !important;
  border-color: #9f9f9f !important;
  font-size: 14px !important;
}
.hdc-window-name span {
  color: #333 !important;
  font-size: 15px !important;
}
.hdc-window-name small {
  font-size: 12px !important;
  color: #666 !important;
}
.hdc-option-stack {
  gap: 18px !important;
}
.hdc-option-card {
  grid-template-columns: 190px minmax(0, 1fr) !important;
  padding: 0 0 4px !important;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  gap: 28px !important;
  min-height: 140px;
}
.hdc-option-card.selected {
  border: 0 !important;
  box-shadow: none !important;
}
.hdc-radio {
  display: none !important;
}
.hdc-option-media {
  width: 190px !important;
  height: 122px !important;
  border: 0 !important;
  background: #e6e6e6 !important;
}
.hdc-option-media::after {
  content: "›";
  position: absolute;
  margin-top: 130px;
  margin-left: -185px;
  width: 24px;
  height: 24px;
  border: 2px solid #a4a4a4;
  color: #8a8a8a;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  transform: rotate(180deg);
  background: #fff;
  font-size: 18px;
  line-height: 1;
}
.hdc-mini-window {
  left: 18px !important;
  top: 14px !important;
  width: 178px !important;
  height: 102px !important;
}
.hdc-mini-art i {
  left: 30px !important;
  top: 20px !important;
  width: 164px !important;
}
.hdc-option-title-row {
  grid-template-columns: minmax(0, 1fr) auto !important;
}
.hdc-option-title-row strong {
  font-size: 20px !important;
  line-height: 1.2 !important;
}
.hdc-option-copy p {
  font-size: 16px !important;
  line-height: 1.42 !important;
  color: #555 !important;
  margin-top: 10px !important;
}
.hdc-option-copy small {
  font-size: 15px !important;
  margin-top: 4px !important;
}
.hdc-option-price b {
  font-size: 12px !important;
  text-decoration: line-through;
  color: #333 !important;
}
.hdc-option-price em {
  font-size: 12px !important;
  color: #00873c !important;
}
.hdc-alert {
  margin: 26px 0 32px !important;
  font-size: 14px !important;
  color: #f96302 !important;
}
.hdc-alert span {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  background: #f96302;
  color: #fff;
  font-size: 9px;
}
.hdc-measure-group {
  margin-bottom: 34px !important;
  padding-bottom: 18px;
  border-bottom: 1px solid #eee;
}
.hdc-measure-group h3 {
  font-size: 24px !important;
  font-weight: 400 !important;
  margin-bottom: 12px !important;
}
.hdc-measure-selects {
  gap: 0 !important;
}
.hdc-select-box {
  position: relative;
  width: 62px !important;
  height: 37px !important;
  border: 1px solid #aaa;
  margin-right: 6px;
  display: block !important;
  color: #666 !important;
  font-size: 9px !important;
}
.hdc-select-box span {
  position: absolute;
  top: 3px;
  left: 7px;
  z-index: 2;
  font-size: 9px;
  line-height: 1;
}
.hdc-select-box select {
  width: 100% !important;
  height: 100% !important;
  border: 0 !important;
  padding: 13px 18px 0 7px !important;
  font-size: 12px !important;
  background: #fff !important;
}
.hdc-select-box::after {
  content: "⌄";
  position: absolute;
  right: 5px;
  top: 10px;
  color: #f96302;
  font-size: 16px;
  pointer-events: none;
}
.hdc-right {
  position: sticky !important;
  top: 16px !important;
  padding-top: 32px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 18px !important;
}
.hdc-preview-card {
  order: 1;
  border: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}
.hdc-review-card {
  order: 2;
}
.hdc-preview-summary {
  position: relative;
  min-height: 104px;
  padding-right: 140px;
}
.hdc-preview-summary h3 {
  font-size: 22px !important;
  font-weight: 400 !important;
  margin-bottom: 6px !important;
}
.hdc-preview-summary p {
  font-size: 14px !important;
  line-height: 1.3 !important;
}
.hdc-side-price {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 130px;
  margin: 0 !important;
}
.hdc-side-price strong {
  font-size: 0 !important;
}
.hdc-side-price strong::before {
  content: "$102";
  color: #333;
  font-size: 34px;
  font-weight: 700;
  line-height: .9;
}
.hdc-side-price strong::after {
  content: "60";
  color: #333;
  font-size: 17px;
  font-weight: 700;
  vertical-align: top;
  position: relative;
  top: -10px;
}
.hdc-side-price s {
  font-size: 14px !important;
  color: #777 !important;
}
.hdc-side-price b {
  font-size: 14px !important;
  color: #009246 !important;
}
.hdc-side-price small {
  font-size: 11px !important;
}
@media (max-width: 1120px) {
  .hdc-layout { grid-template-columns: 1fr !important; }
  .hdc-right { position: static !important; }
}
@media (max-width: 640px) {
  .hdc-page { padding: 0 12px 50px !important; }
  .hdc-breadcrumb { margin: 0 -12px !important; padding: 0 12px !important; }
  .hdc-option-card { grid-template-columns: 1fr !important; }
  .hdc-option-media { width: 100% !important; }
  .hdc-preview-summary { padding-right: 0; }
  .hdc-side-price { position: static; text-align: left; margin-top: 10px !important; }
}



/* Final screenshot spacing pass: Home Depot configurator proportions */
.hdc-page {
  max-width: 1288px !important;
  padding: 0 0 72px !important;
}
.hdc-breadcrumb {
  margin: 0 calc((1288px - 100vw) / 2) !important;
  padding-left: max(24px, calc((100vw - 1288px) / 2 + 8px)) !important;
  padding-right: max(24px, calc((100vw - 1288px) / 2 + 8px)) !important;
}
.hdc-layout {
  grid-template-columns: 626px 1fr !important;
  gap: 24px !important;
  width: 100% !important;
}
.hdc-left {
  padding-top: 30px !important;
}
.hdc-right {
  padding-top: 30px !important;
}
.hdc-title-block {
  padding-bottom: 26px !important;
}
.hdc-title-block h1 {
  margin-bottom: 28px !important;
  font-size: 24px !important;
}
.hdc-fit {
  height: 49px !important;
  margin: 0 !important;
}
.hdc-section {
  margin-bottom: 36px !important;
}
.hdc-window-name input {
  width: 100% !important;
}
.hdc-option-card {
  grid-template-columns: 190px minmax(0,1fr) !important;
  gap: 32px !important;
  min-height: 145px !important;
  margin-bottom: 0 !important;
}
.hdc-option-stack {
  gap: 24px !important;
}
.hdc-option-media {
  width: 190px !important;
  height: 122px !important;
}
.hdc-option-copy {
  padding-top: 0 !important;
}
.hdc-option-title-row strong {
  font-size: 20px !important;
}
.hdc-option-copy p {
  max-width: 390px;
}
.hdc-size-section {
  margin-top: 42px !important;
}
.hdc-measure-group {
  margin-bottom: 32px !important;
}
.hdc-preview-summary {
  min-height: 112px !important;
  padding-right: 150px !important;
}
.hdc-review-card {
  margin-top: 0 !important;
}
@media (min-width: 1289px) {
  .hdc-page {
    max-width: 1288px !important;
  }
}
@media (max-width: 1320px) {
  .hdc-page {
    padding-left: 22px !important;
    padding-right: 22px !important;
  }
  .hdc-layout {
    grid-template-columns: minmax(560px, 626px) minmax(500px, 1fr) !important;
  }
}
@media (max-width: 1120px) {
  .hdc-layout {
    grid-template-columns: 1fr !important;
  }
  .hdc-preview-summary {
    padding-right: 0 !important;
  }
}




/* Optimized configurator page: shared chrome is left untouched, layout starts at breadcrumb */
.hd-root:has(.hdc-page) .page {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
}
.hdc-page,
.hdc-page * {
  box-sizing: border-box;
}
.hdc-page {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 0 72px !important;
  overflow-x: clip !important;
  background: #fff !important;
  color: #333 !important;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;
}
.hdc-category-row { display: none !important; }
.hdc-breadcrumb {
  width: min(1322px, calc(100vw - 48px)) !important;
  height: 43px !important;
  min-height: 43px !important;
  margin: 0 auto 14px !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 10px !important;
  color: #777 !important;
  font-size: 14px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  overflow-x: auto !important;
  scrollbar-width: none;
}
.hdc-breadcrumb::-webkit-scrollbar { display: none; }
.hdc-breadcrumb button,
.hdc-breadcrumb span {
  flex: 0 0 auto !important;
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  color: #246b98 !important;
  font-size: 14px !important;
  line-height: 1 !important;
}
.hdc-breadcrumb span { color: #777 !important; }
.hdc-breadcrumb button:hover { text-decoration: underline !important; }
.hdc-layout {
  width: min(1322px, calc(100vw - 48px)) !important;
  margin: 0 auto !important;
  display: grid !important;
  grid-template-columns: minmax(520px, 1fr) minmax(420px, 540px) !important;
  gap: clamp(24px, 3vw, 44px) !important;
  align-items: start !important;
  background: #fff !important;
  zoom: 1 !important;
  transform: none !important;
  transform-origin: initial !important;
}
.hdc-left,
.hdc-right {
  min-width: 0 !important;
  width: auto !important;
  padding-top: 0 !important;
  background: #fff !important;
}
.hdc-title-block { padding: 0 0 24px !important; }
.hdc-title-block h1 {
  margin: 0 0 18px !important;
  text-align: center !important;
  color: #333 !important;
  font-size: 22px !important;
  line-height: 1.25 !important;
  font-weight: 400 !important;
}
.hdc-fit {
  width: 100% !important;
  min-height: 42px !important;
  padding: 8px 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  background: #f5f5f5 !important;
  color: #555 !important;
  font-size: 20px !important;
  line-height: 1.15 !important;
  font-weight: 400 !important;
}
.hdc-fit span { color: #f96302 !important; font-size: 26px !important; line-height: 1 !important; }
.hdc-section { margin: 0 0 32px !important; }
.hdc-section h2 {
  position: relative !important;
  margin: 0 0 13px !important;
  padding: 0 0 8px !important;
  border-bottom: 1px solid #bdbdbd !important;
  color: #333 !important;
  font-size: 22px !important;
  line-height: 1.2 !important;
  font-weight: 400 !important;
}
.hdc-section h2::after {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  bottom: -1px !important;
  width: 64px !important;
  height: 2px !important;
  background: #f96302 !important;
}
.hdc-section h2 span { margin-left: 4px !important; color: #666 !important; font-size: 13px !important; font-weight: 400 !important; }
.hdc-window-name { display: grid !important; gap: 6px !important; }
.hdc-window-name span { color: #333 !important; font-size: 13px !important; }
.hdc-window-name em { margin-left: 3px !important; color: #777 !important; font-style: normal !important; }
.hdc-window-name input {
  width: 100% !important; height: 38px !important; border: 1px solid #9f9f9f !important; border-radius: 0 !important;
  background: #fff !important; padding: 0 10px !important; color: #333 !important; font-size: 14px !important;
}
.hdc-window-name input:focus,
.hdc-select-box select:focus,
.hdc-qty input:focus,
.hdc-option-card:focus-visible,
.hdc-add-cart:focus-visible,
.hdc-save-product:focus-visible,
.hdc-show-preview:focus-visible {
  outline: 3px solid rgba(249, 99, 2, .28) !important;
  outline-offset: 2px !important;
}
.hdc-window-name small { color: #666 !important; font-size: 12px !important; line-height: 1.35 !important; }
.hdc-option-stack { display: grid !important; gap: 16px !important; }
.hdc-option-card {
  position: relative !important;
  width: 100% !important;
  min-height: 122px !important;
  display: grid !important;
  grid-template-columns: 176px minmax(0, 1fr) !important;
  gap: 24px !important;
  align-items: start !important;
  margin: 0 !important;
  padding: 3px 0 0 3px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #333 !important;
  text-align: left !important;
  overflow: visible !important;
}
.hdc-option-card::before { content: none !important; }
.hdc-option-card.selected { border: 0 !important; box-shadow: none !important; }
.hdc-radio { display: none !important; }
.hdc-option-media {
  position: relative !important;
  width: 176px !important;
  height: 112px !important;
  overflow: hidden !important;
  border: 0 !important;
  background: #ececec !important;
  transition: box-shadow .14s ease !important;
}
.hdc-option-card:hover .hdc-option-media { box-shadow: 0 0 0 1px #d6d6d6 !important; }
.hdc-option-card.selected .hdc-option-media { box-shadow: 0 0 0 3px #f96302 !important; }
.hdc-mini-art { width: 100% !important; height: 100% !important; background: linear-gradient(180deg, #f4f4f4, #dfdfdf) !important; }
.hdc-mini-window {
  left: 18px !important; top: 12px !important; width: 140px !important; height: 84px !important; border-width: 5px !important; background: #fff !important;
}
.hdc-mini-window span { height: 6px !important; margin: 3px 6px !important; }
.hdc-mini-art i { left: 26px !important; top: 18px !important; width: 124px !important; height: 7px !important; }
.hdc-option-copy { min-width: 0 !important; padding-top: 0 !important; }
.hdc-option-title-row { display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; gap: 10px !important; align-items: start !important; }
.hdc-option-title-row strong { color: #333 !important; font-size: 15px !important; line-height: 1.25 !important; font-weight: 700 !important; }
.hdc-option-copy p { max-width: none !important; margin: 7px 0 0 !important; color: #555 !important; font-size: 12.5px !important; line-height: 1.45 !important; }
.hdc-option-copy small { display: block !important; margin-top: 5px !important; color: #333 !important; font-size: 12px !important; line-height: 1.35 !important; font-style: italic !important; font-weight: 700 !important; }
.hdc-option-price { display: none !important; }
.hdc-option-stack.no-media,
.hdc-option-stack.compact { gap: 10px !important; }
.hdc-option-stack.no-media .hdc-option-card,
.hdc-option-stack.compact .hdc-option-card {
  min-height: auto !important; display: grid !important; grid-template-columns: 22px minmax(0, 1fr) !important; gap: 12px !important;
  padding: 12px 14px !important; border: 1px solid #d6d6d6 !important; background: #fff !important;
}
.hdc-option-stack.no-media .hdc-option-card::before,
.hdc-option-stack.compact .hdc-option-card::before { content: none !important; }
.hdc-option-stack.no-media .hdc-radio,
.hdc-option-stack.compact .hdc-radio {
  display: block !important; width: 16px !important; height: 16px !important; margin-top: 1px !important;
  border-radius: 50% !important; border: 1px solid #777 !important; background: #fff !important;
}
.hdc-option-stack.no-media .hdc-option-card.selected,
.hdc-option-stack.compact .hdc-option-card.selected { border-color: #f96302 !important; box-shadow: inset 0 0 0 1px #f96302 !important; }
.hdc-option-stack.no-media .hdc-option-card.selected .hdc-radio,
.hdc-option-stack.compact .hdc-option-card.selected .hdc-radio { border: 5px solid #f96302 !important; }
.hdc-size-section { margin-top: 34px !important; }
.hdc-alert {
  margin: 14px 0 20px !important; display: flex !important; align-items: flex-start !important; gap: 8px !important;
  color: #b94300 !important; font-size: 12px !important; line-height: 1.35 !important;
}
.hdc-alert.small { display: none !important; }
.hdc-measure-group {
  display: grid !important;
  grid-template-columns: 76px minmax(0, 1fr) !important;
  align-items: end !important;
  column-gap: 14px !important;
  row-gap: 6px !important;
  margin: 0 !important;
  padding: 13px 0 16px !important;
  border-bottom: 1px solid #e6e6e6 !important;
}
.hdc-measure-group h3 {
  margin: 0 0 4px !important;
  color: #333 !important;
  font-size: 16px !important;
  line-height: 1.2 !important;
  font-weight: 400 !important;
  white-space: nowrap !important;
}
.hdc-measure-group h3 em { color: #666 !important; font-style: normal !important; }
.hdc-measure-selects {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: end !important;
  gap: 10px !important;
}
.hdc-select-box {
  position: relative !important;
  width: 94px !important;
  height: auto !important;
  margin: 0 !important;
  display: grid !important;
  gap: 4px !important;
  border: 0 !important;
  color: #666 !important;
}
.hdc-select-box::after {
  content: "" !important;
  position: absolute !important;
  right: 10px !important;
  bottom: 14px !important;
  width: 0 !important;
  height: 0 !important;
  border-left: 4px solid transparent !important;
  border-right: 4px solid transparent !important;
  border-top: 5px solid #f96302 !important;
  pointer-events: none !important;
}
.hdc-select-box span {
  display: block !important;
  position: static !important;
  height: auto !important;
  color: #666 !important;
  font-size: 11px !important;
  line-height: 1 !important;
}
.hdc-select-box select {
  width: 94px !important;
  height: 38px !important;
  appearance: none !important;
  border: 1px solid #aaa !important;
  border-radius: 0 !important;
  background: #fff !important;
  color: #333 !important;
  padding: 0 26px 0 8px !important;
  font-size: 13px !important;
  line-height: 38px !important;
}
.hdc-right {
  width: 100% !important; position: sticky !important; top: 132px !important; display: flex !important; flex-direction: column !important; gap: 16px !important; align-self: start !important;
}
.hdc-preview-card { order: 1 !important; padding: 0 !important; border: 0 !important; background: transparent !important; }
.hdc-preview-summary { position: relative !important; width: 100% !important; min-height: 92px !important; padding-right: 132px !important; }
.hdc-preview-summary h3 { margin: 0 0 4px !important; color: #333 !important; font-size: 16px !important; line-height: 1.25 !important; font-weight: 400 !important; }
.hdc-preview-summary p { margin: 0 0 2px !important; color: #333 !important; font-size: 11px !important; line-height: 1.3 !important; }
.hdc-side-price { position: absolute !important; right: 0 !important; top: 0 !important; width: 120px !important; margin: 0 !important; text-align: right !important; }
.hdc-side-price s,
.hdc-side-price b,
.hdc-side-price small { display: block !important; font-size: 11px !important; line-height: 1.15 !important; }
.hdc-side-price b { color: #00873c !important; font-weight: 700 !important; }
.hdc-side-price b:empty,
.hdc-total b:empty { display: none !important; }
.hdc-side-price strong { display: block !important; color: #333 !important; font-size: 30px !important; line-height: .95 !important; font-weight: 700 !important; }
.hdc-side-price strong::before,
.hdc-side-price strong::after { content: none !important; display: none !important; }
.hdc-review-card { order: 2 !important; display: block !important; width: 100% !important; margin: 2px 0 0 !important; padding: 14px !important; border: 1px solid #d6d6d6 !important; border-radius: 0 !important; background: #fff !important; }
.hdc-review-card h2 { margin: 0 0 10px !important; padding-bottom: 7px !important; border-bottom: 1px solid #ccc !important; color: #333 !important; font-size: 17px !important; line-height: 1.2 !important; font-weight: 700 !important; }
.hdc-review-rows { display: grid !important; border-bottom: 1px solid #e0e0e0 !important; margin-bottom: 12px !important; }
.hdc-review-rows div,
.hdc-review-ship,
.hdc-qty { min-height: 28px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; border-top: 1px solid #eee !important; color: #333 !important; font-size: 12px !important; line-height: 1.25 !important; }
.hdc-review-rows b { text-align: right !important; font-weight: 700 !important; }
.hdc-review-ship strong { color: #00873c !important; }
.hdc-qty input { width: 62px !important; height: 30px !important; border: 1px solid #aaa !important; border-radius: 0 !important; padding: 0 6px !important; text-align: right !important; }
.hdc-total { padding: 11px 0 !important; color: #333 !important; }
.hdc-total > span,
.hdc-total s,
.hdc-total b { display: block !important; text-align: right !important; }
.hdc-total b { color: #00873c !important; }
.hdc-total div { display: flex !important; justify-content: flex-end !important; align-items: flex-start !important; gap: 1px !important; color: #333 !important; }
.hdc-total div span { margin-top: 6px !important; font-size: 18px !important; font-weight: 700 !important; }
.hdc-total div strong { font-size: 38px !important; line-height: .95 !important; font-weight: 700 !important; }
.hdc-total div sup { top: 2px !important; font-size: 17px !important; line-height: 1 !important; font-weight: 700 !important; }
.hdc-add-cart,
.hdc-save-product { width: 100% !important; height: 44px !important; border-radius: 0 !important; font-size: 14px !important; font-weight: 700 !important; text-transform: uppercase !important; }
.hdc-add-cart { border: 0 !important; background: #f96302 !important; color: #fff !important; }
.hdc-save-product { margin-top: 8px !important; border: 1px solid #f96302 !important; background: #fff !important; color: #f96302 !important; }
.hdc-feedback,
.hd-config-feedback { display: none !important; }
@media (max-width: 1180px) {
  .hdc-breadcrumb,
  .hdc-layout { width: min(100% - 32px, 900px) !important; }
  .hdc-layout { grid-template-columns: minmax(0, 1fr) !important; gap: 24px !important; }
  .hdc-right { position: static !important; }
}
@media (max-width: 700px) {
  .hdc-page { padding-bottom: 48px !important; overflow-x: hidden !important; }
  .hdc-breadcrumb { width: calc(100% - 24px) !important; height: 40px !important; min-height: 40px !important; margin-bottom: 12px !important; gap: 8px !important; font-size: 12px !important; }
  .hdc-breadcrumb button,
  .hdc-breadcrumb span { font-size: 12px !important; }
  .hdc-layout { width: calc(100% - 24px) !important; gap: 20px !important; }
  .hdc-title-block h1 { font-size: 20px !important; }
  .hdc-fit { font-size: 17px !important; }
  .hdc-section { margin-bottom: 26px !important; }
  .hdc-section h2 { font-size: 20px !important; }
  .hdc-option-card { grid-template-columns: 128px minmax(0, 1fr) !important; gap: 14px !important; min-height: 92px !important; padding: 3px 0 0 3px !important; }
  .hdc-option-media { width: 128px !important; height: 86px !important; }
  .hdc-mini-window { left: 12px !important; top: 10px !important; width: 104px !important; height: 66px !important; border-width: 4px !important; }
  .hdc-mini-window span { height: 4px !important; margin: 3px 5px !important; }
  .hdc-option-title-row strong { font-size: 14px !important; }
  .hdc-option-copy p,
  .hdc-option-copy small { font-size: 12px !important; }
  .hdc-measure-group { grid-template-columns: 1fr !important; align-items: start !important; padding: 12px 0 15px !important; }
  .hdc-measure-selects { flex-wrap: wrap !important; }
  .hdc-preview-summary { padding-right: 0 !important; }
  .hdc-side-price { position: static !important; width: auto !important; margin-top: 10px !important; text-align: left !important; }
}
@media (max-width: 520px) {
  .hdc-option-card { grid-template-columns: 1fr !important; gap: 10px !important; }
  .hdc-option-media { width: 100% !important; height: 120px !important; }
  .hdc-mini-window { left: 50% !important; top: 12px !important; width: 148px !important; height: 92px !important; transform: translateX(-50%) !important; }
  .hdc-mini-art i { left: 50% !important; width: 126px !important; transform: translateX(-50%) !important; }
  .hdc-option-stack.no-media .hdc-option-card,
  .hdc-option-stack.compact .hdc-option-card { grid-template-columns: 22px minmax(0, 1fr) !important; }
}


/* Configurator editor controls */
.editor-panel-configurator { width: min(980px, 100%) !important; }
.config-editor { padding: 18px !important; display: grid !important; gap: 16px !important; }
.config-editor-card { margin: 0 !important; }
.config-size-grid,
.config-option-fields {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}
.config-size-grid label,
.config-option-fields label {
  display: grid !important;
  gap: 5px !important;
  color: #555 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.config-size-grid input,
.config-size-grid textarea,
.config-option-fields input,
.config-option-fields textarea {
  width: 100% !important;
  border: 1px solid #cfcfcf !important;
  border-radius: 4px !important;
  background: #fff !important;
  color: #222 !important;
  padding: 9px 10px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}
.config-size-grid .wide,
.config-option-fields .wide { grid-column: 1 / -1 !important; }
.config-editor-heading { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; }
.config-option-list { display: grid !important; gap: 12px !important; }
.config-option-editor-row { border: 1px solid #dedede !important; border-radius: 8px !important; padding: 12px !important; background: #fafafa !important; }
.config-option-editor-topline { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important; margin-bottom: 10px !important; }
.config-option-editor-topline span { color: #f96302 !important; font-size: 12px !important; font-weight: 700 !important; }
.config-option-editor-topline div { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; }
.config-option-editor-topline button { min-height: 28px !important; border: 1px solid #ccc !important; border-radius: 4px !important; background: #fff !important; color: #333 !important; padding: 0 8px !important; font-size: 12px !important; font-weight: 700 !important; }
.config-option-editor-topline button:disabled { opacity: .45 !important; cursor: not-allowed !important; }
.config-remove-option { display: inline-flex !important; align-items: center !important; gap: 4px !important; color: #b94300 !important; }
@media (max-width: 640px) {
  .config-size-grid,
  .config-option-fields { grid-template-columns: 1fr !important; }
  .config-editor-heading { align-items: flex-start !important; flex-direction: column !important; }
}


/* Size selector refinement: compact Home Depot-style measurement rows */
.hdc-size-section {
  margin-top: 30px !important;
}
.hdc-size-section h2 {
  margin-bottom: 12px !important;
}
.hdc-measure-group {
  display: grid !important;
  grid-template-columns: 68px auto !important;
  justify-content: start !important;
  align-items: center !important;
  column-gap: 14px !important;
  row-gap: 0 !important;
  margin: 0 !important;
  padding: 12px 0 16px !important;
  border-bottom: 1px solid #e5e5e5 !important;
}
.hdc-measure-group h3 {
  margin: 0 !important;
  color: #333 !important;
  font-size: 16px !important;
  line-height: 1.1 !important;
  font-weight: 400 !important;
  white-space: nowrap !important;
  align-self: center !important;
}
.hdc-measure-group h3 em {
  display: none !important;
}
.hdc-measure-selects {
  width: auto !important;
  display: grid !important;
  grid-template-columns: 88px 88px !important;
  gap: 10px !important;
  align-items: end !important;
}
.hdc-select-box {
  position: relative !important;
  width: 88px !important;
  height: 40px !important;
  margin: 0 !important;
  display: block !important;
  border: 1px solid #aaa !important;
  background: #fff !important;
  color: #333 !important;
}
.hdc-select-box span {
  position: absolute !important;
  left: 7px !important;
  top: 4px !important;
  z-index: 1 !important;
  display: block !important;
  height: auto !important;
  color: #666 !important;
  font-size: 10px !important;
  line-height: 1 !important;
  pointer-events: none !important;
}
.hdc-select-box::after {
  content: "" !important;
  position: absolute !important;
  right: 8px !important;
  top: 18px !important;
  width: 0 !important;
  height: 0 !important;
  border-left: 3.5px solid transparent !important;
  border-right: 3.5px solid transparent !important;
  border-top: 5px solid #f96302 !important;
  pointer-events: none !important;
}
.hdc-select-box select {
  width: 100% !important;
  height: 100% !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #333 !important;
  padding: 15px 22px 2px 7px !important;
  font-size: 13px !important;
  line-height: 1 !important;
}
.hdc-select-box select::-ms-expand {
  display: none !important;
}
@media (max-width: 700px) {
  .hdc-measure-group {
    grid-template-columns: 1fr !important;
    align-items: start !important;
    gap: 9px !important;
  }
  .hdc-measure-selects {
    grid-template-columns: repeat(2, minmax(88px, 1fr)) !important;
    width: min(100%, 260px) !important;
  }
  .hdc-select-box {
    width: 100% !important;
  }
}

.config-editor-product-note {
  margin: 14px 18px 0 !important;
  padding: 10px 12px !important;
  border: 1px solid #f1d0bd !important;
  border-left: 4px solid #f96302 !important;
  background: #fff8f4 !important;
  color: #333 !important;
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.config-editor-product-note strong {
  font-weight: 700 !important;
}


/* Apple-like configurator editor alignment with product/grid editors */
.editor-panel-configurator {
  width: min(920px, calc(100vw - 28px)) !important;
}
.config-editor-shell {
  padding: 18px !important;
  background: #f5f5f7 !important;
}
.config-product-editor-card {
  overflow: hidden !important;
  border-radius: 18px !important;
  border: 1px solid rgba(0,0,0,.08) !important;
  box-shadow: 0 18px 45px rgba(0,0,0,.12) !important;
}
.config-product-summary {
  align-items: center !important;
  padding: 16px !important;
  background: linear-gradient(180deg, #fff, #fbfbfd) !important;
  border-bottom: 1px solid rgba(0,0,0,.08) !important;
}
.config-editor-product-title {
  display: grid !important;
  gap: 3px !important;
}
.config-editor-product-title span {
  color: #86868b !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .04em !important;
  text-transform: uppercase !important;
}
.config-editor-product-title strong {
  color: #1d1d1f !important;
  font-size: 18px !important;
  line-height: 1.25 !important;
  font-weight: 700 !important;
}
.config-editor-more-panel {
  padding: 16px !important;
  background: #f5f5f7 !important;
}
.config-editor {
  padding: 0 !important;
  display: grid !important;
  gap: 14px !important;
}
.config-editor-card {
  border: 1px solid rgba(0,0,0,.08) !important;
  border-radius: 16px !important;
  background: rgba(255,255,255,.92) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 8px 24px rgba(0,0,0,.045) !important;
  padding: 16px !important;
}
.config-editor-card .editor-section-heading {
  margin-bottom: 14px !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(0,0,0,.08) !important;
}
.config-editor-card .editor-section-heading strong {
  color: #1d1d1f !important;
  font-size: 15px !important;
  font-weight: 700 !important;
}
.config-editor-card .editor-section-heading span {
  color: #6e6e73 !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
}
.config-size-grid,
.config-option-fields {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}
.config-size-grid label,
.config-option-fields label {
  display: grid !important;
  gap: 6px !important;
  color: #6e6e73 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .02em !important;
}
.config-size-grid input,
.config-size-grid textarea,
.config-option-fields input,
.config-option-fields textarea {
  width: 100% !important;
  min-height: 38px !important;
  border: 1px solid rgba(0,0,0,.14) !important;
  border-radius: 10px !important;
  background: #fff !important;
  color: #1d1d1f !important;
  padding: 9px 10px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  outline: none !important;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease !important;
}
.config-size-grid input:focus,
.config-size-grid textarea:focus,
.config-option-fields input:focus,
.config-option-fields textarea:focus {
  border-color: #f96302 !important;
  box-shadow: 0 0 0 4px rgba(249,99,2,.14) !important;
}
.config-size-grid .wide,
.config-option-fields .wide {
  grid-column: 1 / -1 !important;
}
.config-editor-heading {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 12px !important;
}
.config-editor-heading .editor-add-link-button {
  flex: 0 0 auto !important;
  min-height: 34px !important;
  border-radius: 999px !important;
}
.config-option-list {
  display: grid !important;
  gap: 12px !important;
}
.config-option-editor-row {
  border: 1px solid rgba(0,0,0,.08) !important;
  border-radius: 14px !important;
  padding: 12px !important;
  background: #fbfbfd !important;
}
.config-option-editor-topline {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  margin-bottom: 10px !important;
}
.config-option-editor-topline span {
  min-width: 32px !important;
  height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 999px !important;
  background: rgba(249,99,2,.1) !important;
  color: #f96302 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}
.config-option-editor-topline div {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  gap: 6px !important;
}
.config-option-editor-topline button {
  min-height: 28px !important;
  border: 1px solid rgba(0,0,0,.12) !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #333 !important;
  padding: 0 10px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.config-option-editor-topline button:hover:not(:disabled) {
  border-color: #f96302 !important;
  color: #f96302 !important;
}
.config-option-editor-topline button:disabled {
  opacity: .4 !important;
  cursor: not-allowed !important;
}
.config-remove-option {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  color: #b94300 !important;
}
@media (max-width: 700px) {
  .config-editor-shell,
  .config-editor-more-panel {
    padding: 12px !important;
  }
  .config-product-summary {
    grid-template-columns: 74px minmax(0, 1fr) !important;
  }
  .config-size-grid,
  .config-option-fields {
    grid-template-columns: 1fr !important;
  }
  .config-editor-heading {
    flex-direction: column !important;
  }
  .config-editor-heading .editor-add-link-button {
    width: 100% !important;
    justify-content: center !important;
  }
}


/* Configurator editor feature parity: utilities, validation, drag reorder */
.config-utility-card {
  background: linear-gradient(180deg, #fff, #fbfbfd) !important;
}
.config-status-chips {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  gap: 6px !important;
}
.config-copy-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 10px !important;
  align-items: end !important;
}
.config-copy-row label {
  display: grid !important;
  gap: 6px !important;
  color: #6e6e73 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .02em !important;
}
.config-copy-row select {
  width: 100% !important;
  min-height: 38px !important;
  border: 1px solid rgba(0,0,0,.14) !important;
  border-radius: 10px !important;
  background: #fff !important;
  color: #1d1d1f !important;
  padding: 0 10px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
}
.config-copy-row .editor-add-link-button:disabled {
  opacity: .45 !important;
  cursor: not-allowed !important;
}
.config-validation-list,
.config-validation-good {
  margin-top: 12px !important;
  border-radius: 12px !important;
  padding: 10px 12px !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
}
.config-validation-list {
  display: grid !important;
  gap: 4px !important;
  border: 1px solid #f1d0bd !important;
  background: #fff8f4 !important;
  color: #7c2f00 !important;
}
.config-validation-list strong {
  color: #b94300 !important;
  font-weight: 700 !important;
}
.config-validation-good {
  border: 1px solid #cfe8d7 !important;
  background: #f4fbf6 !important;
  color: #22733a !important;
  font-weight: 700 !important;
}
.config-heading-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  gap: 8px !important;
}
.config-section-reset {
  min-height: 34px !important;
  border-radius: 999px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 0 11px !important;
}
.config-option-order-cluster {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}
.config-option-drag-handle {
  width: 30px !important;
  min-height: 28px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px solid rgba(0,0,0,.12) !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #8a8a8e !important;
  cursor: grab !important;
  font-size: 13px !important;
  letter-spacing: -2px !important;
}
.config-option-drag-handle:active {
  cursor: grabbing !important;
}
.config-option-editor-row {
  position: relative !important;
}
.config-option-editor-row.config-option-dragging {
  opacity: .5 !important;
}
.config-option-editor-row.config-option-drop-before::before,
.config-option-editor-row.config-option-drop-after::after {
  content: "" !important;
  position: absolute !important;
  left: 12px !important;
  right: 12px !important;
  height: 3px !important;
  border-radius: 999px !important;
  background: #f96302 !important;
  z-index: 2 !important;
}
.config-option-editor-row.config-option-drop-before::before {
  top: -7px !important;
}
.config-option-editor-row.config-option-drop-after::after {
  bottom: -7px !important;
}
.config-option-editor-topline button svg {
  width: 13px !important;
  height: 13px !important;
}
@media (max-width: 700px) {
  .config-copy-row {
    grid-template-columns: 1fr !important;
  }
  .config-copy-row .editor-add-link-button,
  .config-heading-actions,
  .config-heading-actions button {
    width: 100% !important;
    justify-content: center !important;
  }
  .config-status-chips {
    justify-content: flex-start !important;
  }
  .config-option-editor-topline {
    align-items: flex-start !important;
    flex-direction: column !important;
  }
  .config-option-editor-topline > div:last-child {
    justify-content: flex-start !important;
  }
}


/* Configurator editor layout audit fixes: readable section headers and balanced controls */
.config-editor-card .config-editor-heading {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: start !important;
  gap: 16px !important;
  margin-bottom: 16px !important;
  padding-bottom: 14px !important;
}
.config-editor-card .config-editor-heading > div:first-child {
  min-width: 0 !important;
  display: grid !important;
  gap: 4px !important;
  align-content: start !important;
}
.config-editor-card .config-editor-heading > div:first-child strong,
.config-editor-card .config-editor-heading > div:first-child span {
  display: block !important;
  text-align: left !important;
}
.config-editor-card .config-editor-heading > div:first-child strong {
  margin: 0 !important;
  color: #1d1d1f !important;
  font-size: 15px !important;
  line-height: 1.2 !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}
.config-editor-card .config-editor-heading > div:first-child span {
  max-width: 560px !important;
  margin: 0 !important;
  color: #6e6e73 !important;
  font-size: 12px !important;
  line-height: 1.38 !important;
  font-weight: 700 !important;
}
.config-editor-card .config-status-chips,
.config-editor-card .config-heading-actions {
  align-self: start !important;
  padding-top: 1px !important;
}
.config-editor-card .config-heading-actions {
  display: inline-flex !important;
  flex-wrap: nowrap !important;
  gap: 8px !important;
  justify-content: flex-end !important;
  white-space: nowrap !important;
}
.config-editor-card .config-heading-actions .secondary-action,
.config-editor-card .config-heading-actions .editor-add-link-button {
  min-height: 34px !important;
  height: 34px !important;
  padding: 0 12px !important;
  border-radius: 999px !important;
  font-size: 12px !important;
  line-height: 1 !important;
}
.config-editor-card .config-copy-row {
  margin-top: 2px !important;
}
.config-option-editor-topline {
  align-items: flex-start !important;
  gap: 12px !important;
}
.config-option-editor-topline > div:last-child {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  gap: 6px !important;
  max-width: 70% !important;
}
.config-option-editor-topline > div:last-child button {
  min-height: 30px !important;
}
.config-option-fields {
  margin-top: 2px !important;
}
@media (max-width: 820px) {
  .config-editor-card .config-editor-heading {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }
  .config-editor-card .config-status-chips,
  .config-editor-card .config-heading-actions {
    justify-content: flex-start !important;
    padding-top: 0 !important;
  }
  .config-editor-card .config-heading-actions {
    flex-wrap: wrap !important;
    white-space: normal !important;
  }
  .config-option-editor-topline > div:last-child {
    max-width: none !important;
    justify-content: flex-start !important;
  }
}
@media (max-width: 520px) {
  .config-editor-card .config-heading-actions,
  .config-editor-card .config-heading-actions button {
    width: 100% !important;
  }
  .config-editor-card .config-heading-actions button {
    justify-content: center !important;
  }
}


.hd-grid-save-settings {
  border: 1px solid #f96302 !important;
  background: #fff !important;
  color: #f96302 !important;
  min-height: 34px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
}
.hd-grid-save-settings:disabled {
  opacity: .55 !important;
  cursor: not-allowed !important;
}


/* Stock / pre-cut PDP purchase panel */
.pdp-stock-panel {
  margin-top: 16px;
  border-top: 8px solid #f3f3f3;
  color: #222;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.pdp-stock-option-block {
  padding: 12px 10px 0;
}
.pdp-stock-label {
  display: block;
  margin: 0 0 8px;
  color: #222;
  font-size: 14px;
  line-height: 1.25;
  font-weight: 400;
}
.pdp-stock-label strong {
  font-weight: 700;
}
.pdp-stock-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pdp-stock-swatch {
  width: 38px;
  height: 38px;
  border: 1px solid #cfcfcf;
  border-radius: 6px;
  background: #fff;
  padding: 4px;
  display: grid;
  place-items: center;
  position: relative;
}
.pdp-stock-swatch span,
.pdp-stock-swatch img {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  display: block;
  object-fit: cover;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
}
.pdp-stock-swatch.active {
  border-color: #333;
  box-shadow: 0 0 0 2px #333 inset;
}
.pdp-stock-select-shell {
  position: relative;
  width: 100%;
}
.pdp-stock-select-shell select {
  width: 100%;
  height: 38px;
  appearance: none;
  border: 1px solid #9f9f9f;
  border-radius: 0;
  background: #fff;
  color: #222;
  padding: 0 38px 0 10px;
  font-size: 14px;
}
.pdp-stock-select-shell svg {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #333;
  pointer-events: none;
}
.pdp-stock-lengths {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.pdp-stock-lengths button {
  height: 37px;
  min-width: 46px;
  border: 1px solid #ccc;
  border-radius: 7px;
  background: #fff;
  color: #333;
  padding: 0 11px;
  font-size: 14px;
}
.pdp-stock-lengths button.active {
  border-color: #111;
  box-shadow: inset 0 0 0 1px #111;
  font-weight: 700;
}
.pdp-stock-fulfillment-wrap {
  margin-top: 16px;
  padding: 10px;
  background: #fff;
  border-top: 8px solid #f3f3f3;
  border-bottom: 8px solid #f3f3f3;
}
.pdp-stock-fulfillment-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}
.pdp-stock-fulfillment-head a,
.pdp-stock-links a,
.pdp-stock-install a {
  color: #222;
  text-decoration: underline;
}
.pdp-stock-fulfillment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pdp-stock-fulfillment-card {
  position: relative;
  min-height: 124px;
  border: 1px dashed #c9c9c9;
  border-radius: 6px;
  background: #fff;
  padding: 20px 8px 10px;
  color: #222;
  text-align: left;
}
.pdp-stock-fulfillment-card.active {
  border: 1px solid #f96302;
}
.pdp-stock-fulfillment-card:disabled {
  opacity: .5;
}
.pdp-stock-fulfillment-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 18px;
  line-height: 1.1;
}
.pdp-stock-fulfillment-card span,
.pdp-stock-fulfillment-card em,
.pdp-stock-fulfillment-card b {
  display: block;
  font-style: normal;
  font-size: 13px;
  line-height: 1.35;
}
.pdp-stock-fulfillment-card em,
.pdp-stock-fulfillment-card b {
  color: #00873c;
  font-weight: 700;
}
.pdp-stock-fulfillment-card svg {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #f96302;
  border-radius: 999px;
  border: 1px solid #f96302;
}
.pdp-stock-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 10px 0 12px;
  font-size: 13px;
}
.pdp-stock-info {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.35;
  color: #222;
}
.pdp-stock-info span {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #4b8f8b;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-weight: 700;
}
.pdp-stock-fast {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.3;
}
.pdp-stock-fast svg {
  flex: 0 0 auto;
  color: #333;
}
.pdp-stock-install {
  padding: 14px 10px;
  border-bottom: 8px solid #f3f3f3;
}
.pdp-stock-install-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 19px;
  line-height: 1.1;
}
.pdp-stock-install-title svg {
  color: #333;
  flex: 0 0 auto;
}
.pdp-stock-install p {
  margin: 8px 0 10px 40px;
  font-size: 14px;
}
.pdp-stock-install label {
  margin-left: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.pdp-stock-install input {
  width: 18px;
  height: 18px;
}
.pdp-stock-install a {
  display: inline-block;
  margin: 12px 0 0 40px;
  font-size: 13px;
}
.pdp-stock-cart-row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 12px;
  padding: 12px 10px 0;
  align-items: center;
}
.pdp-stock-qty {
  height: 38px;
  display: grid;
  grid-template-columns: 38px 1fr 38px;
  border: 1px solid #c6c6c6;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.pdp-stock-qty button,
.pdp-stock-qty span {
  border: 0;
  background: #fff;
  display: grid;
  place-items: center;
  color: #1d5f9f;
  font-size: 18px;
}
.pdp-stock-qty span {
  border-left: 1px solid #c6c6c6;
  border-right: 1px solid #c6c6c6;
  color: #1d5f9f;
  font-size: 14px;
}
.pdp-stock-add-cart {
  height: 38px;
  border: 0;
  border-radius: 6px;
  background: #f96302;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
}
@media (max-width: 760px) {
  .pdp-stock-fulfillment-head,
  .pdp-stock-fulfillment-grid,
  .pdp-stock-links,
  .pdp-stock-cart-row {
    grid-template-columns: 1fr;
  }
}

/* Stock options inside the Apple-like editor */
.editor-section-card-stock .editor-section-heading span {
  text-align: left !important;
}
.editor-stock-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
}
.editor-stock-toggle-list {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 8px !important;
  padding: 10px !important;
  border-radius: 12px !important;
  background: #f5f5f7 !important;
}
.editor-stock-toggle-list label {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  color: #333 !important;
  font-weight: 700 !important;
}
.editor-stock-colors {
  margin-top: 14px !important;
  display: grid !important;
  gap: 10px !important;
}
.editor-stock-color-row {
  display: grid !important;
  grid-template-columns: minmax(130px, .8fr) 110px minmax(180px, 1fr) 34px !important;
  gap: 8px !important;
  align-items: center !important;
}
.editor-stock-color-row input {
  width: 100% !important;
  height: 36px !important;
  border: 1px solid rgba(0,0,0,.14) !important;
  border-radius: 9px !important;
  padding: 0 10px !important;
  background: #fff !important;
}
.editor-stock-color-row button:disabled {
  opacity: .45 !important;
}
@media (max-width: 760px) {
  .editor-stock-grid,
  .editor-stock-toggle-list,
  .editor-stock-color-row {
    grid-template-columns: 1fr !important;
  }
}


/* Stock PDP left gallery: horizontal carousel and room CTA */
.pdp-stock-gallery-panel {
  padding: 0 !important;
  background: #fff !important;
  border-right: 8px solid #f3f3f3 !important;
}
.pdp-stock-gallery-layout {
  min-height: 669px !important;
  display: flex !important;
  flex-direction: column !important;
  background: #fff !important;
}
.pdp-stock-hero-shell {
  flex: 1 1 auto !important;
  min-height: 500px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  outline: none !important;
}
.pdp-stock-hero-stage {
  width: 100% !important;
  height: 500px !important;
  background: #fff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.pdp-stock-hero-stage img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  padding: 34px 54px 12px !important;
}
.pdp-stock-hover-copy {
  margin: 0 0 18px !important;
  text-align: center !important;
  color: #222 !important;
  font-size: 11px !important;
  line-height: 1 !important;
}
.pdp-stock-thumb-row {
  height: 88px !important;
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  gap: 16px !important;
  padding: 0 14px 14px !important;
  overflow: hidden !important;
}
.pdp-stock-thumb-btn {
  position: relative !important;
  width: 100% !important;
  height: 78px !important;
  border: 1px solid transparent !important;
  background: #f2f2f2 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
.pdp-stock-thumb-btn.active {
  border-color: #333 !important;
}
.pdp-stock-thumb-btn img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
}
.pdp-stock-room-row {
  min-height: 63px !important;
  display: flex !important;
  align-items: center !important;
  padding: 0 14px !important;
  border-top: 8px solid #f3f3f3 !important;
  background: #fff !important;
}
.pdp-stock-room-button {
  height: 37px !important;
  border: 1px solid #f96302 !important;
  border-radius: 6px !important;
  background: #fff !important;
  color: #f96302 !important;
  padding: 0 13px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
}
.pdp-stock-room-button svg {
  color: #f96302 !important;
}
@media (max-width: 1200px) {
  .pdp-stock-gallery-panel {
    border-right: 0 !important;
  }
  .pdp-stock-gallery-layout {
    min-height: auto !important;
  }
  .pdp-stock-hero-shell,
  .pdp-stock-hero-stage {
    min-height: 420px !important;
    height: 420px !important;
  }
}
@media (max-width: 760px) {
  .pdp-stock-hero-shell,
  .pdp-stock-hero-stage {
    min-height: 330px !important;
    height: 330px !important;
  }
  .pdp-stock-hero-stage img {
    padding: 22px !important;
  }
  .pdp-stock-thumb-row {
    display: flex !important;
    gap: 10px !important;
    overflow-x: auto !important;
    padding: 0 12px 12px !important;
  }
  .pdp-stock-thumb-btn {
    flex: 0 0 72px !important;
    width: 72px !important;
    height: 72px !important;
  }
}


/* Stock PDP gallery size lock: bottom carousel without shrinking/changing hero image scale */
.pdp-stock-gallery-layout {
  min-height: 669px !important;
}
.pdp-stock-hero-shell {
  min-height: 506px !important;
  height: 506px !important;
  flex: 0 0 506px !important;
}
.pdp-stock-hero-stage {
  height: 506px !important;
  min-height: 506px !important;
  background: #fff !important;
}
.pdp-stock-hero-stage img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  padding: 18px !important;
}
.pdp-stock-hover-copy {
  flex: 0 0 22px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.pdp-stock-thumb-row {
  flex: 0 0 96px !important;
  height: 96px !important;
  padding: 7px 14px 11px !important;
}
.pdp-stock-room-row {
  flex: 0 0 63px !important;
}
@media (max-width: 1200px) {
  .pdp-stock-hero-shell,
  .pdp-stock-hero-stage {
    min-height: 506px !important;
    height: 506px !important;
    flex-basis: 506px !important;
  }
}
@media (max-width: 760px) {
  .pdp-stock-hero-shell,
  .pdp-stock-hero-stage {
    min-height: 360px !important;
    height: 360px !important;
    flex-basis: 360px !important;
  }
}


/* Stock PDP gallery bottom spacing trim */
.pdp-stock-gallery-layout {
  min-height: auto !important;
}
.pdp-stock-room-row {
  min-height: 52px !important;
  flex: 0 0 52px !important;
  align-items: center !important;
  padding: 7px 14px 8px !important;
}
.pdp-stock-room-button {
  height: 36px !important;
}
.pdp-stock-gallery-panel {
  display: block !important;
}


/* Stock PDP desktop behavior: left gallery matches custom height and stays pinned while right content scrolls */
.pdp-stock-grid {
  align-items: start !important;
}
.pdp-stock-grid .pdp-stock-gallery-panel {
  position: sticky !important;
  top: 126px !important;
  align-self: start !important;
  height: 669px !important;
  min-height: 669px !important;
  overflow: hidden !important;
  border-right: 8px solid #f3f3f3 !important;
}
.pdp-stock-grid .pdp-stock-gallery-layout {
  height: 669px !important;
  min-height: 669px !important;
  display: flex !important;
  flex-direction: column !important;
}
.pdp-stock-grid .pdp-stock-hero-shell,
.pdp-stock-grid .pdp-stock-hero-stage {
  flex: 0 0 506px !important;
  height: 506px !important;
  min-height: 506px !important;
}
.pdp-stock-grid .pdp-stock-thumb-row {
  flex: 0 0 88px !important;
  height: 88px !important;
  padding: 5px 14px 5px !important;
}
.pdp-stock-grid .pdp-stock-thumb-btn {
  height: 78px !important;
}
.pdp-stock-grid .pdp-stock-hover-copy {
  flex: 0 0 23px !important;
  height: 23px !important;
}
.pdp-stock-grid .pdp-stock-room-row {
  flex: 0 0 52px !important;
  min-height: 52px !important;
  height: 52px !important;
  padding: 7px 14px 8px !important;
}
@media (max-width: 1200px) {
  .pdp-stock-grid .pdp-stock-gallery-panel {
    position: static !important;
    height: auto !important;
    min-height: auto !important;
    overflow: visible !important;
    border-right: 0 !important;
  }
  .pdp-stock-grid .pdp-stock-gallery-layout {
    height: auto !important;
    min-height: auto !important;
  }
}
@media (max-width: 760px) {
  .pdp-stock-grid .pdp-stock-hero-shell,
  .pdp-stock-grid .pdp-stock-hero-stage {
    flex-basis: 360px !important;
    height: 360px !important;
    min-height: 360px !important;
  }
}


/* Stock PDP room CTA balanced whitespace */
.pdp-stock-grid .pdp-stock-room-row,
.pdp-stock-room-row {
  flex: 0 0 72px !important;
  min-height: 72px !important;
  height: 72px !important;
  padding: 17px 14px 18px !important;
  align-items: center !important;
}
.pdp-stock-grid .pdp-stock-gallery-layout {
  height: 689px !important;
  min-height: 689px !important;
}
.pdp-stock-grid .pdp-stock-gallery-panel {
  height: 689px !important;
  min-height: 689px !important;
}
@media (max-width: 1200px) {
  .pdp-stock-grid .pdp-stock-gallery-layout,
  .pdp-stock-grid .pdp-stock-gallery-panel {
    height: auto !important;
    min-height: auto !important;
  }
}


/* Stock product editor fixes */
.editor-section-card-stock-muted {
  background: #fbfbfd !important;
  border-style: dashed !important;
}
.editor-stock-color-row {
  grid-template-columns: 38px minmax(120px, .8fr) minmax(100px, .7fr) 105px minmax(160px, 1fr) auto !important;
}
.editor-stock-color-preview {
  width: 34px !important;
  height: 34px !important;
  border: 1px solid rgba(0,0,0,.16) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7) !important;
}
.editor-stock-color-preview img {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
}
.editor-stock-color-actions {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
}
.editor-stock-color-actions button {
  width: 30px !important;
  height: 30px !important;
  border: 1px solid rgba(0,0,0,.14) !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #333 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.editor-stock-color-actions button:disabled {
  opacity: .42 !important;
  cursor: not-allowed !important;
}
.editor-stock-toggle-list {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
}
@media (max-width: 980px) {
  .editor-stock-color-row {
    grid-template-columns: 38px minmax(0, 1fr) !important;
  }
  .editor-stock-color-row input,
  .editor-stock-color-actions {
    grid-column: 2 !important;
  }
  .editor-stock-toggle-list {
    grid-template-columns: 1fr !important;
  }
}


/* Final audit pass: clean Apple-like stock/pre-cut editor section */
.editor-section-card-stock {
  padding: 18px !important;
  border-radius: 18px !important;
  border: 1px solid rgba(0,0,0,.08) !important;
  background: rgba(255,255,255,.96) !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.85) inset, 0 10px 30px rgba(0,0,0,.055) !important;
}
.editor-section-card-stock > .editor-section-heading {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 4px !important;
  align-items: start !important;
  margin: 0 0 16px !important;
  padding: 0 0 14px !important;
  border-bottom: 1px solid rgba(0,0,0,.075) !important;
}
.editor-section-card-stock > .editor-section-heading strong,
.editor-section-card-stock > .editor-section-heading span {
  display: block !important;
  text-align: left !important;
}
.editor-section-card-stock > .editor-section-heading strong {
  color: #1d1d1f !important;
  font-size: 16px !important;
  line-height: 1.2 !important;
  font-weight: 700 !important;
  letter-spacing: -.01em !important;
}
.editor-section-card-stock > .editor-section-heading span {
  max-width: 640px !important;
  color: #6e6e73 !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}
.editor-section-card-stock .editor-stock-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 14px 12px !important;
}
.editor-section-card-stock .editor-stock-grid label,
.editor-section-card-stock .editor-stock-colors label {
  min-width: 0 !important;
  display: grid !important;
  gap: 6px !important;
  color: #6e6e73 !important;
  font-size: 11px !important;
  line-height: 1.1 !important;
  font-weight: 700 !important;
  letter-spacing: .035em !important;
  text-transform: uppercase !important;
}
.editor-section-card-stock .editor-stock-grid input,
.editor-section-card-stock .editor-stock-grid select,
.editor-stock-color-row input {
  width: 100% !important;
  height: 38px !important;
  min-height: 38px !important;
  border: 1px solid rgba(0,0,0,.13) !important;
  border-radius: 10px !important;
  background: #fbfbfd !important;
  color: #1d1d1f !important;
  padding: 0 12px !important;
  font-size: 13px !important;
  line-height: 38px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  box-shadow: inset 0 1px 1px rgba(0,0,0,.025) !important;
  outline: none !important;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease !important;
}
.editor-section-card-stock .editor-stock-grid select {
  appearance: auto !important;
  padding-right: 30px !important;
}
.editor-section-card-stock .editor-stock-grid input:focus,
.editor-section-card-stock .editor-stock-grid select:focus,
.editor-stock-color-row input:focus {
  border-color: #f96302 !important;
  background: #fff !important;
  box-shadow: 0 0 0 4px rgba(249,99,2,.13) !important;
}
.editor-section-card-stock .editor-stock-toggle-list {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 8px !important;
  padding: 10px !important;
  border: 1px solid rgba(0,0,0,.06) !important;
  border-radius: 14px !important;
  background: #f5f5f7 !important;
}
.editor-section-card-stock .editor-stock-toggle-list label {
  min-height: 40px !important;
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
  padding: 8px 10px !important;
  border: 1px solid rgba(0,0,0,.08) !important;
  border-radius: 11px !important;
  background: #fff !important;
  color: #1d1d1f !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 750 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}
.editor-section-card-stock .editor-stock-toggle-list input[type="checkbox"] {
  flex: 0 0 auto !important;
  width: 17px !important;
  height: 17px !important;
  min-height: 17px !important;
  margin: 0 !important;
  accent-color: #f96302 !important;
}
.editor-section-card-stock .editor-stock-colors {
  margin-top: 18px !important;
  padding-top: 16px !important;
  border-top: 1px solid rgba(0,0,0,.075) !important;
}
.editor-section-card-stock .editor-gallery-title-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  gap: 12px !important;
  align-items: start !important;
  margin: 0 0 12px !important;
  padding: 0 !important;
}
.editor-section-card-stock .editor-gallery-title-row strong {
  display: block !important;
  color: #1d1d1f !important;
  font-size: 13px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}
.editor-section-card-stock .editor-gallery-title-row span {
  display: block !important;
  margin-top: 3px !important;
  color: #6e6e73 !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
  font-weight: 600 !important;
}
.editor-section-card-stock .editor-gallery-title-row .editor-add-link-button {
  height: 34px !important;
  min-height: 34px !important;
  border-radius: 999px !important;
  padding: 0 13px !important;
  background: #fff !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.055) !important;
}
.editor-stock-color-row {
  grid-template-columns: 34px minmax(130px, 1fr) minmax(115px, .82fr) 105px minmax(170px, 1.15fr) auto !important;
  gap: 8px !important;
  align-items: center !important;
  padding: 8px !important;
  border: 1px solid rgba(0,0,0,.065) !important;
  border-radius: 13px !important;
  background: #fbfbfd !important;
}
.editor-stock-color-preview {
  width: 30px !important;
  height: 30px !important;
  border-radius: 8px !important;
  background-clip: padding-box !important;
}
.editor-stock-color-actions {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  justify-content: flex-end !important;
}
.editor-stock-color-actions button,
.editor-stock-color-actions .editor-gallery-remove {
  width: 29px !important;
  height: 29px !important;
  min-height: 29px !important;
  border: 1px solid rgba(0,0,0,.12) !important;
  border-radius: 999px !important;
  background: #fff !important;
  color: #6e6e73 !important;
  padding: 0 !important;
  box-shadow: none !important;
}
.editor-stock-color-actions button:hover:not(:disabled) {
  border-color: #f96302 !important;
  color: #f96302 !important;
}
.editor-stock-color-actions button:disabled {
  opacity: .35 !important;
  cursor: not-allowed !important;
}
.editor-section-card-stock-muted {
  padding: 16px !important;
  border-radius: 16px !important;
  border: 1px dashed rgba(0,0,0,.16) !important;
  background: #fbfbfd !important;
}
.editor-section-card-stock-muted .editor-section-heading {
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  display: grid !important;
  gap: 4px !important;
}
.editor-section-card-stock-muted .editor-section-heading span {
  text-align: left !important;
  color: #6e6e73 !important;
  font-weight: 600 !important;
}
@media (max-width: 980px) {
  .editor-section-card-stock .editor-stock-grid,
  .editor-section-card-stock .editor-stock-toggle-list {
    grid-template-columns: 1fr !important;
  }
  .editor-stock-color-row {
    grid-template-columns: 34px minmax(0, 1fr) !important;
  }
  .editor-stock-color-row input,
  .editor-stock-color-actions {
    grid-column: 2 !important;
  }
  .editor-stock-color-actions {
    justify-content: flex-start !important;
  }
}
@media (max-width: 560px) {
  .editor-section-card-stock {
    padding: 14px !important;
  }
  .editor-section-card-stock .editor-gallery-title-row {
    grid-template-columns: 1fr !important;
  }
  .editor-section-card-stock .editor-gallery-title-row .editor-add-link-button {
    width: 100% !important;
    justify-content: center !important;
  }
}


/* Grid distinction: stock/pre-cut cards vs custom cards */
.category-screenshot-page .hd-stock-card .hd-card-info {
  padding-top: 54px !important;
}
.category-screenshot-page .hd-stock-card .product-image img {
  object-fit: cover !important;
}
.category-screenshot-page .hd-stock-swatch-line {
  order: 0 !important;
  min-height: 28px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin: 0 0 6px !important;
}
.hd-stock-swatch {
  width: 22px !important;
  height: 22px !important;
  border: 1px solid #bbb !important;
  border-radius: 4px !important;
  display: inline-block !important;
  overflow: hidden !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7) !important;
}
.hd-stock-swatch img {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  object-fit: cover !important;
}
.hd-stock-more-swatches {
  border: 0 !important;
  background: transparent !important;
  color: #1f5f88 !important;
  padding: 0 0 0 2px !important;
  font-size: 12px !important;
  text-decoration: underline !important;
}
.category-screenshot-page .hd-stock-install-note {
  order: 0 !important;
  margin: 0 0 20px !important;
  color: #333 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
}
.category-screenshot-page .hd-stock-card .product-title {
  min-height: 36px !important;
  margin-bottom: 4px !important;
}
.category-screenshot-page .hd-stock-card .hd-card-price-area {
  margin-top: 6px !important;
}
.category-screenshot-page .hd-stock-card .hd-card-price-row {
  gap: 4px !important;
  align-items: flex-end !important;
}
.category-screenshot-page .hd-stock-card .hd-card-price::after {
  content: " - " !important;
  align-self: center !important;
  margin: 0 2px 0 5px !important;
  color: #111 !important;
  font-size: 20px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-savings {
  display: none !important;
}
.category-screenshot-page .hd-stock-card .hd-card-fulfillment {
  order: 5 !important;
  display: grid !important;
  gap: 7px !important;
  margin-top: 20px !important;
  color: #111 !important;
  font-size: 12.5px !important;
  line-height: 1.25 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-fulfillment div {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}
.category-screenshot-page .hd-stock-card .hd-card-fulfillment svg {
  color: #111 !important;
  flex: 0 0 auto !important;
}
.category-screenshot-page .hd-stock-card .hd-card-fulfillment span {
  color: #00873c !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-actions {
  padding-top: 16px !important;
}
.category-screenshot-page .hd-stock-card .hd-card-build {
  height: 40px !important;
}
.category-screenshot-page .hd-custom-card .hd-stock-swatch-line,
.category-screenshot-page .hd-custom-card .hd-stock-install-note {
  display: none !important;
}
.category-screenshot-page .product-list .hd-stock-card .hd-card-info {
  padding-top: 20px !important;
}
@media (max-width: 760px) {
  .category-screenshot-page .hd-stock-card .hd-card-info {
    padding-top: 48px !important;
  }
}


/* Configurator breadcrumb back-to-product action */
.hdc-back-product-button {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  color: #f96302 !important;
  font-weight: 700 !important;
}
.hdc-back-product-button svg {
  color: #f96302 !important;
}


/* Configurator editor issue fixes */
.config-section-note {
  margin: -4px 0 12px !important;
  padding: 10px 12px !important;
  border: 1px solid #f1d0bd !important;
  border-left: 4px solid #f96302 !important;
  border-radius: 10px !important;
  background: #fff8f4 !important;
  color: #6f3200 !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
  font-weight: 700 !important;
}
.config-section-warning {
  margin: -4px 0 12px !important;
  display: grid !important;
  gap: 4px !important;
  padding: 10px 12px !important;
  border: 1px solid #f1c8c8 !important;
  border-radius: 10px !important;
  background: #fff6f6 !important;
  color: #9b1c1c !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
  font-weight: 750 !important;
}
.config-option-hidden-by-rule {
  opacity: .72 !important;
  background: #fffaf7 !important;
  border-color: #f1d0bd !important;
}
.config-hidden-badge {
  display: inline-flex !important;
  align-items: center !important;
  min-height: 24px !important;
  padding: 0 8px !important;
  border-radius: 999px !important;
  background: rgba(249,99,2,.12) !important;
  color: #b94300 !important;
  font-size: 11px !important;
  line-height: 1 !important;
  font-style: normal !important;
  font-weight: 700 !important;
  white-space: nowrap !important;
}


/* Match configurator Back to Product exactly to PDP Back to Results */
.hdc-breadcrumb.pdp-shot-breadcrumb {
  height: 43px !important;
  min-height: 48px !important;
  margin: 28px auto 14px !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  font-size: 14px !important;
  color: #777 !important;
  line-height: normal !important;
}
.hdc-breadcrumb.pdp-shot-breadcrumb span {
  color: #777 !important;
  font-size: 14px !important;
  line-height: normal !important;
}
.hdc-breadcrumb.pdp-shot-breadcrumb button:not(.pdp-shot-back-button) {
  border: 0 !important;
  background: transparent !important;
  color: #246b98 !important;
  padding: 0 !important;
  font-size: 14px !important;
  line-height: normal !important;
}
.hdc-breadcrumb .hdc-back-product-button.pdp-shot-back-button {
  background: #f96302 !important;
  color: #fff !important;
  border: 1px solid #f96302 !important;
  border-radius: 999px !important;
  padding: 8px 14px !important;
  box-shadow: 0 8px 22px rgba(249,99,2,.22) !important;
  text-decoration: none !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: normal !important;
  flex: 0 0 auto !important;
}
.hdc-breadcrumb .hdc-back-product-button.pdp-shot-back-button svg {
  width: 14px !important;
  height: 14px !important;
  color: #fff !important;
  stroke: #fff !important;
}
.hdc-breadcrumb .hdc-back-product-button.pdp-shot-back-button:hover {
  background: #d35400 !important;
  border-color: #d35400 !important;
  color: #fff !important;
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(249,99,2,.28) !important;
  text-decoration: none !important;
}

@media (max-width: 700px) {
  .hdc-breadcrumb.pdp-shot-breadcrumb {
    margin: 18px auto 12px !important;
  }
}


/* Final PLP cleanup: Home Depot-style rhythm and stock price accuracy */
.category-screenshot-page .product-card.hd-category-card {
  min-height: 700px !important;
  background: #fff !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: none !important;
}
.category-screenshot-page .hd-card-topline {
  height: 42px !important;
  padding: 17px 20px 0 20px !important;
}
.category-screenshot-page .hd-card-image-wrap {
  margin: 18px 16px 0 !important;
}
.category-screenshot-page .product-image {
  margin: 0 !important;
  aspect-ratio: 1 / 1 !important;
  background: #fff !important;
}
.category-screenshot-page .product-image img {
  padding: 0 !important;
  object-fit: cover !important;
  object-position: center !important;
}
.category-screenshot-page .hd-card-info {
  flex: 1 !important;
  min-height: auto !important;
  padding: 54px 20px 14px !important;
  display: flex !important;
  flex-direction: column !important;
}
.category-screenshot-page .hd-custom-card .hd-card-info {
  padding-top: 54px !important;
}
.category-screenshot-page .hd-stock-card .hd-card-info {
  padding-top: 54px !important;
}
.category-screenshot-page .product-title {
  order: 1 !important;
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 0 5px !important;
  overflow: hidden !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  color: #111 !important;
  font-size: 13px !important;
  line-height: 1.31 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .product-title b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-rating-line {
  order: 2 !important;
  height: 18px !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-card-rating-line .rating {
  margin: 0 !important;
  gap: 5px !important;
  color: #111 !important;
  font-size: 12px !important;
  line-height: 1 !important;
}
.category-screenshot-page .hd-card-rating-line .stars svg {
  width: 13px !important;
  height: 13px !important;
}
.category-screenshot-page .model {
  order: 3 !important;
  margin: 2px 0 10px !important;
  color: #666 !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  font-weight: 600 !important;
}
.category-screenshot-page .hd-card-price-area {
  order: 4 !important;
  margin-top: 0 !important;
}
.category-screenshot-page .starting {
  margin: 0 0 2px !important;
  color: #222 !important;
  font-size: 14px !important;
  line-height: 1.1 !important;
  font-weight: 400 !important;
  text-transform: none !important;
}
.category-screenshot-page .hd-card-price-row {
  display: flex !important;
  align-items: flex-end !important;
  gap: 7px !important;
  min-height: 35px !important;
}
.category-screenshot-page .hd-card-price {
  display: flex !important;
  align-items: flex-start !important;
  min-width: 0 !important;
  color: #222 !important;
}
.category-screenshot-page .hd-card-price .currency {
  font-size: 14px !important;
  line-height: 1 !important;
  padding-top: 2px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-price .dollars {
  font-size: 28px !important;
  line-height: .92 !important;
  font-weight: 700 !important;
  letter-spacing: -.8px !important;
}
.category-screenshot-page .hd-card-price .cents {
  font-size: 12px !important;
  line-height: 1 !important;
  padding-top: 1px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range {
  display: flex !important;
  align-items: flex-start !important;
  flex-wrap: nowrap !important;
  gap: 4px !important;
  white-space: nowrap !important;
}
.category-screenshot-page .hd-stock-card .hd-card-price::after {
  content: none !important;
  display: none !important;
}
.category-screenshot-page .hd-card-stock-price-range .stock-price-dash {
  align-self: flex-start !important;
  margin: 0 1px !important;
  padding-top: 3px !important;
  color: #111 !important;
  font-size: 20px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range .stock-price-custom {
  color: #222 !important;
  font-size: 28px !important;
  line-height: .92 !important;
  font-weight: 700 !important;
  letter-spacing: -.8px !important;
}
.category-screenshot-page .hd-card-savings {
  display: grid !important;
  align-self: flex-end !important;
  gap: 0 !important;
  padding-bottom: 2px !important;
  color: #666 !important;
  font-size: 10px !important;
  line-height: 1.15 !important;
}
.category-screenshot-page .hd-card-savings span:last-child {
  color: #008a2e !important;
}
.category-screenshot-page .hd-card-promo {
  margin-top: 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  align-self: flex-start !important;
  padding: 6px 10px !important;
  border-radius: 3px !important;
  background: #9fe6c4 !important;
  color: #111 !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-fulfillment {
  order: 5 !important;
  margin-top: 16px !important;
  display: grid !important;
  gap: 7px !important;
  color: #111 !important;
  font-size: 12.5px !important;
  line-height: 1.25 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-fulfillment div {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}
.category-screenshot-page .hd-card-fulfillment svg {
  flex: 0 0 auto !important;
  width: 14px !important;
  height: 14px !important;
  color: #111 !important;
}
.category-screenshot-page .hd-card-fulfillment b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-fulfillment span {
  color: #00873c !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-actions {
  order: 6 !important;
  margin-top: auto !important;
  padding-top: 16px !important;
}
.category-screenshot-page .hd-card-build {
  height: 42px !important;
  border: 1px solid #f96302 !important;
  border-radius: 7px !important;
  background: #fff !important;
  color: #f96302 !important;
  font-size: 14px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-stock-swatch-line {
  order: 0 !important;
  min-height: 28px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin: 0 0 6px !important;
}
.category-screenshot-page .hd-stock-swatch {
  width: 24px !important;
  height: 24px !important;
  border: 1px solid #aaa !important;
  border-radius: 4px !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.72) !important;
}
.category-screenshot-page .hd-stock-more-swatches {
  min-height: 24px !important;
  border: 0 !important;
  background: transparent !important;
  color: #1f5f88 !important;
  padding: 0 0 0 2px !important;
  font-size: 12px !important;
  line-height: 24px !important;
  font-weight: 500 !important;
  text-decoration: underline !important;
}
.category-screenshot-page .hd-stock-install-note {
  order: 0 !important;
  margin: 0 0 18px !important;
  color: #333 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-savings {
  display: none !important;
}
.category-screenshot-page .product-list .hd-card-info {
  padding-top: 20px !important;
}
@media (max-width: 1280px) {
  .category-screenshot-page .hd-card-info,
  .category-screenshot-page .hd-custom-card .hd-card-info,
  .category-screenshot-page .hd-stock-card .hd-card-info {
    padding-top: 44px !important;
  }
}
@media (max-width: 900px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: 650px !important;
  }
  .category-screenshot-page .hd-card-info,
  .category-screenshot-page .hd-custom-card .hd-card-info,
  .category-screenshot-page .hd-stock-card .hd-card-info {
    padding-top: 34px !important;
  }
}
@media (max-width: 560px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: auto !important;
  }
  .category-screenshot-page .hd-card-info,
  .category-screenshot-page .hd-custom-card .hd-card-info,
  .category-screenshot-page .hd-stock-card .hd-card-info {
    padding-top: 24px !important;
  }
}


/* Final price scale adjustment: less heavy, closer to Home Depot PLP cards */
.category-screenshot-page .hd-card-price .currency {
  font-size: 13px !important;
  padding-top: 2px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-price .dollars {
  font-size: 24px !important;
  line-height: .94 !important;
  font-weight: 700 !important;
  letter-spacing: -.45px !important;
}
.category-screenshot-page .hd-card-price .cents {
  font-size: 11px !important;
  padding-top: 1px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range {
  gap: 3px !important;
}
.category-screenshot-page .hd-card-stock-price-range .stock-price-dash {
  font-size: 18px !important;
  padding-top: 2px !important;
  margin: 0 2px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range .stock-price-custom {
  font-size: 24px !important;
  line-height: .94 !important;
  font-weight: 700 !important;
  letter-spacing: -.45px !important;
}
.category-screenshot-page .hd-card-price-row {
  min-height: 30px !important;
}
.category-screenshot-page .hd-card-savings {
  font-size: 10px !important;
  font-weight: 500 !important;
  padding-bottom: 1px !important;
}
.category-screenshot-page .hd-card-savings span:last-child {
  font-weight: 700 !important;
}


/* Final Home Depot PLP card rhythm: fixed image, fixed option zone, tight product data */
.category-screenshot-page .product-card.hd-category-card {
  min-height: 690px !important;
  display: flex !important;
  flex-direction: column !important;
  background: #fff !important;
  box-shadow: none !important;
}
.category-screenshot-page .hd-card-topline {
  height: 34px !important;
  min-height: 34px !important;
  padding: 6px 16px 0 !important;
  position: relative !important;
}
.category-screenshot-page .product-card.hd-category-card .hd-card-heart {
  top: 7px !important;
  right: 16px !important;
  width: 24px !important;
  height: 24px !important;
}
.category-screenshot-page .hd-best-badge {
  font-size: 11px !important;
  line-height: 1 !important;
  padding: 3px 6px !important;
}
.category-screenshot-page .hd-card-image-wrap {
  margin: 10px 16px 0 !important;
}
.category-screenshot-page .product-image {
  margin: 0 !important;
  aspect-ratio: 1 / 1 !important;
  background: #fff !important;
}
.category-screenshot-page .product-image img {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  object-fit: cover !important;
  object-position: center !important;
}
.category-screenshot-page .hd-card-info,
.category-screenshot-page .hd-custom-card .hd-card-info,
.category-screenshot-page .hd-stock-card .hd-card-info {
  flex: 1 !important;
  min-height: auto !important;
  padding: 0 16px 14px !important;
  display: flex !important;
  flex-direction: column !important;
}
.category-screenshot-page .hd-card-option-zone {
  order: 0 !important;
  min-height: 76px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  gap: 6px !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-stock-swatch-line {
  min-height: 24px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-stock-swatch {
  width: 22px !important;
  height: 22px !important;
  border: 1px solid #aaa !important;
  border-radius: 4px !important;
  overflow: hidden !important;
  display: inline-block !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.72) !important;
}
.category-screenshot-page .hd-stock-more-swatches {
  min-height: 22px !important;
  padding: 0 0 0 2px !important;
  border: 0 !important;
  background: transparent !important;
  color: #1f5f88 !important;
  font-size: 12px !important;
  line-height: 22px !important;
  font-weight: 500 !important;
  text-decoration: underline !important;
}
.category-screenshot-page .hd-stock-install-note {
  margin: 0 !important;
  color: #333 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .product-title,
.category-screenshot-page .hd-stock-card .product-title {
  order: 1 !important;
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 0 4px !important;
  overflow: hidden !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  color: #111 !important;
  font-size: 13px !important;
  line-height: 1.3 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .product-title b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-rating-line {
  order: 2 !important;
  height: 18px !important;
  min-height: 18px !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-card-rating-line .rating {
  margin: 0 !important;
  gap: 5px !important;
  color: #111 !important;
  font-size: 12px !important;
  line-height: 1 !important;
}
.category-screenshot-page .hd-card-rating-line .stars svg {
  width: 13px !important;
  height: 13px !important;
}
.category-screenshot-page .model {
  order: 3 !important;
  margin: 2px 0 10px !important;
  color: #666 !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  font-weight: 600 !important;
}
.category-screenshot-page .hd-card-price-area,
.category-screenshot-page .hd-stock-card .hd-card-price-area {
  order: 4 !important;
  margin-top: 0 !important;
}
.category-screenshot-page .starting {
  margin: 0 0 2px !important;
  color: #222 !important;
  font-size: 13px !important;
  line-height: 1.1 !important;
  font-weight: 400 !important;
  text-transform: none !important;
}
.category-screenshot-page .hd-card-price-row,
.category-screenshot-page .hd-stock-card .hd-card-price-row {
  display: flex !important;
  align-items: flex-end !important;
  gap: 7px !important;
  min-height: 30px !important;
}
.category-screenshot-page .hd-card-price {
  display: flex !important;
  align-items: flex-start !important;
  min-width: 0 !important;
  color: #222 !important;
}
.category-screenshot-page .hd-card-price .currency {
  font-size: 13px !important;
  line-height: 1 !important;
  padding-top: 2px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-price .dollars {
  font-size: 24px !important;
  line-height: .94 !important;
  font-weight: 700 !important;
  letter-spacing: -.45px !important;
}
.category-screenshot-page .hd-card-price .cents {
  font-size: 11px !important;
  line-height: 1 !important;
  padding-top: 1px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range {
  display: flex !important;
  align-items: flex-start !important;
  flex-wrap: nowrap !important;
  gap: 3px !important;
  white-space: nowrap !important;
}
.category-screenshot-page .hd-stock-card .hd-card-price::after {
  content: none !important;
  display: none !important;
}
.category-screenshot-page .hd-card-stock-price-range .stock-price-dash {
  align-self: flex-start !important;
  margin: 0 2px !important;
  padding-top: 2px !important;
  color: #111 !important;
  font-size: 18px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range .stock-price-custom {
  color: #222 !important;
  font-size: 24px !important;
  line-height: .94 !important;
  font-weight: 700 !important;
  letter-spacing: -.45px !important;
}
.category-screenshot-page .hd-card-savings {
  display: grid !important;
  align-self: flex-end !important;
  gap: 0 !important;
  padding-bottom: 1px !important;
  color: #666 !important;
  font-size: 10px !important;
  line-height: 1.15 !important;
  font-weight: 500 !important;
}
.category-screenshot-page .hd-card-savings span:last-child {
  color: #008a2e !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-savings {
  display: none !important;
}
.category-screenshot-page .hd-card-promo {
  margin-top: 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  align-self: flex-start !important;
  padding: 6px 10px !important;
  border-radius: 3px !important;
  background: #9fe6c4 !important;
  color: #111 !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-fulfillment,
.category-screenshot-page .hd-stock-card .hd-card-fulfillment {
  order: 5 !important;
  margin-top: 16px !important;
  display: grid !important;
  gap: 7px !important;
  color: #111 !important;
  font-size: 12.5px !important;
  line-height: 1.25 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-fulfillment div {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}
.category-screenshot-page .hd-card-fulfillment svg {
  flex: 0 0 auto !important;
  width: 14px !important;
  height: 14px !important;
  color: #111 !important;
}
.category-screenshot-page .hd-card-fulfillment b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-fulfillment span {
  color: #00873c !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-actions,
.category-screenshot-page .hd-stock-card .hd-card-actions {
  order: 6 !important;
  margin-top: auto !important;
  padding-top: 16px !important;
}
.category-screenshot-page .hd-card-build,
.category-screenshot-page .hd-stock-card .hd-card-build {
  height: 40px !important;
  border: 1px solid #f96302 !important;
  border-radius: 7px !important;
  background: #fff !important;
  color: #f96302 !important;
  font-size: 14px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .product-list .hd-card-option-zone {
  min-height: 0 !important;
}
.category-screenshot-page .product-list .hd-card-info {
  padding-top: 20px !important;
}
@media (max-width: 900px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: 650px !important;
  }
  .category-screenshot-page .hd-card-option-zone {
    min-height: 66px !important;
  }
}
@media (max-width: 560px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: auto !important;
  }
  .category-screenshot-page .hd-card-option-zone {
    min-height: 42px !important;
  }
}


/* Clean Apple-like image asset cards, hides long saved URLs by default */
.editor-section-card-images .editor-section-grid-images {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}
.editor-image-asset-card {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 20px;
  background: linear-gradient(180deg, #fff 0%, #fbfbfd 100%);
  box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 14px 34px rgba(0,0,0,.045);
}
.editor-image-asset-preview {
  width: 86px;
  min-height: 86px;
  border-radius: 16px;
  background: #f5f5f7;
  color: #8e8e93;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.06);
}
.editor-image-asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.editor-image-asset-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.editor-image-asset-topline {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.editor-image-asset-label {
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: -.01em;
  text-transform: none;
}
.editor-image-asset-status {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}
.editor-image-asset-status.ready { color: #137333; background: #edf9f0; }
.editor-image-asset-status.empty { color: #8a5a00; background: #fff7df; }
.editor-image-asset-name {
  color: #6e6e73;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: none;
}
.editor-image-asset-help {
  color: #8e8e93;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.3;
  text-transform: none;
}
.editor-image-asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
  margin-top: auto;
}
.editor-image-upload-button,
.editor-image-link-button,
.editor-image-clear-button,
.editor-gallery-replace-button,
.editor-gallery-link-toggle {
  min-height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.10);
  background: #fff;
  color: #1d1d1f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  font-size: 12px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.editor-image-upload-button {
  position: relative;
  overflow: hidden;
  background: #1d1d1f;
  color: #fff !important;
  border-color: #1d1d1f;
}
.editor-image-upload-button.is-replace {
  background: #1d1d1f;
  color: #fff !important;
  border-color: #1d1d1f;
}
.editor-image-upload-button input,
.editor-gallery-replace-button input {
  position: absolute !important;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  opacity: 0;
  cursor: pointer;
}
.editor-gallery-replace-button {
  position: relative;
  overflow: hidden;
  background: #1d1d1f;
  color: #fff !important;
  border-color: #1d1d1f;
}
.editor-gallery-name-input {
  min-width: 0;
  width: 100%;
  height: 28px !important;
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
  color: #1d1d1f !important;
  font-size: 12.5px !important;
  font-weight: 950 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}
.editor-gallery-name-input:focus {
  box-shadow: none !important;
  background: transparent !important;
}
.editor-image-link-button:hover,
.editor-gallery-link-toggle:hover { background: #f5f5f7; }
.editor-image-clear-button {
  width: 32px;
  padding: 0;
  color: #b42318;
  background: #fff5f5;
  border-color: #f1c7c7;
}
.editor-image-url-input {
  height: 36px !important;
  border-radius: 12px !important;
  background: #f5f5f7 !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  padding: 0 11px !important;
  font-size: 12px !important;
  text-transform: none !important;
}
.editor-section-card-gallery .editor-gallery-url-row {
  grid-template-columns: 28px 54px minmax(0,1fr) 34px !important;
  align-items: start !important;
  border-radius: 18px !important;
  padding: 10px !important;
}
.editor-gallery-row-main {
  min-width: 0;
  display: grid;
  gap: 6px;
}
.editor-gallery-row-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.editor-gallery-row-title strong {
  color: #1d1d1f;
  font-size: 12.5px;
  font-weight: 950;
  text-transform: none;
  letter-spacing: 0;
}
.editor-gallery-row-title span {
  color: #137333;
  background: #edf9f0;
  border-radius: 999px;
  padding: 3px 7px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: none;
}
.editor-gallery-row-name {
  color: #6e6e73;
  font-size: 11.5px;
  font-weight: 750;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: none;
}
.editor-gallery-row-main input {
  height: 36px !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  background: #f5f5f7 !important;
  border-radius: 12px !important;
  padding: 0 10px !important;
}
.editor-gallery-row-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}
.editor-gallery-replace-button,
.editor-gallery-link-toggle {
  justify-self: start;
  min-height: 28px;
  padding: 0 10px;
  font-size: 11.5px;
}
@media (max-width: 900px) {
  .editor-section-card-images .editor-section-grid-images { grid-template-columns: 1fr !important; }
}
@media (max-width: 560px) {
  .editor-image-asset-card { grid-template-columns: 68px minmax(0, 1fr); gap: 11px; padding: 10px; }
  .editor-image-asset-preview { width: 68px; min-height: 68px; border-radius: 14px; }
  .editor-section-card-gallery .editor-gallery-url-row { grid-template-columns: 24px 44px minmax(0,1fr) 32px !important; gap: 8px !important; }
  .editor-image-asset-actions { gap: 6px; }
  .editor-image-upload-button, .editor-image-link-button { flex: 1 1 auto; }
}


/* Force all black replace/upload buttons to use white foreground */
.editor-image-upload-button,
.editor-image-upload-button *,
.editor-gallery-replace-button,
.editor-gallery-replace-button * {
  color: #fff !important;
  stroke: #fff !important;
}
.editor-image-upload-button.is-replace,
.editor-gallery-replace-button {
  background: #1d1d1f !important;
  border-color: #1d1d1f !important;
  color: #fff !important;
}


/* Carousel replace button foreground fix */
.editor-gallery-row-buttons label.editor-gallery-replace-button,
.editor-gallery-row-buttons label.editor-gallery-replace-button:hover,
.editor-gallery-row-buttons label.editor-gallery-replace-button:focus,
.editor-gallery-row-buttons label.editor-gallery-replace-button:active {
  background: #1d1d1f !important;
  border-color: #1d1d1f !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
}
.editor-gallery-row-buttons label.editor-gallery-replace-button svg,
.editor-gallery-row-buttons label.editor-gallery-replace-button svg * {
  color: #fff !important;
  stroke: #fff !important;
}


/* Apple-like editor section accordions */
.editor-accordion-section {
  padding: 0 !important;
  overflow: hidden;
  background: rgba(255,255,255,.96) !important;
  border: 1px solid rgba(0,0,0,.075) !important;
  border-radius: 18px !important;
  box-shadow: 0 1px 0 rgba(255,255,255,.85) inset, 0 10px 28px rgba(0,0,0,.045) !important;
}
.editor-accordion-heading {
  width: 100%;
  min-height: 66px;
  border: 0 !important;
  background: transparent !important;
  color: #1d1d1f !important;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px !important;
  text-align: left;
}
.editor-accordion-heading:hover {
  background: #fbfbfd !important;
}
.editor-accordion-title-block {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.editor-accordion-title-block strong {
  color: #1d1d1f !important;
  font-size: 14px !important;
  font-weight: 950 !important;
  letter-spacing: -.01em;
  line-height: 1.15;
}
.editor-accordion-title-block span {
  color: #8e8e93 !important;
  font-size: 11.5px !important;
  font-weight: 750 !important;
  line-height: 1.3;
  text-transform: none !important;
}
.editor-accordion-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  min-width: 0;
}
.editor-accordion-actions i {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: #f5f5f7;
  color: #6e6e73;
  font-size: 11px;
  font-weight: 700;
  font-style: normal;
  white-space: nowrap;
  text-transform: none;
}
.editor-accordion-actions svg {
  color: #6e6e73;
  transition: transform .18s ease;
}
.editor-accordion-section.is-open .editor-accordion-actions svg {
  transform: rotate(180deg);
}
.editor-accordion-body {
  padding: 0 16px 16px;
  animation: editorAccordionIn .18s ease both;
}
.editor-accordion-body::before {
  content: "";
  display: block;
  height: 1px;
  background: rgba(0,0,0,.07);
  margin: 0 0 14px;
}
@keyframes editorAccordionIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}
.editor-section-empty-note {
  min-height: auto !important;
  padding: 14px !important;
  border-radius: 14px !important;
  background: #f5f5f7 !important;
  color: #6e6e73 !important;
  font-weight: 700 !important;
  text-align: left !important;
}
@media (max-width: 700px) {
  .editor-accordion-heading {
    grid-template-columns: 1fr;
    gap: 9px;
    padding: 13px 14px !important;
  }
  .editor-accordion-actions {
    justify-content: space-between;
    width: 100%;
  }
  .editor-accordion-body {
    padding: 0 14px 14px;
  }
  .editor-setting-row {
    align-items: flex-start;
  }
}


/* Configurator editor accordion refinement */
.config-editor-accordion {
  padding: 0 !important;
  gap: 12px !important;
}
.config-accordion-card {
  margin: 0 !important;
}
.config-section-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.config-section-toolbar .secondary-action,
.config-section-toolbar .editor-add-link-button {
  min-height: 34px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
}
.config-option-list-compact {
  display: grid !important;
  gap: 10px !important;
}
.config-option-accordion-row {
  padding: 0 !important;
  border-radius: 16px !important;
  background: #fff !important;
  border: 1px solid rgba(0,0,0,.08) !important;
  overflow: hidden !important;
  box-shadow: 0 1px 3px rgba(0,0,0,.04) !important;
}
.config-option-summary-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
}
.config-option-accordion-row .config-option-drag-handle {
  width: 36px !important;
  min-height: 58px !important;
  border: 0 !important;
  border-right: 1px solid rgba(0,0,0,.06) !important;
  border-radius: 0 !important;
  background: #fbfbfd !important;
  color: #8e8e93 !important;
  box-shadow: none !important;
}
.config-option-summary-button {
  width: 100%;
  min-height: 58px;
  border: 0 !important;
  background: transparent !important;
  color: #1d1d1f !important;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px !important;
  text-align: left;
}
.config-option-summary-button:hover {
  background: #fbfbfd !important;
}
.config-option-summary-button span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.config-option-summary-button strong {
  color: #1d1d1f !important;
  font-size: 13px !important;
  font-weight: 950 !important;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.config-option-summary-button small {
  color: #8e8e93 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  line-height: 1.2;
}
.config-option-summary-button i {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #edf9f0;
  color: #137333;
  font-size: 10.5px;
  font-weight: 700;
  font-style: normal;
  white-space: nowrap;
}
.config-option-summary-button svg {
  color: #6e6e73;
  transition: transform .18s ease;
}
.config-option-accordion-row.is-open .config-option-summary-button svg {
  transform: rotate(180deg);
}
.config-option-expanded-panel {
  padding: 12px;
  border-top: 1px solid rgba(0,0,0,.07);
  background: #fff;
  animation: editorAccordionIn .18s ease both;
}
.config-option-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.config-option-toolbar button {
  min-height: 30px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  background: #fff !important;
  color: #1d1d1f !important;
  padding: 0 10px !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.config-option-toolbar button:disabled {
  opacity: .38;
  cursor: not-allowed;
}
.config-option-toolbar .config-remove-option {
  color: #b42318 !important;
  background: #fff5f5 !important;
  border-color: #f1c7c7 !important;
}
.config-option-advanced {
  margin-top: 10px;
  border-radius: 12px;
  background: #f5f5f7;
  border: 1px solid rgba(0,0,0,.06);
  padding: 0;
}
.config-option-advanced summary {
  cursor: pointer;
  padding: 10px 12px;
  color: #6e6e73;
  font-size: 12px;
  font-weight: 700;
  list-style: none;
}
.config-option-advanced summary::-webkit-details-marker {
  display: none;
}
.config-option-advanced label {
  display: grid;
  gap: 5px;
  padding: 0 12px 12px;
  color: #6e6e73;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.config-option-advanced input {
  width: 100%;
  height: 38px;
  border-radius: 11px;
  border: 1px solid rgba(0,0,0,.10);
  background: #fff;
  padding: 0 10px;
  color: #1d1d1f;
  text-transform: none;
}
@media (max-width: 640px) {
  .config-option-summary-button {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .config-option-summary-button i {
    justify-self: start;
  }
  .config-option-summary-button svg {
    grid-column: 2;
    grid-row: 1;
  }
  .config-section-toolbar {
    justify-content: stretch;
  }
  .config-section-toolbar .secondary-action,
  .config-section-toolbar .editor-add-link-button {
    flex: 1 1 160px;
    justify-content: center;
  }
}


/* Configurator panel spacing cleanup */
.config-editor-accordion .editor-accordion-body {
  padding: 0 16px 14px !important;
}
.config-editor-accordion .editor-accordion-body::before {
  margin-bottom: 10px !important;
}
.config-editor-accordion .config-section-toolbar {
  justify-content: flex-start !important;
  margin: 0 0 10px !important;
}
.config-editor-accordion .config-section-toolbar .secondary-action,
.config-editor-accordion .config-section-toolbar .editor-add-link-button {
  min-height: 32px !important;
  padding: 0 11px !important;
  box-shadow: none !important;
}
.config-editor-accordion .config-size-grid,
.config-editor-accordion .config-option-fields {
  gap: 10px 12px !important;
}
.config-editor-accordion .config-size-grid label,
.config-editor-accordion .config-option-fields label {
  display: grid !important;
  gap: 6px !important;
}
.config-editor-accordion .config-size-grid input,
.config-editor-accordion .config-size-grid textarea,
.config-editor-accordion .config-option-fields input,
.config-editor-accordion .config-option-fields textarea {
  margin-top: 0 !important;
}


/* Configurator reset overflow menu */
.config-editor-accordion .config-section-toolbar {
  justify-content: space-between !important;
  align-items: center !important;
}
.config-section-toolbar-menu-only {
  justify-content: flex-end !important;
}
.config-reset-menu-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}
.config-more-button {
  width: 34px !important;
  height: 34px !important;
  min-height: 34px !important;
  border-radius: 999px !important;
  border: 1px solid rgba(0,0,0,.10) !important;
  background: #fff !important;
  color: #1d1d1f !important;
  display: inline-grid !important;
  place-items: center !important;
  padding: 0 !important;
  box-shadow: 0 1px 2px rgba(0,0,0,.04) !important;
}
.config-more-button:hover,
.config-more-button[aria-expanded="true"] {
  background: #f5f5f7 !important;
}
.config-reset-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 25;
  min-width: 190px;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.98);
  box-shadow: 0 14px 34px rgba(0,0,0,.14);
  backdrop-filter: blur(18px);
}
.config-reset-menu button {
  width: 100%;
  min-height: 36px !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: transparent !important;
  color: #b42318 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  padding: 0 10px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  white-space: nowrap;
}
.config-reset-menu button:hover {
  background: #fff1f1 !important;
}
.config-reset-menu button svg,
.config-reset-menu button svg * {
  color: #b42318 !important;
  stroke: #b42318 !important;
}
@media (max-width: 640px) {
  .config-editor-accordion .config-section-toolbar {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .config-section-toolbar-menu-only {
    display: flex !important;
  }
}


/* Header action accordions, keep reset menu in header without awkward toolbar row */
.editor-accordion-toggle {
  width: 100%;
  min-height: 38px;
  border: 0 !important;
  background: transparent !important;
  color: #1d1d1f !important;
  display: grid;
  align-items: center;
  padding: 0 !important;
  text-align: left;
}
.editor-accordion-toggle:hover {
  background: transparent !important;
}
.editor-accordion-chevron {
  width: 30px !important;
  height: 30px !important;
  min-height: 30px !important;
  border: 0 !important;
  border-radius: 999px !important;
  background: transparent !important;
  color: #6e6e73 !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
}
.editor-accordion-chevron:hover {
  background: #f5f5f7 !important;
}
.editor-accordion-actions svg {
  transform: none !important;
}
.editor-accordion-section.is-open .editor-accordion-chevron svg {
  transform: rotate(180deg) !important;
}
.editor-accordion-header-actions {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.config-accordion-card {
  overflow: visible !important;
}
.config-accordion-card .editor-accordion-heading {
  position: relative;
  z-index: 20;
}
.config-accordion-card .editor-accordion-body {
  position: relative;
  z-index: 1;
}
.config-editor-accordion .config-section-toolbar {
  justify-content: flex-start !important;
  margin: 0 0 10px !important;
}
.config-editor-accordion .config-section-toolbar .editor-add-link-button {
  margin-right: auto;
}
.config-editor-accordion .config-section-toolbar-menu-only {
  display: none !important;
}
@media (max-width: 700px) {
  .editor-accordion-heading {
    grid-template-columns: minmax(0, 1fr) auto !important;
  }
  .editor-accordion-actions {
    width: auto !important;
  }
}


/* Configurator section visibility manager */
.config-sections-manager {
  display: grid;
  gap: 9px;
}
.config-section-visibility-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(0,0,0,.07);
  border-radius: 14px;
  background: #fff;
}
.config-section-visibility-row.is-hidden {
  background: #fbfbfd;
  border-style: dashed;
}
.config-section-visibility-row > div {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.config-section-visibility-row strong {
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.2;
}
.config-section-visibility-row span {
  color: #8e8e93;
  font-size: 11.5px;
  font-weight: 750;
  line-height: 1.3;
}
.config-required-pill,
.config-hide-section-button,
.config-show-section-button {
  min-height: 30px;
  border-radius: 999px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.config-required-pill {
  background: #f5f5f7;
  color: #6e6e73 !important;
}
.config-hide-section-button,
.config-show-section-button {
  border: 1px solid rgba(0,0,0,.10);
  cursor: pointer;
}
.config-hide-section-button {
  background: #fff;
  color: #1d1d1f;
}
.config-show-section-button {
  background: #1d1d1f;
  color: #fff;
  border-color: #1d1d1f;
}
.config-section-hidden {
  opacity: .82;
  border-style: dashed !important;
}
.config-section-hidden .editor-accordion-actions > i {
  color: #8a5a00 !important;
  background: #fff7df !important;
}
.config-visibility-menu-item {
  color: #1d1d1f !important;
}
.config-reset-menu .config-visibility-menu-item svg,
.config-reset-menu .config-visibility-menu-item svg * {
  color: #1d1d1f !important;
  stroke: #1d1d1f !important;
}
.config-reset-menu .config-visibility-menu-item:hover {
  background: #f5f5f7 !important;
}
@media (max-width: 560px) {
  .config-section-visibility-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .config-hide-section-button,
  .config-show-section-button,
  .config-required-pill {
    justify-self: start;
  }
}


/* Custom configurator sections */
.config-section-visibility-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}
.config-add-custom-section-button {
  min-height: 40px;
  border: 1px dashed rgba(0,0,0,.18);
  border-radius: 14px;
  background: #fff;
  color: #1d1d1f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}
.config-add-custom-section-button:hover {
  background: #f5f5f7;
}
.config-remove-custom-section-button {
  min-height: 30px;
  border-radius: 999px;
  border: 1px solid #f1c7c7;
  background: #fff5f5;
  color: #b42318;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.config-remove-custom-section-button svg,
.config-remove-custom-section-button svg * {
  color: #b42318 !important;
  stroke: #b42318 !important;
}
.config-custom-section-fields {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  gap: 10px 12px;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.07);
  background: #fbfbfd;
}
.config-custom-section-fields label {
  min-width: 0;
  display: grid;
  gap: 6px;
  color: #6e6e73;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.config-custom-section-fields label.wide {
  grid-column: auto;
}
.config-custom-section-fields input {
  width: 100%;
  height: 38px;
  border-radius: 11px;
  border: 1px solid rgba(0,0,0,.10);
  background: #fff;
  padding: 0 10px;
  color: #1d1d1f;
  font-size: 13px;
  font-weight: 700;
  text-transform: none;
}
.config-remove-menu-item {
  color: #b42318 !important;
}
.config-reset-menu .config-remove-menu-item svg,
.config-reset-menu .config-remove-menu-item svg * {
  color: #b42318 !important;
  stroke: #b42318 !important;
}
.hdc-custom-section-description {
  margin: -6px 0 12px;
  color: #6e6e73;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 600;
}
@media (max-width: 700px) {
  .config-custom-section-fields {
    grid-template-columns: 1fr;
  }
  .config-section-visibility-actions {
    justify-content: flex-start;
  }
}


/* Configurator header menu layering and color fix */
.config-accordion-card:has(.config-more-button[aria-expanded="true"]) {
  position: relative !important;
  z-index: 80 !important;
}
.config-accordion-card:has(.config-more-button[aria-expanded="true"]) .editor-accordion-heading {
  z-index: 100 !important;
}
.config-reset-menu-wrap {
  z-index: 120 !important;
}
.config-reset-menu {
  z-index: 9999 !important;
  min-width: 224px !important;
  background: #fff !important;
  box-shadow: 0 18px 44px rgba(0,0,0,.18) !important;
}
.config-reset-menu button {
  position: relative !important;
  z-index: 1 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.config-reset-menu button.config-visibility-menu-item {
  color: #1d1d1f !important;
}
.config-reset-menu button.config-visibility-menu-item svg,
.config-reset-menu button.config-visibility-menu-item svg * {
  color: #1d1d1f !important;
  stroke: #1d1d1f !important;
}
.config-reset-menu button:not(.config-visibility-menu-item) {
  color: #b42318 !important;
}
.config-reset-menu button:not(.config-visibility-menu-item) svg,
.config-reset-menu button:not(.config-visibility-menu-item) svg * {
  color: #b42318 !important;
  stroke: #b42318 !important;
}


/* Lower PLP product badge slightly for better visual alignment */
.category-screenshot-page .hd-card-topline .hd-best-badge {
  transform: translateY(8px);
}


/* Home Depot-style PLP card spacing polish */
.category-screenshot-page .product-grid.hd-category-grid {
  gap: 8px !important;
  align-items: stretch !important;
}
.category-screenshot-page .product-card.hd-category-card {
  min-height: 694px !important;
  display: flex !important;
  flex-direction: column !important;
  background: #fff !important;
  border: 0 !important;
  box-shadow: none !important;
}
.category-screenshot-page .hd-card-topline {
  height: 42px !important;
  min-height: 42px !important;
  padding: 15px 16px 0 !important;
  align-items: flex-start !important;
}
.category-screenshot-page .hd-card-topline .hd-best-badge {
  transform: translateY(2px) !important;
  font-size: 11px !important;
  line-height: 1 !important;
  padding: 3px 6px !important;
  background: #a7eadf !important;
  color: #00695f !important;
}
.category-screenshot-page .product-card.hd-category-card .hd-card-heart {
  top: 14px !important;
  right: 16px !important;
  width: 24px !important;
  height: 24px !important;
}
.category-screenshot-page .hd-card-image-wrap {
  margin: 0 16px !important;
}
.category-screenshot-page .product-image {
  aspect-ratio: 1 / 1 !important;
  background: #fff !important;
}
.category-screenshot-page .product-image img {
  object-fit: cover !important;
  object-position: center !important;
}
.category-screenshot-page .hd-card-info,
.category-screenshot-page .hd-custom-card .hd-card-info,
.category-screenshot-page .hd-stock-card .hd-card-info {
  flex: 1 1 auto !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 0 16px 14px !important;
}
.category-screenshot-page .hd-card-option-zone {
  min-height: 72px !important;
  justify-content: flex-end !important;
  padding-top: 10px !important;
}
.category-screenshot-page .hd-stock-swatch-line {
  min-height: 24px !important;
}
.category-screenshot-page .hd-stock-install-note {
  margin-top: 2px !important;
}
.category-screenshot-page .product-title,
.category-screenshot-page .hd-stock-card .product-title {
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 0 4px !important;
  font-size: 13px !important;
  line-height: 1.3 !important;
}
.category-screenshot-page .hd-card-rating-line {
  min-height: 18px !important;
}
.category-screenshot-page .model {
  margin: 2px 0 10px !important;
}
.category-screenshot-page .hd-card-promo {
  margin-top: 12px !important;
}
.category-screenshot-page .hd-card-fulfillment,
.category-screenshot-page .hd-stock-card .hd-card-fulfillment {
  margin-top: 20px !important;
  gap: 8px !important;
}
.category-screenshot-page .hd-card-actions,
.category-screenshot-page .hd-stock-card .hd-card-actions {
  margin-top: auto !important;
  padding-top: 16px !important;
}
.category-screenshot-page .hd-card-build,
.category-screenshot-page .hd-stock-card .hd-card-build {
  height: 42px !important;
  border-radius: 6px !important;
}
@media (max-width: 900px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: 660px !important;
  }
  .category-screenshot-page .hd-card-option-zone {
    min-height: 58px !important;
  }
}
@media (max-width: 560px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: auto !important;
  }
  .category-screenshot-page .hd-card-option-zone {
    min-height: 36px !important;
  }
}


/* Final PLP card layout model: separate stock and custom rhythm */
.category-screenshot-page .product-grid.hd-category-grid {
  gap: 8px !important;
  align-items: stretch !important;
}
.category-screenshot-page .product-card.hd-category-card {
  min-height: 704px !important;
  display: flex !important;
  flex-direction: column !important;
  background: #fff !important;
  border: 0 !important;
  box-shadow: none !important;
  overflow: hidden !important;
}
.category-screenshot-page .product-card.hd-category-card:hover {
  box-shadow: none !important;
}
.category-screenshot-page .hd-card-topline {
  height: 42px !important;
  min-height: 42px !important;
  padding: 15px 16px 0 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
}
.category-screenshot-page .hd-card-topline .hd-best-badge {
  transform: translateY(2px) !important;
  font-size: 11px !important;
  line-height: 1 !important;
  padding: 3px 6px !important;
  background: #a7eadf !important;
  color: #00695f !important;
}
.category-screenshot-page .product-card.hd-category-card .hd-card-heart {
  position: absolute !important;
  top: 14px !important;
  right: 16px !important;
  width: 24px !important;
  height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.category-screenshot-page .hd-card-image-wrap {
  margin: 0 16px !important;
  display: block !important;
}
.category-screenshot-page .product-image {
  margin: 0 !important;
  aspect-ratio: 1 / 1 !important;
  background: #fff !important;
}
.category-screenshot-page .product-image img {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  object-fit: cover !important;
  object-position: center !important;
}
.category-screenshot-page .hd-card-info,
.category-screenshot-page .hd-custom-card .hd-card-info,
.category-screenshot-page .hd-stock-card .hd-card-info {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  padding: 0 16px 14px !important;
  display: flex !important;
  flex-direction: column !important;
}
.category-screenshot-page .hd-card-option-zone {
  order: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-end !important;
  gap: 6px !important;
  margin: 0 !important;
  padding: 0 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-option-zone {
  min-height: 72px !important;
}
.category-screenshot-page .hd-custom-card .hd-card-option-zone {
  min-height: 92px !important;
}
.category-screenshot-page .hd-stock-swatch-line {
  min-height: 24px !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-stock-swatch {
  width: 22px !important;
  height: 22px !important;
  border: 1px solid #9f9f9f !important;
  border-radius: 4px !important;
  overflow: hidden !important;
  display: inline-block !important;
}
.category-screenshot-page .hd-stock-more-swatches {
  min-height: 22px !important;
  padding: 0 0 0 2px !important;
  border: 0 !important;
  background: transparent !important;
  color: #1f5f88 !important;
  font-size: 12px !important;
  line-height: 22px !important;
  font-weight: 500 !important;
  text-decoration: underline !important;
}
.category-screenshot-page .hd-stock-install-note {
  margin: 0 !important;
  color: #222 !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .product-title,
.category-screenshot-page .hd-stock-card .product-title,
.category-screenshot-page .hd-custom-card .product-title {
  order: 1 !important;
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 0 4px !important;
  overflow: hidden !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  color: #111 !important;
  font-size: 13px !important;
  line-height: 1.3 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .product-title b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-rating-line {
  order: 2 !important;
  height: 18px !important;
  min-height: 18px !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-card-rating-line .rating {
  margin: 0 !important;
  gap: 5px !important;
  color: #111 !important;
  font-size: 12px !important;
  line-height: 1 !important;
}
.category-screenshot-page .model {
  order: 3 !important;
  margin: 2px 0 10px !important;
  color: #666 !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  font-weight: 600 !important;
}
.category-screenshot-page .hd-card-price-area,
.category-screenshot-page .hd-stock-card .hd-card-price-area,
.category-screenshot-page .hd-custom-card .hd-card-price-area {
  order: 4 !important;
  margin: 0 !important;
}
.category-screenshot-page .starting {
  margin: 0 0 2px !important;
  color: #222 !important;
  font-size: 13px !important;
  line-height: 1.1 !important;
  font-weight: 400 !important;
  text-transform: none !important;
}
.category-screenshot-page .hd-card-price-row {
  min-height: 30px !important;
  display: flex !important;
  align-items: flex-end !important;
  gap: 7px !important;
}
.category-screenshot-page .hd-card-price .currency {
  font-size: 13px !important;
  line-height: 1 !important;
  padding-top: 2px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-price .dollars {
  font-size: 24px !important;
  line-height: .94 !important;
  font-weight: 700 !important;
  letter-spacing: -.45px !important;
}
.category-screenshot-page .hd-card-price .cents {
  font-size: 11px !important;
  line-height: 1 !important;
  padding-top: 1px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-stock-price-range {
  display: flex !important;
  align-items: flex-start !important;
  flex-wrap: nowrap !important;
  gap: 3px !important;
  white-space: nowrap !important;
}
.category-screenshot-page .hd-card-savings {
  display: grid !important;
  align-self: flex-end !important;
  gap: 0 !important;
  padding-bottom: 1px !important;
  color: #666 !important;
  font-size: 10px !important;
  line-height: 1.15 !important;
  font-weight: 500 !important;
}
.category-screenshot-page .hd-card-savings span:last-child {
  color: #008a2e !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-savings {
  display: none !important;
}
.category-screenshot-page .hd-card-promo {
  margin-top: 12px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  align-self: flex-start !important;
  padding: 6px 10px !important;
  border-radius: 3px !important;
  background: #9fe6c4 !important;
  color: #111 !important;
  font-size: 12px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-promo {
  display: none !important;
}
.category-screenshot-page .hd-custom-card .hd-card-fulfillment {
  display: none !important;
}
.category-screenshot-page .hd-stock-card .hd-card-fulfillment {
  order: 5 !important;
  margin-top: 42px !important;
  display: grid !important;
  gap: 8px !important;
  color: #111 !important;
  font-size: 12.5px !important;
  line-height: 1.25 !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-actions,
.category-screenshot-page .hd-stock-card .hd-card-actions,
.category-screenshot-page .hd-custom-card .hd-card-actions {
  order: 6 !important;
  margin-top: auto !important;
  padding-top: 16px !important;
}
.category-screenshot-page .hd-card-build,
.category-screenshot-page .hd-stock-card .hd-card-build,
.category-screenshot-page .hd-custom-card .hd-card-build {
  width: 100% !important;
  height: 42px !important;
  border: 1px solid #f96302 !important;
  border-radius: 6px !important;
  background: #fff !important;
  color: #f96302 !important;
  font-size: 14px !important;
  line-height: 1 !important;
  font-weight: 700 !important;
}
@media (max-width: 900px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: 660px !important;
  }
  .category-screenshot-page .hd-stock-card .hd-card-option-zone,
  .category-screenshot-page .hd-custom-card .hd-card-option-zone {
    min-height: 58px !important;
  }
  .category-screenshot-page .hd-stock-card .hd-card-fulfillment {
    margin-top: 22px !important;
  }
}
@media (max-width: 560px) {
  .category-screenshot-page .product-card.hd-category-card {
    min-height: auto !important;
  }
  .category-screenshot-page .hd-stock-card .hd-card-option-zone,
  .category-screenshot-page .hd-custom-card .hd-card-option-zone {
    min-height: 34px !important;
  }
}


/* PLP card precision tuning against stock/custom reference layout */
.category-screenshot-page .hd-card-image-wrap {
  margin-left: 14px !important;
  margin-right: 14px !important;
}
.category-screenshot-page .hd-stock-card .hd-card-option-zone {
  min-height: 116px !important;
  margin-bottom: 12px !important;
}
.category-screenshot-page .hd-custom-card .hd-card-option-zone {
  min-height: 98px !important;
  margin-bottom: 0 !important;
}
.category-screenshot-page .hd-stock-card .hd-stock-install-note {
  margin-bottom: 0 !important;
}
.category-screenshot-page .hd-stock-card .hd-card-fulfillment {
  margin-top: 40px !important;
}
.category-screenshot-page .hd-custom-card .hd-card-promo {
  margin-top: 13px !important;
}
.category-screenshot-page .hd-card-build,
.category-screenshot-page .hd-stock-card .hd-card-build,
.category-screenshot-page .hd-custom-card .hd-card-build {
  margin-bottom: 3px !important;
}
@media (max-width: 900px) {
  .category-screenshot-page .hd-stock-card .hd-card-option-zone {
    min-height: 92px !important;
    margin-bottom: 8px !important;
  }
  .category-screenshot-page .hd-custom-card .hd-card-option-zone {
    min-height: 72px !important;
  }
}
@media (max-width: 560px) {
  .category-screenshot-page .hd-stock-card .hd-card-option-zone,
  .category-screenshot-page .hd-custom-card .hd-card-option-zone {
    min-height: 34px !important;
    margin-bottom: 0 !important;
  }
}


/* PLP typography tuning: closer to Home Depot's lighter card type */
.category-screenshot-page .hd-best-badge,
.category-screenshot-page .hd-card-topline .hd-best-badge {
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}
.category-screenshot-page .product-title,
.category-screenshot-page .hd-stock-card .product-title,
.category-screenshot-page .hd-custom-card .product-title {
  font-size: 13px !important;
  line-height: 1.28 !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
}
.category-screenshot-page .product-title b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-rating-line .rating {
  font-size: 12px !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-rating-line .rating span:last-child {
  font-weight: 400 !important;
}
.category-screenshot-page .model {
  font-size: 11px !important;
  font-weight: 400 !important;
  color: #666 !important;
}
.category-screenshot-page .starting {
  font-size: 13px !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-price .currency {
  font-size: 13px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-price .dollars {
  font-size: 24px !important;
  font-weight: 700 !important;
  letter-spacing: -.35px !important;
}
.category-screenshot-page .hd-card-price .cents {
  font-size: 11px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-savings {
  font-size: 10px !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-savings span:last-child {
  font-weight: 500 !important;
}
.category-screenshot-page .hd-card-promo {
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}
.category-screenshot-page .hd-stock-install-note,
.category-screenshot-page .hd-stock-more-swatches {
  font-size: 12px !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-fulfillment,
.category-screenshot-page .hd-stock-card .hd-card-fulfillment {
  font-size: 12.5px !important;
  font-weight: 400 !important;
}
.category-screenshot-page .hd-card-fulfillment b {
  font-weight: 700 !important;
}
.category-screenshot-page .hd-card-fulfillment span {
  font-weight: 500 !important;
}
.category-screenshot-page .hd-card-build,
.category-screenshot-page .hd-stock-card .hd-card-build,
.category-screenshot-page .hd-custom-card .hd-card-build {
  font-size: 14px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}


/* Category landing page */
.hd-category-landing-shell {
  --cat-page-width: 1400px;
  --cat-page-padding: 12px 0 72px;
  --cat-breadcrumb-height: 28px;

  --sponsored-height: 150px;
  --sponsored-arrow-width: 45px;
  --sponsored-logo-width: 330px;
  --sponsored-message-width: 330px;
  --sponsored-shop-width: minmax(0, 1fr);
  --sponsored-image-width: calc(var(--sponsored-height) * 1.5151515);
  --sponsored-grid: var(--sponsored-arrow-width) var(--sponsored-logo-width) var(--sponsored-message-width) var(--sponsored-shop-width) var(--sponsored-image-width);
  --sponsored-brand-padding: var(--sponsored-brand-pad-top) 12px 18px var(--sponsored-brand-pad-left);
  --sponsored-brand-pad-top: 30px;
  --sponsored-brand-pad-left: 48px;
  --sponsored-label-size: 12px;
  --sponsored-logo-size: 83px;
  --sponsored-logo-mark-size: 50px;
  --sponsored-logo-gap: 10px;
  --sponsored-headline-size: 25px;
  --sponsored-headline-offset-x: 0px;
  --sponsored-headline-offset-y: 0px;
  --sponsored-shop-size: 18px;
  --sponsored-shop-margin-left: 145px;
  --sponsored-shop-offset-y: 0px;
  --sponsored-shop-scale: 1;
  --sponsored-shop-padding: 0 26px 10px;

  --cat-left-rail-width: 195px;
  --cat-main-gap: 35px;
  --cat-title-margin: 21px 0 28px;
  --cat-title-size: 42px;
  --cat-nav-gap: 20px;
  --cat-nav-section-gap: 20px;
  --cat-nav-heading-size: 16px;
  --cat-nav-link-size: 15px;

  --side-ad-width: 195px;
  --side-ad-strip-height: 30px;
  --side-ad-height: 740px;
  --side-ad-top-margin: 18px;
  --side-ad-image-height: calc(var(--side-ad-width) / .85);
  --side-ad-label-top: 22px;
  --side-ad-logo-size: 45px;
  --side-ad-logo-mark-size: 24px;
  --side-ad-headline-margin: 28px auto 30px;
  --side-ad-headline-width: 150px;
  --side-ad-headline-size: 25px;
  --side-ad-cta-height: 56px;
  --side-ad-cta-size: 15px;

  --cat-main-top-offset: 90px;
  --hero-height: 400px;
  --hero-copy-width: 562px;
  --hero-image-width: minmax(0, 1fr);
  --hero-copy-padding: 124px 30px 36px;
  --hero-kicker-size: 13px;
  --hero-title-size: 33px;
  --hero-body-size: 16px;
  --hero-button-height: 44px;
  --hero-button-padding: 0 26px;
  --hero-button-size: 15px;

  --module-top-gap: 125px;
  --module-heading-bottom-gap: 25px;
  --module-heading-size: 38px;
  --feature-grid-gap: 24px;
  --feature-card-padding: 12px 12px 13px;
  --feature-card-min-height: 390px;
  --feature-image-height: 185px;
  --feature-title-size: 20px;
  --feature-copy-size: 15px;
  --feature-copy-min-height: 85px;
  --feature-button-height: 40px;
  --feature-button-size: 14px;
  --tile-grid-gap: 15px;
  --tile-min-height: 210px;
  --tile-padding: 10px;
  --tile-image-height: 115px;
  --tile-title-size: 15px;

  max-width: var(--cat-page-width);
  margin: 0 auto;
  padding: var(--cat-page-padding);
  background: transparent;
}
.hd-category-landing-page { color: #1f1f1f; }
.hd-category-landing-breadcrumb {
  height: var(--cat-breadcrumb-height);
  border-bottom: 1px solid #d5d5d5;
  margin-bottom: 0;
  align-items: flex-start;
  padding-top: 0;
}
.hd-category-sponsored-banner {
  width: 100%;
  height: var(--sponsored-height);
  display: grid;
  grid-template-columns: var(--sponsored-grid);
  align-items: stretch;
  background: #fff;
  border: 1px solid #d5d5d5;
  overflow: hidden;
}
.hd-sponsored-arrow {
  width: var(--sponsored-arrow-width);
  border: 0;
  background: #f96302;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(180deg);
}
.hd-sponsored-brand-block {
  padding: var(--sponsored-brand-padding);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hd-sponsored-brand-block span {
  font-size: var(--sponsored-label-size);
  font-weight: 700;
  color: #111;
  margin-bottom: 5px;
}
.hd-sponsored-brand-block strong {
  display: flex;
  align-items: center;
  gap: var(--sponsored-logo-gap);
  color: #0b514c;
  font-size: var(--sponsored-logo-size);
  line-height: .78;
  letter-spacing: -4px;
  font-weight: 700;
}
.hd-veneta-mark {
  width: var(--sponsored-logo-mark-size);
  height: var(--sponsored-logo-mark-size);
  border-radius: 50% 50% 50% 0;
  background: #0b514c;
  color: #0b514c !important;
  display: inline-block;
  overflow: hidden;
  transform: rotate(-42deg);
  margin: 0 !important;
}
.hd-sponsored-veneta-brand-block {
  padding-top: 28px;
  padding-left: 52px;
  padding-right: 0;
  padding-bottom: 0;
  justify-content: flex-start;
  align-items: flex-start;
}
.hd-sponsored-veneta-brand-block span {
  margin-bottom: 9px;
  color: #111;
  font-size: 11px;
  font-weight: 700;
}
.hd-veneta-logo-frame {
  width: 250px;
  max-width: calc(var(--sponsored-logo-width) - 34px);
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
}
.hd-veneta-logo {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: left center;
}
.hd-veneta-logo-placeholder {
  width: 100%;
  height: 100%;
  border: 1px dashed #b8b8b8;
  background: #f7f7f7;
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.hd-sponsored-veneta-message {
  height: var(--sponsored-height);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  transform: translate(var(--sponsored-headline-offset-x), var(--sponsored-headline-offset-y));
  line-height: .96;
  white-space: normal;
  text-transform: uppercase;
}
.hd-sponsored-message {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  transform: translate(var(--sponsored-headline-offset-x), var(--sponsored-headline-offset-y));
  font-size: var(--sponsored-headline-size);
  font-weight: 700;
  color: #000;
  letter-spacing: -.55px;
  white-space: nowrap;
}
.hd-sponsored-shop {
  justify-self: start;
  align-self: center;
  margin-left: var(--sponsored-shop-margin-left);
  transform: translateY(var(--sponsored-shop-offset-y)) scale(var(--sponsored-shop-scale));
  transform-origin: center;
  border: 0;
  border-bottom: 1px solid #111;
  background: transparent;
  color: #111;
  font-size: var(--sponsored-shop-size);
  line-height: 1.2;
  padding: var(--sponsored-shop-padding);
}
.hd-sponsored-veneta-message {
  height: var(--sponsored-height);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-width: 0;
  transform: translate(var(--sponsored-headline-offset-x), var(--sponsored-headline-offset-y));
  line-height: .96;
  white-space: normal;
  text-transform: uppercase;
}
.hd-sponsored-image { height: var(--sponsored-height); background: #eee; align-self: stretch; }
.hd-sponsored-image .hd-category-image-placeholder {
  min-height: var(--sponsored-height);
}
.hd-sponsored-veneta-banner .hd-sponsored-image img {
  object-position: center top;
}
.hd-sponsored-image img,
.hd-category-side-ad-image img,
.hd-category-hero-image img,
.hd-category-feature-image img,
.hd-category-small-tile img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.hd-category-landing-layout {
  display: grid;
  grid-template-columns: var(--cat-left-rail-width) minmax(0, 1fr);
  gap: var(--cat-main-gap);
  align-items: start;
}
.hd-category-left-rail { min-width: 0; }
.hd-category-landing-title {
  margin: var(--cat-title-margin);
  color: #111;
  font-size: var(--cat-title-size);
  line-height: .9;
  letter-spacing: .2px;
  font-weight: 700;
  white-space: nowrap;
}
.hd-category-side-nav { padding-top: 0; }
.hd-category-nav-section {
  display: grid;
  gap: var(--cat-nav-gap);
  margin-bottom: var(--cat-nav-section-gap);
}
.hd-category-nav-section h2 {
  margin: 0 0 -1px;
  font-size: var(--cat-nav-heading-size);
  line-height: 1.1;
  color: #111;
  font-weight: 700;
}
.hd-category-nav-section button {
  width: fit-content;
  border: 0;
  background: transparent;
  padding: 0;
  color: #606060;
  font-size: var(--cat-nav-link-size);
  line-height: 1.3;
  text-align: left;
}
.hd-category-nav-section button:hover { color: #111; text-decoration: underline; }
.hd-category-side-ad {
  width: 100%;
  max-width: var(--side-ad-width);
  height: var(--side-ad-height);
  margin-top: var(--side-ad-top-margin);
  border: 1px solid #d4d4d4;
  background: #fff;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  isolation: isolate;
}
.hd-category-side-ad-strip {
  flex: 0 0 var(--side-ad-strip-height);
  height: var(--side-ad-strip-height);
  background: #f96302;
}
.hd-category-side-ad-image {
  width: 100%;
  height: var(--side-ad-image-height);
  background: #eee;
  overflow: hidden;
  position: relative;
  flex: 0 0 var(--side-ad-image-height);
}
.hd-category-side-ad > span {
  margin-top: var(--side-ad-label-top);
  color: #111;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}
.hd-category-side-ad strong {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  margin-top: 24px;
  color: #0b514c;
  font-size: var(--side-ad-logo-size);
  line-height: .78;
  letter-spacing: -2px;
  font-weight: 700;
}
.hd-mini-veneta-mark {
  width: var(--side-ad-logo-mark-size);
  height: var(--side-ad-logo-mark-size);
  border-radius: 50% 50% 50% 0;
  background: #0b514c;
  color: #0b514c !important;
  display: inline-block;
  overflow: hidden;
  transform: rotate(-42deg);
}
.hd-side-logo-frame {
  width: calc(var(--side-ad-width) - 34px);
  height: 58px;
  margin: 24px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hd-side-logo-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}
.hd-category-side-ad h2 {
  margin: auto auto;
  max-width: calc(var(--side-ad-width) - 34px);
  color: #000;
  font-size: var(--side-ad-headline-size);
  line-height: .95;
  font-weight: 700;
  letter-spacing: -.2px;
  text-align: center;
  text-transform: uppercase;
}
.hd-category-side-ad button {
  position: relative;
  margin: 0 16px 18px;
  border: 0;
  background: transparent;
  min-height: var(--side-ad-cta-height);
  color: #111;
  font-size: var(--side-ad-cta-size);
  line-height: 1;
}
.hd-category-side-ad button::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  height: 1px;
  background: #111;
}
.hd-category-landing-main { min-width: 0; padding-top: var(--cat-main-top-offset); position: relative; z-index: 1; }
.hd-category-hero-promo {
  position: relative;
  height: var(--hero-height);
  display: grid;
  grid-template-columns: var(--hero-copy-width) var(--hero-image-width);
  overflow: visible;
  border: 1px solid #cfcfcf;
  background: #fff;
  margin-bottom: 38px;
}
.hd-category-hero-promo::after {
  content: "";
  position: absolute;
  left: 0;
  right: 118px;
  bottom: -22px;
  height: 4px;
  background: #d6d6d6;
}
.hd-category-hero-promo::before {
  content: "";
  position: absolute;
  left: 0;
  bottom: -22px;
  width: 286px;
  height: 5px;
  background: #222;
  z-index: 1;
}
.hd-category-hero-copy { padding: var(--hero-copy-padding); }
.hd-category-hero-copy h2 {
  margin: 0 0 12px;
  color: #333;
  font-size: var(--hero-title-size);
  line-height: 1;
  letter-spacing: -.7px;
  font-weight: 700;
}
.hd-category-hero-kicker {
  margin: 0 0 8px;
  color: #777;
  font-size: var(--hero-kicker-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .35px;
}
.hd-category-hero-copy p:not(.hd-category-hero-kicker) {
  margin: 0 0 16px;
  color: #333;
  font-size: var(--hero-body-size);
  line-height: 1.35;
}
.hd-category-hero-copy button,
.hd-category-feature-card button {
  border: 0;
  border-radius: 4px;
  background: #f96302;
  color: #fff;
  min-height: var(--hero-button-height);
  padding: var(--hero-button-padding);
  font-size: var(--hero-button-size);
  font-weight: 700;
}
.hd-category-hero-image { height: var(--hero-height); min-height: 0; background: #efe7d8; }
.hd-sponsored-image,
.hd-category-hero-image,
.hd-category-feature-image,
.hd-category-small-tile div,
.hd-category-small-tile .hd-category-image-action {
  overflow: hidden;
  position: relative;
}
.hd-category-carousel-control,
.hd-category-small-carousel {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #111;
  font-size: 16px;
}
.hd-category-carousel-control {
  position: absolute;
  right: 0;
  bottom: -33px;
  min-width: 96px;
  justify-content: flex-end;
}
.hd-category-carousel-control .hd-category-prev,
.hd-category-small-carousel .hd-category-prev { opacity: .25; transform: rotate(180deg); }
.hd-category-module { margin-top: var(--module-top-gap); }
.hd-category-module-heading-row h2 {
  margin: 0 0 var(--module-heading-bottom-gap);
  color: #333;
  font-size: var(--module-heading-size);
  line-height: 1;
  font-weight: 700;
  letter-spacing: -.2px;
}
.hd-category-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--feature-grid-gap);
}
.hd-category-feature-card {
  border: 1px solid #d5d5d5;
  background: #fff;
  padding: var(--feature-card-padding);
  min-height: var(--feature-card-min-height);
}
.hd-category-feature-image { height: var(--feature-image-height); background: #eee; margin-bottom: 14px; }
.hd-category-feature-card h3 {
  margin: 0 0 7px;
  color: #333;
  font-size: var(--feature-title-size);
  line-height: 1.08;
  font-weight: 700;
}
.hd-category-feature-card p {
  margin: 0 0 13px;
  color: #444;
  font-size: var(--feature-copy-size);
  line-height: 1.35;
  min-height: var(--feature-copy-min-height);
}
.hd-category-feature-card button {
  width: 100%;
  min-height: var(--feature-button-height);
  border: 1px solid #f96302;
  background: #fff;
  color: #f96302;
  font-size: var(--feature-button-size);
}
.hd-category-image-action {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.hd-category-feature-card .hd-category-image-action {
  min-height: 0;
  border: 0;
  color: inherit;
}
.hd-category-image-action:hover img,
.hd-category-image-action:focus-visible img {
  transform: scale(1.035);
}
.hd-category-image-action img {
  transition: transform .18s ease;
}
.hd-category-small-carousel { float: right; margin-top: 8px; }
.hd-category-strip-grid {
  clear: both;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--tile-grid-gap);
}
.hd-category-small-tile {
  border: 1px solid #d5d5d5;
  background: #fff;
  min-height: var(--tile-min-height);
  padding: var(--tile-padding);
}
.hd-category-small-tile div,
.hd-category-small-tile .hd-category-image-action { height: var(--tile-image-height); background: #eee; margin-bottom: 9px; }
.hd-category-small-tile h3 {
  margin: 0;
  color: #333;
  font-size: var(--tile-title-size);
  line-height: 1.15;
  font-weight: 700;
}
.hd-category-image-placeholder {
  width: 100%;
  height: 100%;
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f1f1;
  color: #777;
  font-size: 12px;
  font-weight: 700;
}
@media (max-width: 980px) {
  .hd-category-landing-shell { padding: 10px 14px 44px; }
  .hd-category-sponsored-banner { grid-template-columns: 36px 190px 1fr; }
  .hd-sponsored-shop, .hd-sponsored-image { display: none; }
  .hd-sponsored-message { justify-content: flex-start; font-size: 18px; }
  .hd-category-landing-layout { grid-template-columns: 1fr; }
  .hd-category-landing-main { padding-top: 0; }
  .hd-category-side-nav { display: flex; gap: 22px; overflow-x: auto; padding-bottom: 6px; }
  .hd-category-nav-section { min-width: 140px; }
  .hd-category-side-ad { display: none; }
  .hd-category-feature-grid { grid-template-columns: 1fr; }
  .hd-category-strip-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 680px) {
  .hd-category-sponsored-banner { grid-template-columns: 36px 1fr; }
  .hd-sponsored-message { display: none; }
  .hd-category-landing-title { font-size: 30px; }
  .hd-category-hero-promo { height: auto; grid-template-columns: 1fr; }
  .hd-category-hero-copy { padding: 24px 18px; }
  .hd-category-hero-image { height: 230px; }
  .hd-category-strip-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Category page editor */
.category-editor-panel {
  width: min(1040px, calc(100vw - 28px)) !important;
  max-height: calc(100vh - 28px);
  background: #f5f5f7 !important;
}
.category-editor-workspace {
  padding: 24px 32px 38px;
}
.category-editor-controls {
  display: grid;
  gap: 18px;
  width: min(920px, 100%);
  margin: 0 auto;
}
.category-editor-card {
  display: block !important;
  padding: 0 !important;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.08) !important;
  border-radius: 22px !important;
  background: rgba(255,255,255,.94) !important;
  box-shadow: 0 18px 45px rgba(0,0,0,.06) !important;
}
.category-editor-section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  padding: 20px 22px 17px;
  background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
  border-bottom: 1px solid #ececec;
}
.category-editor-section-head span {
  color: #f96302;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .72px;
  text-transform: uppercase;
}
.category-editor-section-head strong {
  color: #111;
  font-size: 23px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -.35px;
}
.category-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 22px;
}
.category-editor-field,
.category-editor-image-field label {
  display: grid;
  gap: 7px;
}
.category-editor-field span,
.category-editor-image-field label span {
  color: #444;
  font-size: 12px;
  font-weight: 700;
}
.category-editor-field input,
.category-editor-field textarea,
.category-editor-image-field input {
  width: 100%;
  border: 1px solid #d7d7d7;
  border-radius: 12px;
  background: #fff;
  color: #222;
  padding: 11px 12px;
  font-size: 13px;
  line-height: 1.35;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.category-editor-field input[readonly] {
  background: #f7f7f7;
  color: #666;
  cursor: default;
}
.category-editor-field input:focus,
.category-editor-field textarea:focus,
.category-editor-image-field input:focus {
  border-color: #f96302;
  box-shadow: 0 0 0 3px rgba(249, 99, 2, .14);
}
.category-editor-image-field {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
  border: 1px solid #ececec;
  border-radius: 16px;
  background: #fbfbfb;
  padding: 14px;
}
.category-editor-image-row {
  display: grid;
  grid-template-columns: 156px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}
.category-editor-image-preview {
  height: 98px;
  border: 1px solid #dcdcdc;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
.category-editor-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}
.category-editor-image-field small {
  color: #777;
  font-size: 11px;
  line-height: 1.35;
}
.category-editor-image-field .editor-upload-pill-button {
  width: fit-content;
  min-height: 36px;
  justify-self: start;
}
@media (max-width: 760px) {
  .category-editor-panel {
    width: 100% !important;
    max-height: 100vh;
  }
  .category-editor-workspace {
    padding: 16px !important;
  }
  .category-editor-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .category-editor-section-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .category-editor-image-row {
    grid-template-columns: 1fr;
  }
  .category-editor-image-preview {
    height: 130px;
  }
}



/* Banner presets section (matches editor card / category-editor language) */
.banner-preset-grid {
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: end;
}
.banner-preset-name-field { grid-column: 1 / 2; }
.banner-preset-toolbar-actions {
  grid-column: 2 / 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: end;
  padding-bottom: 2px;
}
.banner-preset-helper {
  display: block;
  margin-top: 6px;
  color: #6e6e73;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -.01em;
}
.banner-preset-list-wrap {
  grid-column: 1 / -1;
  margin-top: 4px;
}
.banner-preset-empty {
  padding: 22px;
  text-align: center;
  color: #6e6e73;
  background: #fafafa;
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 14px;
  font-size: 13px;
}
.banner-preset-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.banner-preset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 14px;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.banner-preset-row:hover {
  border-color: rgba(0,0,0,.14);
  box-shadow: 0 6px 18px rgba(0,0,0,.05);
}
.banner-preset-meta { min-width: 0; }
.banner-preset-name {
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.banner-preset-time {
  margin-top: 2px;
  color: #86868b;
  font-size: 11.5px;
  font-weight: 500;
}
.banner-preset-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.banner-preset-actions .secondary-action,
.banner-preset-actions .save-action,
.banner-preset-toolbar-actions .secondary-action,
.banner-preset-toolbar-actions .save-action {
  min-height: 32px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  border-radius: 999px !important;
}
.banner-preset-delete { color: #b42318 !important; }
.banner-preset-delete:hover { background: #fdecec !important; border-color: rgba(180,35,24,.25) !important; }
@media (max-width: 720px) {
  .banner-preset-grid { grid-template-columns: 1fr !important; }
  .banner-preset-toolbar-actions { grid-column: 1 / -1; flex-wrap: wrap; padding-bottom: 0; }
  .banner-preset-row { grid-template-columns: 1fr; align-items: flex-start; }
  .banner-preset-actions { flex-wrap: wrap; }
}

/* Configurator color selection (tile grid like homedepot.com) */
.hdc-color-group-title { font-size: 17px; font-weight: 400; color: #333; margin: 6px 0 18px; }
.hdc-color-swatches { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.hdc-color-swatch { display: flex; flex-direction: column; padding: 0; background: #fff; border: 1px solid #d0d0d0; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,.15); cursor: pointer; font: inherit; overflow: hidden; text-align: center; }
.hdc-color-swatch:hover { border-color: #999; }
.hdc-color-swatch:focus-visible { outline: 2px solid #f96302; outline-offset: 2px; }
.hdc-color-swatch.active { border: 2px solid #f96302; }
.hdc-color-chip { position: relative; display: block; width: 100%; height: auto; aspect-ratio: 1 / 1; overflow: hidden; }
.hdc-color-chip::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(180deg, rgba(255,255,255,.10) 0 1px, rgba(0,0,0,.06) 1px 2px, transparent 2px 4px); pointer-events: none; }
.hdc-color-chip img { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: cover; display: block; }
.hdc-color-name { display: flex; flex-direction: column; justify-content: center; min-height: 36px; padding: 5px 6px 6px; font-size: 11px; font-weight: 700; line-height: 1.3; color: #555; }
.hdc-color-name em { font-style: normal; color: #f96302; }
.config-inline-check { display: flex !important; flex-direction: row !important; align-items: center; gap: 6px; }
.config-paint-fieldset { display: grid; gap: 6px; margin: 8px 0 0; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; }
.config-paint-fieldset legend { display: flex; align-items: center; gap: 6px; padding: 0 4px; font-size: 12px; font-weight: 700; }
.config-paint-dot { display: inline-block; width: 14px; height: 14px; border: 1px solid rgba(0,0,0,.2); border-radius: 50%; }
/* Enhanced Product Preview (single source of truth) */
.hdc-preview-title { margin: 12px 0 7px; color: #666; font-size: 14px; }
.hdc-preview-title span { display: inline-block; margin-right: 6px; padding: 2px 6px; border-radius: 3px; background: #f96302; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; vertical-align: 1px; }
.hdc-preview-frame { position: relative; }
.hdc-preview-stage { position: relative; display: flex; align-items: center; justify-content: center; height: 470px; background: #d8d8d8; overflow: hidden; }
.hdc-preview-stage.has-wall-paint { background: var(--hdc-wall-paint); }
.hdc-preview-stage.is-large { height: min(72vh, 680px); }
.hdc-zoom { position: absolute; top: 10px; right: 10px; z-index: 3; height: 32px; padding: 0 12px; border: 2px solid #f96302; border-radius: 4px; background: #fff; color: #f96302; font-size: 12px; font-weight: 700; cursor: pointer; }
.hdc-zoom:hover { background: #fff4ec; }
.hdc-outdoor-view { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr; }
.hdc-outdoor-view i { border-right: 4px solid #c6c6c6; background: radial-gradient(ellipse at 50% 92%, #9cc78d 0 22%, transparent 23%), linear-gradient(180deg, #eaf4ff 0%, #f8fbff 55%, #dcebd9 100%); }
.hdc-outdoor-view i:last-child { border-right: 0; }
.hdc-window-assembly { position: relative; flex: 0 0 auto; cursor: ns-resize; touch-action: none; user-select: none; transition: width .2s ease, height .2s ease; }
.hdc-window-assembly:focus-visible { outline: 3px solid rgba(249,99,2,.5); outline-offset: 14px; }
.hdc-window-large { position: absolute; inset: 0; border: 8px solid #c6c6c6; background: #fff; box-shadow: 0 3px 10px rgba(0,0,0,.22); overflow: hidden; }
.hdc-shade-zone { position: absolute; z-index: 1; }
.hdc-shade-zone.is-inside { top: 8px; bottom: 8px; left: calc(8px + 2%); right: calc(8px + 2%); }
.hdc-shade-zone.is-outside { top: -18px; bottom: 0; left: -14px; right: -14px; }
.hdc-shade-large { position: absolute; left: 0; right: 0; z-index: 1; transition: height .12s ease-out; }
.hdc-shade-large.is-cellular { top: 10px; display: flex; flex-direction: column; justify-content: flex-end; background: var(--hdc-fabric); border-bottom: 5px solid rgba(0,0,0,.28); }
.hdc-shade-large.is-cellular span { flex: 0 0 auto; height: 14px; background: linear-gradient(180deg, rgba(255,255,255,.45), rgba(0,0,0,.18) 60%, rgba(255,255,255,.25)), var(--hdc-fabric); border-bottom: 1px solid rgba(0,0,0,.16); }
.hdc-headrail { position: absolute; top: 0; left: 0; right: 0; z-index: 2; height: 12px; border-radius: 2px; background: linear-gradient(180deg, #fafafa, #c9c9c9); box-shadow: 0 2px 3px rgba(0,0,0,.25); }
.hdc-roller-tube { position: absolute; top: 0; left: 0; right: 0; z-index: 2; height: 16px; border-radius: 8px; background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(0,0,0,.25)), var(--hdc-fabric); box-shadow: 0 2px 3px rgba(0,0,0,.25); }
.hdc-roller-tube.is-reverse { box-shadow: 0 2px 3px rgba(0,0,0,.25), inset 0 -3px 0 rgba(0,0,0,.18); }
.hdc-shade-large.is-roller { top: 8px; left: 3%; right: 3%; background: linear-gradient(90deg, rgba(0,0,0,.06), rgba(255,255,255,.08) 50%, rgba(0,0,0,.06)), var(--hdc-fabric); box-shadow: 0 1px 4px rgba(0,0,0,.18); }
.hdc-shade-large.is-roller.is-reverse { left: 1%; right: 1%; z-index: 3; }
.hdc-hem-bar { position: absolute; left: -2px; right: -2px; bottom: -6px; height: 8px; border-radius: 2px; background: linear-gradient(180deg, #e6e6e6, #9a9a9a); box-shadow: 0 1px 2px rgba(0,0,0,.3); }
.hdc-pull-handle { position: absolute; left: 50%; bottom: -7px; width: 34px; height: 7px; transform: translateX(-50%); border-radius: 0 0 6px 6px; background: #8d8d8d; box-shadow: 0 1px 2px rgba(0,0,0,.35); }
.hdc-pull-handle.is-cellular { bottom: -12px; }
.hdc-top-treatment { position: absolute; top: -4px; left: -3px; right: -3px; z-index: 5; height: 26px; box-shadow: 0 3px 5px rgba(0,0,0,.25); }
.hdc-top-treatment.is-curved { border-radius: 4px 4px 14px 14px; background: linear-gradient(180deg, rgba(255,255,255,.35), rgba(0,0,0,.2)), var(--hdc-fabric); border-left: 5px solid #bdbdbd; border-right: 5px solid #bdbdbd; }
.hdc-top-treatment.is-square { border-radius: 2px; background: linear-gradient(180deg, #f4f4f4, #b9bcbf 55%, #d9dbdd); }
.hdc-top-treatment.is-valance { height: 30px; border-radius: 2px; background: repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 2px, transparent 2px 6px), linear-gradient(180deg, rgba(255,255,255,.25), rgba(0,0,0,.15)), var(--hdc-fabric); }
.hdc-light-guard { position: absolute; top: 0; bottom: 0; z-index: 4; width: 5px; background: linear-gradient(90deg, #9da1a5, #e3e5e7, #9da1a5); }
.hdc-light-guard.is-left { left: 0; }
.hdc-light-guard.is-right { right: 0; }
.hdc-chain { position: absolute; top: 12px; z-index: 6; width: 9px; height: 62%; border-radius: 0 0 5px 5px; border: 2px dotted #f2f2f2; border-top: 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,.45)); }
.hdc-chain.is-steel { border-color: #9ea4aa; }
.hdc-chain.is-right { right: 6px; }
.hdc-chain.is-left { left: 6px; }
.hdc-wand { position: absolute; top: 12px; z-index: 6; width: 4px; height: 45%; border-radius: 2px; background: linear-gradient(90deg, #d8d8d8, #ffffff, #bdbdbd); box-shadow: 0 1px 2px rgba(0,0,0,.4); }
.hdc-wand.is-right { right: 10px; }
.hdc-wand.is-left { left: 10px; }
.hdc-motor-badge { position: absolute; top: -40px; z-index: 6; padding: 2px 8px; border-radius: 10px; background: #333; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .02em; }
.hdc-motor-badge.is-right { right: -14px; }
.hdc-motor-badge.is-left { left: -14px; }
.hdc-drag-text { position: absolute; left: 50%; bottom: 10px; z-index: 7; transform: translateX(-50%); padding: 3px 10px; border-radius: 12px; background: rgba(0,0,0,.45); color: #fff; font-size: 12px; font-weight: 700; white-space: nowrap; pointer-events: none; }
.hdc-size-tag { position: absolute; left: 10px; bottom: 10px; padding: 2px 8px; border-radius: 3px; background: rgba(255,255,255,.85); color: #333; font-size: 11px; font-weight: 700; }
.hdc-preview-note { margin: 8px 0 10px; color: #666; font-size: 11px; line-height: 1.35; }
.hdc-show-preview { display: none; width: 100%; height: 40px; border: 1px solid #f96302; border-radius: 4px; background: #fff; color: #f96302; font-weight: 700; cursor: pointer; }
.hdc-phone { display: none; }
.hdc-zoom-backdrop { position: fixed; inset: 0; z-index: 10000; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; display: grid; place-items: center; padding: 20px; background: rgba(0,0,0,.6); }
.hdc-zoom-panel { width: min(760px, 100%); padding: 14px 16px 6px; border-radius: 6px; background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,.35); }
.hdc-zoom-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #333; font-size: 15px; }
.hdc-zoom-close { width: 34px; height: 34px; border: 1px solid #ccc; border-radius: 50%; background: #fff; color: #333; font-size: 22px; line-height: 1; cursor: pointer; }
.hdc-zoom-close:hover { border-color: #f96302; color: #f96302; }
@media (max-width: 1180px) { .hdc-preview-stage { height: 430px; } }
@media (max-width: 700px) {
  .hdc-preview-stage { height: 380px; }
  .hdc-show-preview { display: block; }
}
@media (max-width: 520px) {
  .hdc-preview-stage { height: 330px; }
}
.hdc-paint-pairing { display: grid; gap: 18px; margin-bottom: 18px; }
.hdc-step-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-right: 8px; border-radius: 50%; background: #f96302; color: #fff; font-size: 12px; font-weight: 700; vertical-align: 1px; }
.hdc-paint-subtitle { margin: 0 0 10px; font-size: 13px; color: #555; }
.hdc-paint-chips { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.hdc-paint-chip { display: flex; flex-direction: column; padding: 0; background: #fff; border: 1px solid #d0d0d0; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,.15); cursor: pointer; font: inherit; text-align: center; overflow: hidden; }
.hdc-paint-chip:hover { border-color: #999; }
.hdc-paint-chip:focus-visible { outline: 2px solid #f96302; outline-offset: 2px; }
.hdc-paint-chip.active { border: 2px solid #f96302; }
.hdc-paint-chip-color { display: block; width: 100%; aspect-ratio: 1 / 1; border-bottom: 1px solid rgba(0,0,0,.08); }
.hdc-paint-chip-label { display: flex; flex-direction: column; justify-content: center; min-height: 36px; padding: 5px 6px 6px; line-height: 1.3; }
.hdc-paint-chip-name { font-size: 11px; font-weight: 700; color: #555; }
.hdc-paint-chip-code { font-size: 10px; color: #777; }
.hdc-color-role { position: absolute; z-index: 2; left: 4px; top: 4px; padding: 2px 5px; border-radius: 2px; background: rgba(255,255,255,.92); color: #333; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
.hdc-color-role.is-accent { background: #333; color: #fff; }
.hdc-color-description { margin: 10px 0 0; font-size: 13px; color: #555; }
@media (max-width: 900px) { .hdc-color-swatches, .hdc-paint-chips { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 560px) { .hdc-color-swatches, .hdc-paint-chips { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.config-swatch-color-field { display: flex; gap: 6px; align-items: center; }
.config-swatch-color-field input[type="color"] { width: 38px; min-width: 38px; height: 34px; padding: 2px; }


/* ==========================================================================
   Card alignment + typography system (final override)
   Cards use CSS subgrid so every row lines up: image, swatches, title,
   rating, model, price, delivery, and button sit on shared row lines.
   ========================================================================== */
.category-screenshot-page .product-grid.hd-category-grid {
  column-gap: 8px !important;
  row-gap: 0 !important;
  align-items: stretch !important;
}
.category-screenshot-page .product-grid.hd-category-grid > .product-card.hd-category-card {
  min-height: 0 !important;
  height: auto !important;
  margin: 0 0 8px !important;
  overflow: visible !important;
  grid-row: span 9 !important;
}
.category-screenshot-page .product-grid.hd-category-grid > .product-card.hd-category-card:not(.is-placeholder-product):not(.layout-edit-card) {
  display: grid !important;
  grid-template-rows: subgrid !important;
  row-gap: 0 !important;
}
.category-screenshot-page .product-grid.hd-category-grid > .product-card.hd-category-card:not(.is-placeholder-product):not(.layout-edit-card) .hd-card-info {
  display: contents !important;
}
.category-screenshot-page .product-grid.hd-category-grid > .product-card.hd-category-card:not(.is-placeholder-product):not(.layout-edit-card) > * ,
.category-screenshot-page .product-grid.hd-category-grid > .product-card.hd-category-card:not(.is-placeholder-product):not(.layout-edit-card) .hd-card-info > * {
  order: 0 !important;
  min-width: 0 !important;
}
/* Row map */
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-topline { grid-row: 1 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-image-wrap { grid-row: 2 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-option-zone { grid-row: 3 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .product-title { grid-row: 4 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-rating-line { grid-row: 5 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .model { grid-row: 6 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-price-area { grid-row: 7 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-fulfillment { grid-row: 8 !important; }
.category-screenshot-page .hd-category-grid .hd-category-card .hd-card-actions { grid-row: 9 !important; }

/* Sections: tight, consistent spacing (no fixed tall gaps) */
.category-screenshot-page .hd-category-grid .hd-card-topline {
  height: 40px !important;
  min-height: 40px !important;
  padding: 12px 16px 0 !important;
}
.category-screenshot-page .hd-category-grid .hd-card-image-wrap {
  margin: 0 16px !important;
}
.category-screenshot-page .hd-category-grid .hd-card-option-zone,
.category-screenshot-page .hd-category-grid .hd-stock-card .hd-card-option-zone,
.category-screenshot-page .hd-category-grid .hd-custom-card .hd-card-option-zone {
  min-height: 0 !important;
  height: auto !important;
  margin: 0 !important;
  padding: 12px 16px 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  gap: 4px !important;
}
.category-screenshot-page .hd-category-grid .hd-custom-card .hd-card-option-zone:empty {
  padding-top: 12px !important;
}
.category-screenshot-page .hd-category-grid .hd-stock-swatch-line {
  min-height: 24px !important;
  margin: 0 !important;
}
.category-screenshot-page .hd-category-grid .hd-stock-install-note,
.category-screenshot-page .hd-category-grid .hd-stock-card .hd-stock-install-note {
  margin: 0 !important;
  color: #333 !important;
  font-size: 12px !important;
  line-height: 1.3 !important;
}
.category-screenshot-page .hd-category-grid .product-title,
.category-screenshot-page .hd-category-grid .hd-stock-card .product-title,
.category-screenshot-page .hd-category-grid .hd-custom-card .product-title {
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 8px 16px 0 !important;
  -webkit-line-clamp: 3 !important;
  font-size: 14px !important;
  line-height: 1.35 !important;
  color: #333 !important;
}
.category-screenshot-page .hd-category-grid .product-title b {
  font-weight: 700 !important;
  color: #111 !important;
}
.category-screenshot-page .hd-category-grid .hd-card-rating-line {
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 6px 16px 0 !important;
}
.category-screenshot-page .hd-category-grid .model {
  margin: 0 !important;
  padding: 4px 16px 0 !important;
  color: #666 !important;
  font-size: 12px !important;
  font-weight: 400 !important;
  line-height: 1.3 !important;
}
.category-screenshot-page .hd-category-grid .hd-card-price-area,
.category-screenshot-page .hd-category-grid .hd-stock-card .hd-card-price-area,
.category-screenshot-page .hd-category-grid .hd-custom-card .hd-card-price-area {
  margin: 0 !important;
  padding: 12px 16px 0 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
}
.category-screenshot-page .hd-category-grid .starting {
  color: #333 !important;
  font-size: 13px !important;
}
.category-screenshot-page .hd-category-grid .hd-card-promo,
.category-screenshot-page .hd-category-grid .hd-custom-card .hd-card-promo {
  margin-top: 10px !important;
}
.category-screenshot-page .hd-category-grid .hd-card-fulfillment,
.category-screenshot-page .hd-category-grid .hd-stock-card .hd-card-fulfillment {
  margin: 0 !important;
  padding: 12px 16px 0 !important;
  align-content: start !important;
  gap: 6px !important;
}
.category-screenshot-page .hd-category-grid .hd-custom-card .hd-card-fulfillment {
  display: none !important;
}
.category-screenshot-page .hd-category-grid .product-image {
  position: relative !important;
}
.category-screenshot-page .hd-category-grid .product-image .missing-image {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}
.category-screenshot-page .hd-category-grid .hd-card-actions,
.category-screenshot-page .hd-category-grid .hd-stock-card .hd-card-actions,
.category-screenshot-page .hd-category-grid .hd-custom-card .hd-card-actions {
  margin: 0 !important;
  padding: 16px 16px 16px !important;
  align-self: end !important;
}

/* Placeholder and rearrange-mode cards keep their simple flex layout */
.category-screenshot-page .hd-category-grid .product-card.is-placeholder-product,
.category-screenshot-page .hd-category-grid .product-card.layout-edit-card {
  display: flex !important;
  flex-direction: column !important;
}
.category-screenshot-page .hd-category-grid .product-card.layout-edit-card .hd-card-info,
.category-screenshot-page .hd-category-grid .product-card.is-placeholder-product .hd-card-info {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 auto !important;
  padding: 0 0 0 !important;
}
.category-screenshot-page .hd-category-grid .product-card.layout-edit-card .hd-card-actions,
.category-screenshot-page .hd-category-grid .product-card.is-placeholder-product .hd-card-actions {
  margin-top: auto !important;
  align-self: stretch !important;
}

/* Typography: closer to Home Depot scale */
.category-screenshot-page .hd-cat-title-block h1 {
  font-size: 32px !important;
  line-height: 1.1 !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  margin: 0 0 6px !important;
}
.category-screenshot-page .hd-cat-title-block p {
  margin: 0 !important;
  color: #666 !important;
  font-size: 14px !important;
  line-height: 1.3 !important;
}
.category-screenshot-page .hd-cat-title-block p b {
  color: #333 !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-all-filters {
  font-size: 14px !important;
  font-weight: 700 !important;
}
.category-screenshot-page .hd-filter-select,
.category-screenshot-page .hd-filter-select span,
.category-screenshot-page .hd-sort-control {
  font-size: 14px !important;
  color: #333 !important;
}
.category-screenshot-page .hd-fast-chip {
  height: 36px !important;
  font-size: 14px !important;
}
.hd-screenshot-header .hd-nav-icon svg {
  width: 22px !important;
  height: 22px !important;
}
.hd-screenshot-header .hd-nav-icon span {
  font-size: 13px !important;
  line-height: 1.2 !important;
  margin-top: 2px !important;
}
.hd-screenshot-header .hd-store-item {
  font-size: 13px !important;
}
.hd-screenshot-header .hd-search-wrap input {
  font-size: 15px !important;
}

/* Shared page frame: same side margins and breadcrumb/back-button position on every page */
.hd-root {
  --hd-page-max: 1320px;
  --hd-page-gutter: 24px;
  --hd-page-width: min(var(--hd-page-max), calc(100% - (var(--hd-page-gutter) * 2)));
  --hd-crumb-top: 12px;
  --hd-crumb-height: 48px;
  --hd-crumb-gap-below: 12px;
}
@media (max-width: 1024px) { .hd-root { --hd-page-gutter: 16px; } }
@media (max-width: 560px) { .hd-root { --hd-page-gutter: 12px; } }

/* Page containers: landing, product grid, product detail */
.hd-root .page.hd-category-landing-shell,
.hd-root .page.category-screenshot-page {
  width: var(--hd-page-width) !important;
  max-width: none !important;
  min-width: 0 !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  padding-top: var(--hd-crumb-top) !important;
}
.hd-root .page:has(> .pdp-screenshot-wrap) {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: var(--hd-crumb-top) 0 40px !important;
}
.hd-root .page > .pdp-screenshot-wrap {
  width: var(--hd-page-width) !important;
  max-width: none !important;
  margin: 0 auto !important;
  padding: 0 !important;
}
@media (min-width: 1201px) {
  .hd-root .pdp-screenshot-grid { grid-template-columns: minmax(0, 760fr) minmax(0, 562fr) !important; }
}

/* Configurator */
.hd-root .hdc-page { padding-top: var(--hd-crumb-top) !important; }
.hd-root .hdc-page .hdc-breadcrumb,
.hd-root .hdc-page .hdc-layout {
  width: var(--hd-page-width) !important;
  max-width: none !important;
}

/* Breadcrumb rows: identical height and offset so back buttons never move */
.hd-root .hd-cat-breadcrumb,
.hd-root .hd-category-landing-breadcrumb,
.hd-root .pdp-screenshot-wrap > .pdp-shot-breadcrumb,
.hd-root .hdc-page .hdc-breadcrumb.pdp-shot-breadcrumb {
  height: var(--hd-crumb-height) !important;
  min-height: var(--hd-crumb-height) !important;
  margin: 0 auto var(--hd-crumb-gap-below) !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  box-sizing: border-box !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: visible !important;
  scrollbar-width: none;
}
@media (max-width: 760px) {
  .hd-root .hd-cat-breadcrumb,
  .hd-root .pdp-screenshot-wrap > .pdp-shot-breadcrumb,
  .hd-root .hdc-page .hdc-breadcrumb.pdp-shot-breadcrumb { overflow-x: auto !important; overflow-y: hidden !important; }
  .hd-root .pdp-shot-back-button { box-shadow: 0 2px 6px rgba(249,99,2,.2) !important; }
}
.hd-root .hd-cat-breadcrumb::-webkit-scrollbar,
.hd-root .pdp-shot-breadcrumb::-webkit-scrollbar { display: none; }
.hd-root .hd-cat-breadcrumb > :first-child,
.hd-root .pdp-shot-breadcrumb > :first-child { margin-left: 0 !important; }
.hd-root .pdp-shot-back-button { flex: 0 0 auto !important; margin: 0 !important; }

/* Configurator: unavailable options */
.hdc-option-card.is-disabled { opacity: .45; cursor: not-allowed; }
.hdc-option-card.is-disabled:hover { border-color: inherit; }

/* Configurator: show add-on prices under the option title, like Home Depot ("Adds $43.01") */
.hd-root .hdc-option-title-row { grid-template-columns: minmax(0, 1fr) !important; gap: 2px !important; }
.hd-root .hdc-option-price { display: block !important; min-width: 0 !important; text-align: left !important; }
.hd-root .hdc-option-price b { color: #333 !important; font-size: 13px !important; font-weight: 700 !important; margin-right: 6px; }
.hd-root .hdc-option-price em { color: #333 !important; font-size: 13px !important; font-style: normal !important; font-weight: 400 !important; }

/* Category titles: Home Depot bold condensed headline */
.hd-category-landing-title,
.hd-cat-title-block h1,
.category-screenshot-page .hd-cat-title-block h1 {
  font-family: "Helvetica Neue Condensed Bold", "HelveticaNeue-CondensedBold", "Roboto Condensed", "Arial Narrow", sans-serif !important;
  font-stretch: condensed !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0 !important;
  color: #222 !important;
}

/* Cleanup pass: grid tools spacing + editor polish */
.hd-cat-title-block.hd-cat-title-grid { margin-bottom: 20px !important; align-items: center !important; height: auto !important; }
.hd-cat-title-grid .hd-grid-tools { position: relative; z-index: 1; display: flex !important; align-items: center; gap: 12px !important; min-width: 0 !important; padding: 8px 10px 8px 14px !important; border-radius: 14px !important; }
.hd-grid-tools-label { white-space: nowrap; }
.hd-grid-tools .hd-hover-chip, .hd-grid-tools .hd-layout-edit-button { height: 34px !important; min-height: 34px !important; border-radius: 999px !important; font-size: 13px !important; }
@media (max-width: 1100px) { .hd-cat-title-grid .hd-grid-tools { justify-self: start !important; width: auto !important; flex-wrap: wrap; } }
@media (max-width: 640px) { .hd-cat-title-grid .hd-grid-tools { width: 100% !important; } .hd-grid-tools-label { width: 100%; } }

.editor-accordion-section { overflow: visible; }
.editor-accordion-section .editor-accordion-heading { border-radius: 18px; }
.config-product-summary .editor-compact-main { min-width: 0; flex: 1; }
.config-editor-product-title strong { text-transform: none !important; letter-spacing: 0 !important; font-size: 18px !important; line-height: 1.25 !important; max-width: none !important; }
.config-product-summary .editor-compact-meta { flex-wrap: wrap; }
.config-product-summary .editor-compact-meta span { overflow: visible !important; text-overflow: clip !important; white-space: nowrap; max-width: none !important; }
.config-product-summary .editor-compact-chips { flex-wrap: wrap; }

.config-section-visibility-actions { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; }
.config-section-visibility-actions button { height: 32px !important; min-width: 84px !important; padding: 0 12px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; border-radius: 999px !important; font-size: 12px !important; font-weight: 700 !important; margin: 0 !important; }
.config-section-visibility-row { min-height: 56px; align-items: center !important; }
.editor-overlay-product .editor-card.apple-editor-card.editor-card-expanded .editor-compact-summary.config-product-summary { grid-template-columns: 88px minmax(0, 1fr) !important; }
.config-product-summary .editor-compact-main { max-width: none !important; width: 100% !important; }
.config-section-visibility-row > .config-hide-section-button { height: 32px !important; min-width: 84px !important; padding: 0 12px !important; border-radius: 999px !important; font-size: 12px !important; font-weight: 700 !important; display: inline-flex !important; align-items: center; justify-content: center; }

/* Keep the stock gallery within narrow phone viewports. */
@media (max-width: 760px) {
  .pdp-stock-grid .pdp-stock-gallery-panel,
  .pdp-stock-grid .pdp-stock-gallery-layout,
  .pdp-stock-grid .pdp-stock-hero-shell,
  .pdp-stock-grid .pdp-stock-hero-stage { min-width: 0 !important; max-width: 100% !important; }
  .pdp-stock-grid .pdp-stock-hero-stage { width: 100% !important; }
  .config-section-visibility-row { flex-wrap: wrap; gap: 10px; }
  .config-section-visibility-actions { flex-wrap: wrap; }
}

`;
