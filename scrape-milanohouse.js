const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://milanohouse.in';
const OUTPUT_FOLDER = './milanohouse_products';
const IMAGES_FOLDER = path.join(OUTPUT_FOLDER, 'images');
const DELAY_MS = 600;   // Slightly faster now that we're not skipping

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

if (!fs.existsSync(OUTPUT_FOLDER)) fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
if (!fs.existsSync(IMAGES_FOLDER)) fs.mkdirSync(IMAGES_FOLDER, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url, filename) {
  try {
    const response = await axios.get(url, { 
      headers: HEADERS, 
      responseType: 'arraybuffer',
      timeout: 10000 
    });
    fs.writeFileSync(filename, response.data);
    return true;
  } catch (e) {
    return false;
  }
}

async function fetchAllProducts() {
  console.log('🔍 Fetching sitemap index...');

  const indexRes = await axios.get(`${BASE_URL}/sitemap.xml`, { headers: HEADERS });
  const parser = new xml2js.Parser({ explicitArray: true });
  const indexData = await parser.parseStringPromise(indexRes.data);

  const sitemaps = indexData.sitemapindex?.sitemap || indexData['sitemapindex']?.sitemap || [];
  const productSitemaps = sitemaps
    .filter(s => s.loc && s.loc[0] && s.loc[0].includes('sitemap_products'))
    .map(s => s.loc[0]);

  console.log(`📄 Found ${productSitemaps.length} product sitemap(s).`);

  const productMap = new Map();

  for (const sitemapUrl of productSitemaps) {
    console.log(`📥 Fetching: ${sitemapUrl.split('/').pop()}`);
    const res = await axios.get(sitemapUrl, { headers: HEADERS });
    const data = await parser.parseStringPromise(res.data);

    const urls = data.urlset?.url || data['urlset']?.url || [];
    for (const u of urls) {
      const loc = u.loc ? u.loc[0] : '';
      if (loc.includes('/products/')) {
        let handle = loc.split('/products/')[1].split('?')[0].replace(/\/$/, '').trim();
        if (handle && !productMap.has(handle)) {
          productMap.set(handle, loc);
        }
      }
    }
  }

  console.log(`✅ Total unique handles: ${productMap.size}\n`);

  const allProducts = [];
  let successCount = 0;

  for (const [handle, productUrl] of productMap) {
    console.log(`Fetching → ${handle}`);

    try {
      const jsonUrl = `${BASE_URL}/products/${handle}.json`;
      const res = await axios.get(jsonUrl, { headers: HEADERS, timeout: 12000 });

      const product = res.data.product;
      if (!product || !product.title) continue;

      const hasAvailableVariant = product.variants?.some(v => v.available === true) || false;

      const cleanProduct = {
        id: product.id,
        title: product.title.trim(),
        handle: product.handle,
        price: parseFloat(product.variants[0]?.price || 0),
        compareAtPrice: product.variants[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
        available: hasAvailableVariant,
        description: product.body_html || '',
        images: product.images ? product.images.map(img => img.src) : [],
        variants: product.variants ? product.variants.map(v => ({
          id: v.id,
          title: v.title,
          price: parseFloat(v.price),
          available: v.available
        })) : [],
        originalUrl: productUrl,
        vendor: product.vendor || 'Milanohouse'
      };

      allProducts.push(cleanProduct);
      successCount++;

      // Download images (even for sold-out products)
      for (let i = 0; i < cleanProduct.images.length; i++) {
        const imgUrl = cleanProduct.images[i];
        const ext = (imgUrl.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
        const filename = path.join(IMAGES_FOLDER, `${handle}_${i + 1}.${ext}`);
        await downloadImage(imgUrl, filename);
      }

      await sleep(DELAY_MS);

    } catch (err) {
      // Many old handles return 404 — we just skip silently
    }
  }

  // Save data
  const outputPath = path.join(OUTPUT_FOLDER, 'products.json');
  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));

  console.log(`\n🎉 Finished!`);
  console.log(`✅ Successfully scraped ${successCount} products (including sold-out)`);
  console.log(`📁 Saved: ${outputPath}`);
  console.log(`🖼️  Images saved in: ${IMAGES_FOLDER}`);
  console.log(`\nTip: In your website, you can show "Out of Stock" for products where available: false`);
}

fetchAllProducts().catch(err => console.error('❌ Error:', err.message));