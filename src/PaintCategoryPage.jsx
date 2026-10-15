import { bannerImageStyle } from "./bannerImage.js";
import React, { useState } from "react";
import { ChevronRight, ChevronLeft, Star, PaintBucket, PaintRoller, Paintbrush, Package, SprayCan } from "lucide-react";

// Paint category page (mockup). Only the top sponsored banner is functional
// and editable; everything else is static to match the Home Depot layout.

export const DEFAULT_PAINT_PAGE_SETTINGS = {
  topBanner: {
    label: "Sponsored",
    mode: "template",
    fullImageUrl: "",
    imageZoom: 1,
    imagePosX: 50,
    imagePosY: 50,
    brand: "Glidden",
    logoUrl: "",
    headline: "READY FOR RAIN IN 1 HOUR",
    subhead: "Glidden Exterior Paint + Primer",
    ctaText: "Shop Now",
    ctaUrl: "",
    imageUrl: ""
  }
};

export function mergePaintPageSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const banner = source.topBanner && typeof source.topBanner === "object" ? source.topBanner : {};
  const defaults = DEFAULT_PAINT_PAGE_SETTINGS.topBanner;
  return {
    topBanner: Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof banner[key] === typeof fallback ? banner[key] : fallback]))
  };
}

const NAV_SECTIONS = [
  { title: "", links: ["Paint Color Wall"] },
  { title: "Shop Paints", links: ["Interior Paint", "Exterior Wood Coatings", "Exterior Paint", "Concrete Sealers", "Spray Paint", "Interior Wood Stains", "Primers", "Paint Samples"] },
  { title: "Shop Paint Supplies", links: ["Paint Supplies", "Paint Applicators", "Adhesives", "Tape", "Tarps", "Caulk & Sealants", "Sanding Supplies", "Patching & Repair"] },
  { title: "Shop by Brand", links: ["Behr Paint", "Glidden Paint", "Kilz Primers"] }
];

const HERO_SLIDES = [
  { kicker: "Limited Time", headline: "10% OFF EXTERIOR STAINS", body: "When You Buy 3 or More Select 1-Gallon Can Purchases of BEHR PREMIUM®, OLYMPIC ELITE®, or OLYMPIC MAXIMUM®", colors: ["#7a4a2a", "#a86b3c", "#c99a6b", "#5c3a24"] },
  { kicker: "Limited Time", headline: "10% OFF WHEN YOU BUY", body: "Three or More Interior or Exterior One-Gallon Cans of BEHR ULTRA®, BEHR MARQUEE® or BEHR DYNASTY®", colors: ["#e9e4da", "#b7c3c1", "#596d69", "#d0ae9a"] },
  { kicker: "2027 Color of the Year", headline: "GROUNDED", body: "Rooted in Renewal", colors: ["#8a6f5a", "#a48a74", "#6e5644", "#c2ab95"] }
];

const TOP_PICKS = [
  { badge: "Best Seller", brand: "Ram Board", title: "38 in. W x 100 ft. L 42 MIL Heavy Duty Temporary Floor Protection Board", model: "5008200", rating: 4.7, reviews: 637, price: "65.98", unit: "/roll", icon: Package },
  { badge: "Best Seller", brand: "KILZ", title: "KILZ 2 ALL PURPOSE 5 gal. White Interior/Exterior Multi-Surface Primer, Sealer, and Stain Blocker", model: "20000", rating: 4.6, reviews: 13563, price: "94.00", note: "($18.80 /gallon)", icon: PaintBucket },
  { badge: "Best Seller", brand: "3M", title: "ScotchBlue 1.88 in. x 60 yds. Original Multi-Surface Painter's Tape (6-Pack)", model: "2090-48TP6", rating: 4.4, reviews: 4377, price: "36.07", note: "($6.01 /roll)", icon: Package },
  { badge: "Best Seller", brand: "HDX", title: "20 ft. x 100 ft. Clear 6 mil Plastic Sheeting", model: "CFHD0620C", rating: 4.3, reviews: 1175, price: "139.00", icon: Package },
  { badge: "Best Seller", brand: "BEHR PREMIUM PLUS", title: "5 gal. Ultra Pure White Ceiling Flat Interior Paint & Primer", model: "55805", rating: 4.4, reviews: 12508, price: "16.48", priceHigh: "130.00", icon: PaintBucket },
  { badge: "Best Seller", brand: "Foundation Armor", title: "5 gal. Penetrating Water Based Silane Siloxane Concrete Sealer, Brick Sealer and Masonry Water Repellent", model: "SX5000WB5GAL", rating: 4.8, reviews: 1224, price: "224.99", note: "($45.00 /gallon)", icon: PaintBucket },
  { badge: "Top Rated", brand: "Graco", title: "Magnum Airless 2800 PSI Project Painter Plus Stand Paint Sprayer", model: "257025", rating: 4.5, reviews: 3515, price: "268.00", icon: SprayCan },
  { badge: "Best Seller", brand: "Ready Seal", title: "5 gal. Natural Cedar Exterior Wood Stain and Sealer", model: "370045", rating: 4.7, reviews: 5414, price: "208.95", note: "($41.79 /gallon)", icon: PaintBucket },
  { badge: "Best Seller", brand: "The Home Depot", title: "5 Gallon Orange Homer Bucket", model: "05GLHD2", rating: 4.7, reviews: 9617, price: "3.98", icon: PaintBucket },
  { badge: "Best Seller", brand: "Wooster", title: "2 in. Shortcut Polyester Angled Sash Brush for All Paint Types", model: "0Q32110020", rating: 4.8, reviews: 7863, price: "7.47", icon: Paintbrush },
  { badge: "Best Seller", brand: "", title: "8-Piece Metal Tray/Shed Resistant White Woven Paint Applicator Kit", model: "RS 808", rating: 4.6, reviews: 5576, price: "17.97", icon: PaintRoller },
  { badge: "Exclusive", brand: "BEHR PREMIUM PLUS", title: "5 gal. Ultra Pure White Semi-Gloss Enamel Low Odor Interior Paint & Primer", model: "305005", rating: 4.5, reviews: 16052, price: "5.98", priceHigh: "378.00", icon: PaintBucket },
  { badge: "Best Seller", brand: "", title: "Better 9 in. x 3/8 in. High-Density Yellow Knit Paint Roller Cover (3-Pack)", model: "RS 1433", rating: 4.5, reviews: 4311, price: "9.98", icon: PaintRoller },
  { badge: "Best Seller", brand: "", title: "9 in. Heavy Duty 5-Wire Paint Roller Frame", model: "RF 211-9", rating: 4.5, reviews: 1618, price: "4.48", icon: PaintRoller },
  { badge: "Best Seller", brand: "BEHR PREMIUM", title: "1 gal. White Semi-Gloss Enamel Interior/Exterior Cabinet, Door & Trim Paint", model: "712001", rating: 4.4, reviews: 4267, price: "52.98", icon: PaintBucket }
];

const COLOR_FAMILIES = [
  { name: "Popular Colors", colors: ["#dfd2ca", "#596d69", "#b06f60"] },
  { name: "Whites", colors: ["#f7f5ef", "#f1ede1", "#e9e6dc"] },
  { name: "Neutrals", colors: ["#e4d8c7", "#cdc4b7", "#b3a48f"] },
  { name: "Grays", colors: ["#d5d6d3", "#a9aba8", "#74777a"] },
  { name: "Browns", colors: ["#b69479", "#8a6448", "#5c3e2b"] },
  { name: "Blacks", colors: ["#4a4a4a", "#2e2e30", "#1a1a1c"] },
  { name: "Greens", colors: ["#c6d3b8", "#8ea37c", "#4f6a4a"] },
  { name: "Blues", colors: ["#bcd0dc", "#74858f", "#2f4b66"] },
  { name: "Purples", colors: ["#d6cbdc", "#9f88ad", "#5f4870"] },
  { name: "Reds", colors: ["#e3b3ad", "#b8463e", "#7f2420"] },
  { name: "Oranges", colors: ["#f2c7a3", "#e2874a", "#b45a27"] },
  { name: "Yellows", colors: ["#f6e7a8", "#ecc95a", "#c9a032"] }
];

const PICKS_PER_PAGE = 5;

function Swatches({ colors, className = "" }) {
  return (
    <div className={`hd-paint-swatch-art ${className}`} aria-hidden="true">
      {colors.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} />)}
    </div>
  );
}

function Price({ value }) {
  const [dollars, cents = "00"] = String(value).split(".");
  return <span className="hd-paint-price"><sup>$</sup>{dollars}<sup>{cents}</sup></span>;
}

export default function PaintCategoryPage({ settings, onBannerClick, onHome, imgSrc = (url) => url }) {
  const page = mergePaintPageSettings(settings);
  const banner = page.topBanner;
  const [heroIndex, setHeroIndex] = useState(0);
  const [picksPage, setPicksPage] = useState(0);
  const pickPages = Math.ceil(TOP_PICKS.length / PICKS_PER_PAGE);
  const visiblePicks = TOP_PICKS.slice(picksPage * PICKS_PER_PAGE, picksPage * PICKS_PER_PAGE + PICKS_PER_PAGE);
  const hero = HERO_SLIDES[heroIndex];
  const showFullImage = banner.mode === "image" && String(banner.fullImageUrl || "").trim();
  const handleBanner = () => onBannerClick?.(banner.ctaUrl);

  return (
    <div className="hd-category-landing-page hd-paint-page">
      <style>{PAINT_CSS}</style>
      <div className="hd-cat-breadcrumb hd-category-landing-breadcrumb"><button type="button" onClick={onHome}>Home</button><span>/</span><span>Paint</span></div>

      {showFullImage ? (
        <button type="button" className="hd-category-sponsored-image-banner" aria-label="Sponsored paint promotion" onClick={handleBanner}>
          <img src={imgSrc(banner.fullImageUrl)} alt="Sponsored promotion" style={bannerImageStyle(banner)} />
        </button>
      ) : (
        <section className="hd-paint-top-banner" aria-label="Sponsored paint promotion">
          <div className="hd-paint-top-brand">
            <span>{banner.label}</span>
            {banner.logoUrl ? <img src={imgSrc(banner.logoUrl)} alt={banner.brand} /> : <strong>{banner.brand}</strong>}
          </div>
          <div className="hd-paint-top-copy">
            <h2>{banner.headline}</h2>
            {banner.subhead ? <p>{banner.subhead}</p> : null}
          </div>
          <button type="button" className="hd-paint-top-cta" onClick={handleBanner}>{banner.ctaText}</button>
          <div className="hd-paint-top-image">
            {banner.imageUrl ? <img src={imgSrc(banner.imageUrl)} alt={`${banner.brand} promotion`} /> : <Swatches colors={["#2f4b66", "#74858f", "#aebdbb", "#f1ede1"]} />}
          </div>
        </section>
      )}

      <div className="hd-category-landing-layout">
        <aside className="hd-category-left-rail" aria-label="Paint categories">
          <h1 className="hd-category-landing-title">PAINT</h1>
          <nav className="hd-category-side-nav">
            {NAV_SECTIONS.map((section, index) => (
              <div className="hd-category-nav-section" key={`${section.title || "top"}-${index}`}>
                {section.title ? <h2>{section.title}</h2> : null}
                {section.links.map((link) => <button type="button" key={link}>{link}</button>)}
              </div>
            ))}
          </nav>
          <aside className="hd-category-side-ad hd-paint-side-ad" aria-label="Sponsored Olympic promotion">
            <div className="hd-category-side-ad-strip" aria-hidden="true" />
            <div className="hd-category-side-ad-image"><Swatches colors={["#5c3a24", "#7a4a2a", "#a86b3c", "#c99a6b"]} className="is-planks" /></div>
            <span>Sponsored</span>
            <strong className="hd-paint-side-brand">OLYMPIC</strong>
            <h2>Protect Your Deck This Season</h2>
            <button type="button">Shop Now</button>
          </aside>
        </aside>

        <main className="hd-category-landing-main">
          <section className="hd-category-hero-promo hd-paint-hero">
            <div className="hd-category-hero-copy">
              <p className="hd-category-hero-kicker">{hero.kicker}</p>
              <h2>{hero.headline}</h2>
              <p>{hero.body}</p>
              <button type="button">Shop Now</button>
            </div>
            <div className="hd-category-hero-image"><Swatches colors={hero.colors} className="is-hero" /></div>
            <div className="hd-category-carousel-control hd-paint-carousel-control">
              <button type="button" aria-label="Previous promotion" disabled={heroIndex === 0} onClick={() => setHeroIndex((i) => Math.max(0, i - 1))}><ChevronLeft size={18} /></button>
              <span>{heroIndex + 1}/{HERO_SLIDES.length}</span>
              <button type="button" aria-label="Next promotion" disabled={heroIndex === HERO_SLIDES.length - 1} onClick={() => setHeroIndex((i) => Math.min(HERO_SLIDES.length - 1, i + 1))}><ChevronRight size={18} /></button>
            </div>
          </section>

          <section className="hd-category-module hd-paint-picks">
            <div className="hd-category-module-heading-row"><h2>PAINT TOP PICKS</h2></div>
            <div className="hd-paint-picks-row">
              {visiblePicks.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="hd-paint-pick-card" key={item.model}>
                    <span className="hd-paint-pick-badge">{item.badge}</span>
                    <div className="hd-paint-pick-image"><Icon size={54} strokeWidth={1.3} /></div>
                    <span className="hd-paint-pick-more">+more options</span>
                    <div className="hd-paint-pick-rating">
                      <span className="hd-paint-stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < Math.round(item.rating) ? "filled" : ""} />)}</span>
                      <span>({item.rating} / {item.reviews.toLocaleString()})</span>
                    </div>
                    <span className="hd-paint-pick-model">Model# {item.model}</span>
                    <p className="hd-paint-pick-title">{item.brand ? <b>{item.brand} </b> : null}{item.title}</p>
                    <div className="hd-paint-pick-price">
                      <Price value={item.price} />{item.priceHigh ? <><span className="hd-paint-price-dash">-</span><Price value={item.priceHigh} /></> : null}{item.unit ? <span className="hd-paint-price-unit">{item.unit}</span> : null}
                    </div>
                    {item.note ? <span className="hd-paint-pick-note">{item.note}</span> : <span className="hd-paint-pick-note" />}
                    <button type="button" className="hd-paint-add-cart">Add to Cart</button>
                  </article>
                );
              })}
            </div>
            <div className="hd-category-small-carousel hd-paint-carousel-control hd-paint-picks-control">
              <button type="button" aria-label="Previous products" disabled={picksPage === 0} onClick={() => setPicksPage((p) => Math.max(0, p - 1))}><ChevronLeft size={16} /></button>
              <span>{picksPage + 1}/{pickPages}</span>
              <button type="button" aria-label="Next products" disabled={picksPage === pickPages - 1} onClick={() => setPicksPage((p) => Math.min(pickPages - 1, p + 1))}><ChevronRight size={16} /></button>
            </div>
          </section>

          <section className="hd-paint-mid-ad" aria-label="Sponsored T-REX Tape promotion">
            <div className="hd-paint-mid-brand"><span>Sponsored</span><strong>T-REX<sup>®</sup></strong></div>
            <div className="hd-paint-mid-copy"><h2>STRONGER THAN DUCT TAPE</h2><p>Grips rough surfaces and holds tight in any weather.</p></div>
            <button type="button">Shop Now</button>
          </section>

          <section className="hd-paint-reorder" aria-label="Reorder previously purchased colors">
            <PaintBucket size={30} strokeWidth={1.5} />
            <div><h2>VIEW &amp; REORDER PREVIOUSLY PURCHASED COLORS</h2><p>Free Pickup &amp; Same Day Delivery on select products.</p></div>
            <button type="button">Get Started</button>
          </section>

          <section className="hd-category-module hd-paint-explore">
            <div className="hd-category-module-heading-row"><h2>EXPLORE COLORS</h2></div>
            <div className="hd-paint-color-grid">
              {COLOR_FAMILIES.map((family) => (
                <article className="hd-paint-color-tile" key={family.name}>
                  <Swatches colors={family.colors} className="is-family" />
                  <h3>{family.name}</h3>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

const PAINT_CSS = `
.hd-paint-page button { font-family: inherit; }
.hd-paint-swatch-art { display: flex; width: 100%; height: 100%; }
.hd-paint-swatch-art span { flex: 1; }
.hd-paint-swatch-art.is-planks { flex-direction: column; }
.hd-paint-swatch-art.is-hero span:first-child { flex: 2; }

/* Top sponsored banner (template) */
.hd-root .hd-paint-page .hd-category-landing-breadcrumb { border-bottom: 0 !important; }
.hd-paint-top-banner { display: grid; grid-template-columns: 210px minmax(0, 1fr) auto 34%; align-items: center; height: var(--sponsored-height, 150px); border: 1px solid #d5d5d5; background: #fff; overflow: hidden; margin-bottom: 18px; }
.hd-paint-top-brand { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 10px; height: 100%; padding: 0 24px; }
.hd-paint-top-brand span { font-size: 12px; color: #333; }
.hd-paint-top-brand strong { font-size: 34px; line-height: 1; font-weight: 800; font-style: italic; color: #00539b; letter-spacing: -1px; }
.hd-paint-top-brand img { max-width: 160px; max-height: 64px; object-fit: contain; }
.hd-paint-top-copy { min-width: 0; padding-right: 16px; }
.hd-paint-top-copy h2 { margin: 0; font-size: 30px; line-height: 1; font-weight: 800; color: #111; letter-spacing: -.5px; text-transform: uppercase; }
.hd-paint-top-copy p { margin: 8px 0 0; font-size: 15px; color: #333; }
.hd-paint-top-cta { margin-right: 28px; border: 0; border-bottom: 1px solid #111; background: transparent; padding: 0 0 2px; font-size: 16px; color: #111; cursor: pointer; white-space: nowrap; }
.hd-paint-top-image { height: 100%; background: #eee; overflow: hidden; }
.hd-paint-top-image img { display: block; width: 100%; height: 100%; object-fit: cover; }

/* Side ad */
.hd-paint-side-ad strong.hd-paint-side-brand { color: #00205b; letter-spacing: 1px; font-size: 30px; }

/* Carousel controls */
.hd-paint-carousel-control button { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; padding: 0; color: #111; cursor: pointer; }
.hd-paint-carousel-control button:disabled { opacity: .25; cursor: default; }

/* Top picks */
.hd-paint-picks-row { display: grid; grid-template-columns: repeat(${PICKS_PER_PAGE}, minmax(0, 1fr)); gap: 14px; }
.hd-paint-pick-card { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 12px; border: 1px solid #e1e1e1; background: #fff; }
.hd-paint-pick-badge { align-self: flex-start; margin-bottom: 8px; padding: 2px 6px; background: #f5f5f5; border: 1px solid #ddd; font-size: 11px; font-weight: 700; color: #333; }
.hd-paint-pick-image { display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; background: #f7f7f7; color: #9a9a9a; margin-bottom: 8px; }
.hd-paint-pick-more { font-size: 12px; color: #3e7697; margin-bottom: 6px; }
.hd-paint-pick-rating { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; margin-bottom: 4px; }
.hd-paint-stars { display: inline-flex; color: #ccc; }
.hd-paint-stars .filled { color: #f96302; fill: #f96302; }
.hd-paint-stars svg:not(.filled) { fill: #ddd; }
.hd-paint-pick-model { font-size: 11px; color: #777; margin-bottom: 4px; }
.hd-paint-pick-title { margin: 0 0 8px; font-size: 13px; line-height: 1.3; color: #333; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; min-height: 50px; }
.hd-paint-pick-title b { color: #111; }
.hd-paint-pick-price { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 2px; color: #333; }
.hd-paint-price { font-size: 26px; font-weight: 700; line-height: 1; }
.hd-paint-price sup { font-size: 12px; top: -.85em; position: relative; vertical-align: baseline; }
.hd-paint-price-dash { font-size: 20px; padding: 0 3px; }
.hd-paint-price-unit { font-size: 13px; align-self: flex-end; }
.hd-paint-pick-note { min-height: 16px; margin-top: 4px; font-size: 12px; color: #555; }
.hd-paint-add-cart { margin-top: auto; padding: 9px 10px; border: 0; border-radius: 4px; background: #f96302; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.hd-paint-picks-control { display: flex; justify-content: flex-end; margin-top: 12px; }

/* Mid-page ad */
.hd-paint-mid-ad { display: grid; grid-template-columns: 180px minmax(0, 1fr) auto; align-items: center; gap: 16px; min-height: 110px; margin-top: 36px; padding: 0 28px 0 0; border: 1px solid #d5d5d5; background: linear-gradient(90deg, #111 0 180px, #fff 180px); overflow: hidden; }
.hd-paint-mid-brand { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 100%; color: #fff; }
.hd-paint-mid-brand span { font-size: 11px; color: #ddd; }
.hd-paint-mid-brand strong { font-size: 32px; font-weight: 900; letter-spacing: -1px; color: #ffcf00; }
.hd-paint-mid-brand sup { font-size: 12px; }
.hd-paint-mid-copy h2 { margin: 0; font-size: 24px; font-weight: 800; color: #111; }
.hd-paint-mid-copy p { margin: 6px 0 0; font-size: 14px; color: #444; }
.hd-paint-mid-ad > button { border: 0; border-bottom: 1px solid #111; background: transparent; padding: 0 0 2px; font-size: 15px; color: #111; cursor: pointer; }

/* Reorder bar */
.hd-paint-reorder { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 16px; margin-top: 28px; padding: 16px 20px; border: 1px solid #d5d5d5; background: #f8f8f8; color: #f96302; }
.hd-paint-reorder h2 { margin: 0; font-size: 17px; font-weight: 800; color: #111; }
.hd-paint-reorder p { margin: 4px 0 0; font-size: 13px; color: #555; }
.hd-paint-reorder button { padding: 9px 18px; border: 1px solid #f96302; border-radius: 4px; background: #fff; color: #f96302; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; }

/* Explore colors */
.hd-category-module.hd-paint-explore { margin-top: 36px; }
.hd-paint-color-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 18px 14px; }
.hd-paint-color-tile { min-width: 0; text-align: center; cursor: pointer; }
.hd-paint-color-tile .hd-paint-swatch-art { aspect-ratio: 1 / 1; height: auto; border: 1px solid #e1e1e1; overflow: hidden; }
.hd-paint-color-tile h3 { margin: 8px 0 0; font-size: 14px; font-weight: 400; color: #333; }
.hd-paint-color-tile:hover h3 { text-decoration: underline; }

@media (max-width: 1100px) {
  .hd-paint-picks-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hd-paint-pick-card:nth-child(n+4) { display: none; }
  .hd-paint-top-banner { grid-template-columns: 170px minmax(0, 1fr) auto; }
  .hd-paint-top-image { display: none; }
}
@media (max-width: 760px) {
  .hd-paint-top-banner { grid-template-columns: 1fr; height: auto; padding: 16px 0; gap: 10px; }
  .hd-paint-top-brand, .hd-paint-top-copy { padding: 0 16px; }
  .hd-paint-top-copy h2 { font-size: 22px; }
  .hd-paint-top-cta { justify-self: start; margin: 0 16px; }
  .hd-paint-picks-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hd-paint-pick-card:nth-child(n+3) { display: none; }
  .hd-paint-color-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hd-paint-mid-ad { grid-template-columns: 1fr; background: #fff; padding: 0 0 16px; text-align: center; }
  .hd-paint-mid-brand { background: #111; padding: 14px 0; }
  .hd-paint-mid-ad > button { justify-self: center; }
  .hd-paint-reorder { grid-template-columns: 1fr; text-align: center; justify-items: center; }
}
`;
