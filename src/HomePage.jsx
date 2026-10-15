import { bannerImageStyle } from "./bannerImage.js";
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Truck, Ruler, PaintBucket, Lamp, Sofa, Blinds, Wrench } from "lucide-react";

// Home page (mockup). Layout follows The Home Depot home page, with content
// focused on window treatments. The two sponsored tiles are editable in the
// Mockup Editor; product cards and window treatment / paint promos navigate.

export const DEFAULT_HOME_PAGE_SETTINGS = {
  sponsoredMain: {
    label: "Sponsored",
    mode: "template",
    fullImageUrl: "",
    imageZoom: 1,
    imagePosX: 50,
    imagePosY: 50,
    brand: "BEHR × VENETA",
    logoUrl: "",
    headline: "PAINT MEETS SHADES",
    subhead: "Pick your BEHR paint color and get VENETA roller shades matched to your walls.",
    ctaText: "Find Your Match",
    ctaUrl: "/window-treatments/product/535414-COPY",
    imageUrl: "",
    productModel: "535414-COPY"
  },
  sponsoredSecond: {
    label: "Sponsored",
    mode: "template",
    fullImageUrl: "",
    imageZoom: 1,
    imagePosX: 50,
    imagePosY: 50,
    brand: "VENETA",
    logoUrl: "/veneta-logo.svg",
    headline: "DARKER ROOMS, BETTER SLEEP",
    subhead: "Designer Room Darkening Roller Shades",
    ctaText: "Shop Now",
    ctaUrl: "/window-treatments/product/535415",
    imageUrl: "",
    productModel: "535415"
  }
};

function mergeTile(defaults, value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof source[key] === typeof fallback ? source[key] : fallback]));
}

export function mergeHomePageSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    sponsoredMain: mergeTile(DEFAULT_HOME_PAGE_SETTINGS.sponsoredMain, source.sponsoredMain),
    sponsoredSecond: mergeTile(DEFAULT_HOME_PAGE_SETTINGS.sponsoredSecond, source.sponsoredSecond)
  };
}

const RECENTLY_VIEWED_MODELS = ["535414-COPY", "535415", "535406", "534305", "706321"];
const DEAL_MODELS = ["503445", "501914", "649309", "505225"];
const DEAL_PCTS = [0.4, 0.3, 0.25, 0.35];
const TOP_SAVINGS_MODELS = ["535414", "535406", "1049097", "534896", "505214", "524531"];
const TOP_SAVINGS_TABS = ["All", "Window Shades", "Blinds", "Cellular Shades", "Shutters", "Paint"];
const SAVINGS_TILES = [
  { label: "Roller Shades", model: "535415", pct: 0.3 },
  { label: "Cellular Shades", model: "706321", pct: 0.25 },
  { label: "Faux Wood Blinds", model: "534305", pct: 0.2 },
  { label: "Shutters", model: "542120", pct: 0.15 }
];

function findByModel(products, model) {
  return products.find((product) => String(product?.model || "").trim() === model);
}

function pickProducts(products, models, count) {
  const picked = models.map((model) => findByModel(products, model)).filter(Boolean);
  const extras = products.filter((product) => !picked.includes(product) && product?.price);
  return [...picked, ...extras].slice(0, count);
}

function toNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Price({ value }) {
  const [dollars, cents = "00"] = money(value).split(".");
  return <span className="hd-home-price"><sup>$</sup>{dollars}<sup>{cents}</sup></span>;
}

function Stars({ rating = 4.6, reviews = 0 }) {
  return (
    <div className="hd-home-rating">
      <span className="hd-home-stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < Math.round(rating) ? "filled" : ""} />)}</span>
      {reviews ? <span>({Number(reviews).toLocaleString()})</span> : null}
    </div>
  );
}

function ProductCard({ product, pct = 0, imgSrc, onOpen }) {
  const price = toNumber(product.price);
  const was = pct ? price / (1 - pct) : toNumber(product.was);
  const savings = was > price ? was - price : 0;
  return (
    <article className="hd-home-card" onClick={() => onOpen?.(product)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onOpen?.(product); }}>
      <div className="hd-home-card-image">{product.imageUrl ? <img src={imgSrc(product.imageUrl)} alt="" /> : <Blinds size={48} strokeWidth={1.2} />}</div>
      <Stars rating={toNumber(product.rating) || 4.6} reviews={toNumber(product.reviews)} />
      <p className="hd-home-card-title"><b>{product.brand} </b>{product.name}</p>
      {price ? <div className="hd-home-card-price"><Price value={price} /></div> : null}
      {savings ? <div className="hd-home-card-save"><s>${money(was)}</s> <span>Save ${money(savings)} ({Math.round((savings / was) * 100)}%)</span></div> : <div className="hd-home-card-save" />}
      <button type="button" className="hd-home-add-cart" onClick={(e) => e.stopPropagation()}>Add to Cart</button>
    </article>
  );
}

function SponsoredTile({ tile, products, imgSrc, onClick, className }) {
  const fallbackProduct = findByModel(products, tile.productModel);
  const image = tile.imageUrl || fallbackProduct?.imageUrl || "";
  if (tile.mode === "image" && String(tile.fullImageUrl || "").trim()) {
    return (
      <button type="button" className={`hd-home-tile hd-home-sponsored-image ${className}`} onClick={() => onClick(tile.ctaUrl)} aria-label={`${tile.brand} sponsored promotion`}>
        <img src={imgSrc(tile.fullImageUrl)} alt="Sponsored promotion" style={bannerImageStyle(tile)} />
      </button>
    );
  }
  return (
    <section className={`hd-home-tile hd-home-sponsored ${className}`} onClick={() => onClick(tile.ctaUrl)} role="link" aria-label={`${tile.brand} sponsored promotion`}>
      <div className="hd-home-sponsored-copy">
        <span className="hd-home-sponsored-label">{tile.label}</span>
        {tile.logoUrl ? <img className="hd-home-sponsored-logo" src={imgSrc(tile.logoUrl)} alt={tile.brand} /> : <strong className="hd-home-sponsored-brand">{tile.brand}</strong>}
        <h2>{tile.headline}</h2>
        {tile.subhead ? <p>{tile.subhead}</p> : null}
        <button type="button" className="hd-home-text-cta" onClick={(e) => { e.stopPropagation(); onClick(tile.ctaUrl); }}>{tile.ctaText}</button>
      </div>
      <div className="hd-home-sponsored-image-wrap">{image ? <img src={imgSrc(image)} alt="" /> : <Blinds size={80} strokeWidth={1} />}</div>
    </section>
  );
}

function PromoTile({ kicker, headline, body, cta = "Shop Now", tone = "orange", icon: Icon, onClick, className = "" }) {
  return (
    <section className={`hd-home-tile hd-home-promo is-${tone} ${onClick ? "is-link" : ""} ${className}`} onClick={onClick} role={onClick ? "link" : undefined}>
      <div className="hd-home-promo-copy">
        <span className="hd-home-promo-kicker">{kicker}</span>
        <h2>{headline}</h2>
        {body ? <p>{body}</p> : null}
        <button type="button" className="hd-home-text-cta">{cta}</button>
      </div>
      {Icon ? <div className="hd-home-promo-icon"><Icon size={72} strokeWidth={1.2} /></div> : null}
    </section>
  );
}

function useCountdown() {
  const compute = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    const mins = Math.max(0, Math.floor((end - now) / 60000));
    return { hrs: Math.floor(mins / 60), mins: mins % 60 };
  };
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    const id = setInterval(() => setLeft(compute()), 30000);
    return () => clearInterval(id);
  }, []);
  return left;
}

export default function HomePage({ products = [], settings, imgSrc = (url) => url, onNavigate, onOpenProduct, onCategoryFilter, onBannerClick }) {
  const page = mergeHomePageSettings(settings);
  const countdown = useCountdown();
  const recentlyViewed = pickProducts(products, RECENTLY_VIEWED_MODELS, 5);
  const deals = pickProducts(products, DEAL_MODELS, 4);
  const topSavings = pickProducts(products, TOP_SAVINGS_MODELS, 6);
  const go = (path) => () => onNavigate?.(path);

  return (
    <div className="hd-home-page">
      <style>{HOME_CSS}</style>

      <div className="hd-home-hero-grid">
        <SponsoredTile tile={page.sponsoredMain} products={products} imgSrc={imgSrc} onClick={onBannerClick} className="is-main" />
        <PromoTile kicker="Blinds & Shades Savings Event" headline="UP TO 40% OFF" body="Select Custom Blinds & Shades" tone="orange" icon={Blinds} onClick={go("/window-treatments/products")} className="is-side" />
        <SponsoredTile tile={page.sponsoredSecond} products={products} imgSrc={imgSrc} onClick={onBannerClick} className="is-third" />
        <PromoTile kicker="Paint Savings" headline="Refresh Every Room" body="Interior paint & primer deals" tone="cream" icon={PaintBucket} onClick={go("/paint")} className="is-third" />
        <PromoTile kicker="Free In-Home Measure" headline="We Measure, You Relax" body="Custom blinds & shades, measured by a pro" tone="slate" icon={Ruler} className="is-third" />
        <section className="hd-home-express">
          <Truck size={26} strokeWidth={1.6} />
          <strong>EXPRESS DELIVERY — 2 HOURS OR LESS</strong>
          <span>Subject to Availability. Order Select In-Stock Items by 4 p.m. Restrictions &amp; Fees Apply.</span>
          <button type="button" className="hd-home-text-cta">Shop Now</button>
        </section>
      </div>

      {recentlyViewed.length ? (
        <section className="hd-home-section">
          <div className="hd-home-heading-row"><h2>Recently Viewed</h2></div>
          <div className="hd-home-card-row is-5">
            {recentlyViewed.map((product) => <ProductCard key={product.id} product={product} imgSrc={imgSrc} onOpen={onOpenProduct} />)}
          </div>
        </section>
      ) : null}

      <section className="hd-home-section hd-home-deals">
        <div className="hd-home-deals-intro">
          <h2>Up to 40% off Select Blinds &amp; Shades</h2>
          <p>Today Only! Fast Free Delivery</p>
          <div className="hd-home-countdown">Ends in <b>{countdown.hrs} hrs {countdown.mins} mins</b></div>
          <div className="hd-home-deal-tabs">
            {["Deals of the Day", "Popular Picks", "Top Rated"].map((tab, index) => <button type="button" key={tab} className={index === 0 ? "active" : ""}>{tab}</button>)}
          </div>
          <button type="button" className="hd-home-outline-button">Shop Daily Deals</button>
        </div>
        <div className="hd-home-card-row is-4">
          {deals.map((product, index) => <ProductCard key={product.id} product={product} pct={DEAL_PCTS[index % DEAL_PCTS.length]} imgSrc={imgSrc} onOpen={onOpenProduct} />)}
        </div>
      </section>

      <section className="hd-home-special-buy is-link" onClick={go("/window-treatments/products")} role="link">
        <div className="hd-home-special-badge"><span>Special Buy</span><strong>of the Week</strong></div>
        <div className="hd-home-special-copy">
          <span>Online Only</span>
          <h2>ONE WEEK ONLY + FAST FREE DELIVERY</h2>
          <p>Up to 35% off select cordless cellular shades</p>
        </div>
        <button type="button" className="hd-home-text-cta">Shop Now</button>
      </section>

      <section className="hd-home-section">
        <div className="hd-home-heading-row"><h2>Top Savings For You</h2></div>
        <div className="hd-home-tabs">
          {TOP_SAVINGS_TABS.map((tab, index) => <button type="button" key={tab} className={index === 0 ? "active" : ""}>{tab}</button>)}
        </div>
        <div className="hd-home-card-row is-6">
          {topSavings.map((product, index) => <ProductCard key={product.id} product={product} pct={index % 3 === 2 ? 0.2 : 0.15} imgSrc={imgSrc} onOpen={onOpenProduct} />)}
        </div>
        <div className="hd-home-carousel-control" aria-hidden="true"><ChevronLeft size={16} /><span>1/3</span><ChevronRight size={16} /></div>
      </section>

      <section className="hd-home-section">
        <div className="hd-home-heading-row"><h2>Window Treatment Savings</h2><button type="button" className="hd-home-link" onClick={go("/window-treatments/products")}>Shop All Savings</button></div>
        <div className="hd-home-savings-grid">
          {SAVINGS_TILES.map((tile) => {
            const product = findByModel(products, tile.model);
            const price = toNumber(product?.price);
            return (
              <article className="hd-home-savings-tile" key={tile.label} onClick={() => onCategoryFilter?.(tile.label)} role="link">
                <div className="hd-home-savings-image">{product?.imageUrl ? <img src={imgSrc(product.imageUrl)} alt="" /> : <Blinds size={64} strokeWidth={1} />}</div>
                {price ? <div className="hd-home-savings-price"><s>Was ${money(price / (1 - tile.pct))}</s><b>${money(price)}</b></div> : null}
                <h3>{tile.label}</h3>
              </article>
            );
          })}
        </div>
      </section>

      <section className="hd-home-section">
        <div className="hd-home-heading-row"><h2>Home Essentials</h2></div>
        <div className="hd-home-essentials">
          <article className="is-link" onClick={go("/window-treatments")} role="link"><div className="hd-home-essential-art is-blue"><Blinds size={70} strokeWidth={1} /></div><h3>Window Treatments</h3></article>
          <article className="is-link" onClick={go("/paint")} role="link"><div className="hd-home-essential-art is-sand"><PaintBucket size={70} strokeWidth={1} /></div><h3>Paint</h3></article>
          <article><div className="hd-home-essential-art is-green"><Sofa size={70} strokeWidth={1} /></div><h3>Home Decor</h3></article>
          <article><div className="hd-home-essential-art is-gray"><Lamp size={70} strokeWidth={1} /></div><h3>Lighting &amp; Fans</h3></article>
        </div>
      </section>

      <section className="hd-home-services">
        <div className="hd-home-services-brand"><Wrench size={28} strokeWidth={1.6} /><strong>THE HOME DEPOT<br />HOME SERVICES</strong><span>REPAIRS | REMODELS | INSTALLS</span></div>
        <div className="hd-home-services-copy"><h2>SCHEDULE YOUR FREE WINDOW TREATMENT MEASURE</h2><p>Experienced Pros, At Your Service</p></div>
        <button type="button" className="hd-home-services-cta">Get Started</button>
      </section>
    </div>
  );
}

const HOME_CSS = `
.hd-home-page { color: #1f1f1f; padding-bottom: 56px; }
.hd-home-page button { font-family: inherit; }
.hd-home-page .is-link, .hd-home-card, .hd-home-savings-tile, .hd-home-sponsored { cursor: pointer; }

/* Hero ad grid */
.hd-home-hero-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-top: 8px; }
.hd-home-tile { position: relative; min-width: 0; overflow: hidden; border: 1px solid #d5d5d5; background: #fff; }
.hd-home-tile.is-main { grid-column: span 4; height: 340px; }
.hd-home-tile.is-side { grid-column: span 2; height: 340px; }
.hd-home-tile.is-third { grid-column: span 2; height: 250px; }
.hd-home-sponsored { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.hd-home-tile.is-third.hd-home-sponsored { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); }
.hd-home-sponsored-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 10px; padding: 24px 28px; min-width: 0; }
.hd-home-tile.is-third .hd-home-sponsored-copy { padding: 18px 18px; gap: 7px; }
.hd-home-sponsored-label { font-size: 12px; color: #555; }
.hd-home-sponsored-brand { font-size: 22px; font-weight: 800; letter-spacing: .5px; color: #111; }
.hd-home-sponsored-logo { max-width: 150px; max-height: 40px; object-fit: contain; }
.hd-home-tile.is-third .hd-home-sponsored-logo { max-width: 110px; max-height: 28px; }
.hd-home-sponsored-copy h2 { margin: 0; font-size: 38px; line-height: 1; font-weight: 800; letter-spacing: -.5px; color: #111; }
.hd-home-tile.is-third .hd-home-sponsored-copy h2 { font-size: 22px; }
.hd-home-sponsored-copy p { margin: 0; font-size: 15px; line-height: 1.35; color: #333; }
.hd-home-tile.is-third .hd-home-sponsored-copy p { font-size: 13px; }
.hd-home-sponsored-image-wrap { display: flex; align-items: center; justify-content: center; background: #f4f1ec; color: #a0a0a0; min-width: 0; overflow: hidden; }
.hd-home-sponsored-image-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hd-home-sponsored-image { padding: 0; overflow: hidden; }
.hd-home-sponsored-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
.hd-home-text-cta { margin-top: 4px; border: 0; border-bottom: 1px solid currentColor; background: transparent; padding: 0 0 2px; font-size: 15px; color: inherit; cursor: pointer; white-space: nowrap; }
.hd-home-sponsored .hd-home-text-cta { color: #111; }

.hd-home-promo { display: flex; align-items: stretch; justify-content: space-between; border: 0; }
.hd-home-promo.is-orange { background: #f96302; color: #fff; }
.hd-home-promo.is-cream { background: #f3ede2; color: #1f1f1f; }
.hd-home-promo.is-slate { background: #3b4a54; color: #fff; }
.hd-home-promo-copy { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px; padding: 22px; min-width: 0; z-index: 1; }
.hd-home-promo-kicker { font-size: 13px; font-weight: 700; }
.hd-home-promo-copy h2 { margin: 0; font-size: 26px; line-height: 1.05; font-weight: 800; }
.hd-home-tile.is-side .hd-home-promo-copy h2 { font-size: 44px; }
.hd-home-promo-copy p { margin: 0; font-size: 14px; line-height: 1.35; }
.hd-home-promo-icon { position: absolute; right: 14px; bottom: 12px; opacity: .25; }
.hd-home-express { grid-column: span 6; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; align-items: center; gap: 16px; padding: 14px 22px; background: #fff; border: 1px solid #d5d5d5; color: #f96302; }
.hd-home-express strong { font-size: 17px; color: #111; }
.hd-home-express span { font-size: 12px; color: #666; }
.hd-home-express .hd-home-text-cta { color: #111; margin: 0; }

/* Section headings */
.hd-home-section { margin-top: 40px; }
.hd-home-heading-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.hd-home-heading-row h2 { margin: 0; font-size: 26px; font-weight: 800; color: #111; }
.hd-home-link { border: 0; background: transparent; padding: 0; font-size: 14px; color: #111; text-decoration: underline; cursor: pointer; }

/* Product cards */
.hd-home-card-row { display: grid; gap: 14px; }
.hd-home-card-row.is-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.hd-home-card-row.is-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.hd-home-card-row.is-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.hd-home-card { display: flex; flex-direction: column; min-width: 0; padding: 12px; border: 1px solid #e1e1e1; background: #fff; }
.hd-home-card:hover .hd-home-card-title { text-decoration: underline; }
.hd-home-card-image { display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; background: #f7f7f7; color: #9a9a9a; margin-bottom: 10px; overflow: hidden; }
.hd-home-card-image img { width: 100%; height: 100%; object-fit: contain; display: block; }
.hd-home-rating { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; margin-bottom: 4px; }
.hd-home-stars { display: inline-flex; }
.hd-home-stars svg { color: #ccc; fill: #ddd; }
.hd-home-stars .filled { color: #f96302; fill: #f96302; }
.hd-home-card-title { margin: 0 0 8px; font-size: 13px; line-height: 1.3; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 34px; }
.hd-home-card-title b { color: #111; }
.hd-home-price { font-size: 26px; font-weight: 700; line-height: 1; color: #333; }
.hd-home-price sup { font-size: 12px; top: -.85em; position: relative; vertical-align: baseline; }
.hd-home-card-save { min-height: 18px; margin: 4px 0 10px; font-size: 12px; color: #555; }
.hd-home-card-save span { color: #c3201f; font-weight: 700; }
.hd-home-add-cart { margin-top: auto; padding: 9px 10px; border: 1px solid #f96302; border-radius: 4px; background: #fff; color: #f96302; font-size: 14px; font-weight: 700; cursor: pointer; }

/* Daily deals */
.hd-home-deals { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 20px; padding: 22px; background: #f6f6f6; border: 1px solid #e1e1e1; }
.hd-home-deals-intro h2 { margin: 0 0 6px; font-size: 26px; line-height: 1.1; font-weight: 800; color: #111; }
.hd-home-deals-intro p { margin: 0 0 12px; font-size: 14px; color: #333; }
.hd-home-countdown { display: inline-block; padding: 6px 10px; background: #fff; border: 1px solid #ddd; font-size: 13px; color: #333; margin-bottom: 16px; }
.hd-home-countdown b { color: #c3201f; }
.hd-home-deal-tabs { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.hd-home-deal-tabs button { text-align: left; border: 0; border-left: 3px solid transparent; background: transparent; padding: 4px 10px; font-size: 14px; color: #333; cursor: pointer; }
.hd-home-deal-tabs button.active { border-left-color: #f96302; font-weight: 700; color: #111; }
.hd-home-outline-button { padding: 9px 16px; border: 1px solid #f96302; border-radius: 4px; background: #fff; color: #f96302; font-size: 14px; font-weight: 700; cursor: pointer; }

/* Special buy */
.hd-home-special-buy { display: grid; grid-template-columns: 200px minmax(0, 1fr) auto; align-items: center; gap: 20px; margin-top: 40px; padding-right: 28px; min-height: 120px; border: 1px solid #d5d5d5; background: #fff; overflow: hidden; }
.hd-home-special-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f96302; color: #fff; text-transform: uppercase; }
.hd-home-special-badge span { font-size: 22px; font-weight: 800; }
.hd-home-special-badge strong { font-size: 15px; font-weight: 700; }
.hd-home-special-copy span { font-size: 12px; font-weight: 700; color: #f96302; text-transform: uppercase; }
.hd-home-special-copy h2 { margin: 4px 0; font-size: 26px; font-weight: 800; color: #111; }
.hd-home-special-copy p { margin: 0; font-size: 14px; color: #444; }

/* Tabs */
.hd-home-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.hd-home-tabs button { padding: 7px 14px; border: 1px solid #ccc; border-radius: 18px; background: #fff; font-size: 13px; color: #333; cursor: pointer; }
.hd-home-tabs button.active { border-color: #111; background: #111; color: #fff; font-weight: 700; }
.hd-home-carousel-control { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; color: #333; }

/* Window treatment savings */
.hd-home-savings-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.hd-home-savings-tile { min-width: 0; }
.hd-home-savings-image { display: flex; align-items: center; justify-content: center; aspect-ratio: 4 / 3; background: #f4f1ec; color: #a0a0a0; overflow: hidden; }
.hd-home-savings-image img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .2s; }
.hd-home-savings-tile:hover img { transform: scale(1.03); }
.hd-home-savings-price { display: flex; flex-direction: column; margin-top: 10px; font-size: 13px; color: #555; }
.hd-home-savings-price b { font-size: 22px; color: #111; }
.hd-home-savings-tile h3 { margin: 4px 0 0; font-size: 15px; font-weight: 700; color: #111; }
.hd-home-savings-tile:hover h3 { text-decoration: underline; }

/* Home essentials */
.hd-home-essentials { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.hd-home-essentials article { min-width: 0; }
.hd-home-essential-art { display: flex; align-items: center; justify-content: center; aspect-ratio: 4 / 3; color: rgba(0,0,0,.35); }
.hd-home-essential-art.is-blue { background: #dfe7ec; }
.hd-home-essential-art.is-sand { background: #efe5d6; }
.hd-home-essential-art.is-green { background: #e1e8dc; }
.hd-home-essential-art.is-gray { background: #e8e8e8; }
.hd-home-essentials h3 { margin: 10px 0 0; font-size: 15px; font-weight: 700; color: #111; }
.hd-home-essentials article.is-link:hover h3 { text-decoration: underline; }

/* Home services */
.hd-home-services { display: grid; grid-template-columns: 260px minmax(0, 1fr) auto; align-items: center; gap: 24px; margin-top: 40px; padding: 22px 28px; background: #f96302; color: #fff; }
.hd-home-services-brand { display: flex; flex-direction: column; gap: 6px; }
.hd-home-services-brand strong { font-size: 18px; line-height: 1.1; font-weight: 800; }
.hd-home-services-brand span { font-size: 12px; font-weight: 700; letter-spacing: .5px; }
.hd-home-services-copy h2 { margin: 0; font-size: 26px; font-weight: 800; }
.hd-home-services-copy p { margin: 6px 0 0; font-size: 15px; }
.hd-home-services-cta { padding: 11px 22px; border: 0; border-radius: 4px; background: #fff; color: #f96302; font-size: 15px; font-weight: 700; cursor: pointer; white-space: nowrap; }

@media (max-width: 1100px) {
  .hd-home-tile.is-main, .hd-home-tile.is-side { grid-column: span 6; }
  .hd-home-card-row.is-5, .hd-home-card-row.is-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hd-home-card-row.is-5 .hd-home-card:nth-child(n+4), .hd-home-card-row.is-6 .hd-home-card:nth-child(n+4) { display: none; }
  .hd-home-deals { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .hd-home-tile.is-third { grid-column: span 6; }
  .hd-home-sponsored { grid-template-columns: 1fr; }
  .hd-home-tile.is-main { height: auto; }
  .hd-home-sponsored-image-wrap { height: 200px; }
  .hd-home-express, .hd-home-special-buy, .hd-home-services { grid-template-columns: 1fr; text-align: center; justify-items: center; padding: 16px; }
  .hd-home-special-badge { width: 100%; padding: 12px 0; }
  .hd-home-card-row.is-4, .hd-home-savings-grid, .hd-home-essentials { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;
