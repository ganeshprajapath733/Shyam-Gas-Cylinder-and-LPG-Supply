// One template + data files -> one static HTML page per area/service.
// Add a new area: add one entry to data/areas.json, then run `node build.mjs` (Vercel does this on every deploy).
import fs from 'node:fs'; import path from 'node:path';
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const cfg = read('site.config.json'), areas = read('data/areas.json'), services = read('data/services.json');
const SITE = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '');   // change domain in ONE place
const tpl = fs.readFileSync('templates/page.html', 'utf8');
const MIN_WORDS = +(process.env.MIN_WORDS || 150);   // area pages thinner than this are set to noindex automatically
const DIST = 'dist', today = new Date().toISOString().slice(0, 10);
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync('public', DIST, { recursive: true });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const jsonld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const addr = `${cfg.address.street}, ${cfg.address.city}, ${cfg.address.region} ${cfg.address.postcode}`;
const wa = t => `https://wa.me/${cfg.phone.replace(/\D/g, '')}?text=${encodeURIComponent(t)}`;
const aLink = a => `<a href="/areas/${a.slug}/">${esc(a.name)}</a>`;
const serviceLinks = services.map(s => `<a href="/services/${s.slug}/">${esc(s.name)}</a>`).join(' ');
const biz = () => ({ '@context': 'https://schema.org', '@type': ['LocalBusiness', 'Store'], '@id': SITE + '/#business', name: cfg.name, url: SITE + '/', telephone: cfg.phone, email: cfg.email,
  image: SITE + '/logo.webp', address: { '@type': 'PostalAddress', streetAddress: cfg.address.street, addressLocality: cfg.address.city, addressRegion: cfg.address.region, postalCode: cfg.address.postcode, addressCountry: 'IN' },
  areaServed: { '@type': 'City', name: 'Bengaluru' }, hasMap: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr),
  sameAs: [cfg.googleProfileUrl, ...cfg.sameAs].filter(Boolean),
  ...(cfg.geo.lat ? { geo: { '@type': 'GeoCoordinates', latitude: cfg.geo.lat, longitude: cfg.geo.lng } } : {}) });
const pages = [];
function render({ url, title, desc, h1, lead, body, crumbs, topic, nearby = '', ld = [], force = false }) {
  const wc = (body.replace(/<[^>]+>/g, ' ').toLowerCase().match(/[a-z0-9']+/g) || []).length;
  const noindex = url.startsWith('/areas/') && url !== '/areas/' && wc < MIN_WORDS && !force;
  const out = path.join(DIST, url, 'index.html'); fs.mkdirSync(path.dirname(out), { recursive: true });
  const crumbHtml = '<a href="/">Home</a> / ' + crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0])).join(' / ');
  const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: SITE + (c[1] || url) })) };
  const v = { title: esc(title), desc: esc(desc), url: SITE + url, site: SITE, name: cfg.name, phone: cfg.phone, phoneDisplay: cfg.phoneDisplay, email: cfg.email, hours: cfg.hours, addr: esc(addr),
    robots: noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large', wa: wa(topic), h1: esc(h1), lead: esc(lead), body, crumbs: crumbHtml, serviceLinks, nearby, year: new Date().getFullYear(), ld: jsonld(bc) + jsonld(biz()) + ld.map(jsonld).join('') };
  fs.writeFileSync(out, tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? ''));
  pages.push({ url, noindex, text: body.replace(/<[^>]+>/g, ' ') });
}
// ---- service pages
for (const s of services) render({ url: `/services/${s.slug}/`, title: `${s.name} | ${cfg.shortName}`, desc: s.desc, h1: s.h1, lead: s.lead, body: s.body, crumbs: [[s.name, `/services/${s.slug}/`]], topic: s.h1,
  nearby: `<p class="lnk"><strong>Delivery areas:</strong> ${areas.slice(0, 10).map(aLink).join(' ')} <a href="/areas/"><strong>All delivery areas</strong></a></p>` });
// ---- area pages (all from the same template)
const groups = {}; for (const a of areas) (groups[a.group] ||= []).push(a);
for (const a of areas) {
  const n = a.name, outer = a.tier === 'outer';
  let b = `<h2>Gas delivery in ${esc(n)}</h2>` + a.paragraphs.map(p => `<p>${esc(p)}</p>`).join('');
  if (a.landmarks) b += `<h2>Landmarks around ${esc(n)}</h2><p>We deliver to homes and apartments around ${esc(a.landmarks)}.</p>`;
  if (a.apartments?.length) b += `<h2>Apartment communities around ${esc(n)}</h2><p>We deliver gas connection sets, 14.2 kg refills and accessories to residents of apartments in this area, including ${esc(a.apartments.join(', ').replace(/, ([^,]*)$/, ' and $1'))}.</p><p style="font-size:.85rem">These names are listed only to show where we deliver. We are not affiliated with them.</p>`;
  b += `<h2>What we deliver in ${esc(n)}</h2><ul class="ul"><li><a href="/services/connection-sets/">Gas connection sets</a>, with a free 1-month leak service on new connections</li><li><a href="/services/cylinder-refill/">14.2 kg cylinder refills</a></li><li><a href="/services/commercial-cylinder/">19 kg commercial cylinders</a></li><li><a href="/services/gas-accessories/">Gas accessories</a></li></ul><p>Prices change with the market, so we share today's price on WhatsApp before dispatch. Delivery charges, if any, depend on your location and are agreed before delivery. Pay by UPI or cash on delivery.</p>`;
  const ld = [];
  if (a.faqs) { b += `<h2>Questions from ${esc(n)} residents</h2>` + a.faqs.map(([q, an]) => `<details><summary>${esc(q)}</summary><p>${esc(an)}</p></details>`).join('');
    ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faqs.map(([q, an]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: an } })) }); }
  const near = groups[a.group].filter(x => x.slug !== a.slug).slice(0, 8);
  render({ force: !!a.forceIndex, url: `/areas/${a.slug}/`, title: `Gas Cylinder Delivery in ${n} | ${cfg.shortName}`, desc: `Gas cylinder and connection set delivery near ${n}, Bengaluru. Same-day delivery of 14.2 kg cylinders. Call or WhatsApp ${cfg.phoneDisplay}.`,
    h1: `Gas Cylinder Delivery in ${n}, Bengaluru`, lead: `Looking for a gas agency near ${n}? We deliver gas connection sets and 14.2 kg cylinders to ${n}. Order on WhatsApp.`, body: b,
    crumbs: [['Delivery Areas', '/areas/'], [n, `/areas/${a.slug}/`]], topic: `Gas delivery in ${n}`, ld,
    nearby: `<p class="lnk"><strong>Nearby areas:</strong> ${near.map(aLink).join(' ')} <a href="/areas/"><strong>All delivery areas</strong></a></p>` });
}
// ---- areas hub
const hub = Object.entries(groups).map(([g, L]) => `<h2>${esc(g.startsWith('Outside') ? g : g + ' Bengaluru')}</h2><p class="lnk">${L.map(aLink).join(' ')}</p>`).join('') + '<p>Not listed? Message us your address and we will confirm.</p>';
render({ url: '/areas/', title: `Gas Cylinder Delivery Areas in Bengaluru | ${cfg.shortName}`, desc: 'All areas in Bengaluru where we deliver gas cylinders and connection sets: north, south, east, west and nearby towns.', h1: 'Gas Cylinder Delivery Areas in Bengaluru',
  lead: 'We deliver gas connection sets, 14.2 kg cylinders and accessories across Bengaluru and to nearby towns. Pick your area below.', body: hub, crumbs: [['Delivery Areas', '/areas/']], topic: 'Delivery areas in Bengaluru' });
// ---- sitemap + robots
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + ['/', ...pages.filter(p => !p.noindex).map(p => p.url)].map(u => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
// ---- quality lint: warns about thin or near-duplicate pages (these hurt rankings)
const ap = pages.filter(p => p.url.startsWith('/areas/') && p.url !== '/areas/');
const words = t => t.toLowerCase().match(/[a-z0-9']+/g) || [];
const held = ap.filter(p => p.noindex); if (held.length) console.warn(`${held.length} thin area pages are set to noindex until you add more real content (or set "forceIndex": true):\n  ` + held.map(p => p.url).join('\n  '));
const sets = ap.map(p => new Set(words(p.text)));
let dup = 0; for (let i = 0; i < ap.length; i++) for (let j = i + 1; j < ap.length; j++) { const I = [...sets[i]].filter(w => sets[j].has(w)).length, U = sets[i].size + sets[j].size - I; if (I / U > 0.85) dup++; }
console.log(`Built ${pages.length} pages (${ap.length} areas, ${services.length} services). Indexed area pages: ${ap.length - held.length}. Near-duplicate pairs: ${dup}. Site: ${SITE}`);
