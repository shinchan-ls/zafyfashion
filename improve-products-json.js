const fs = require('fs');

const INPUT_FILE = './milanohouse_products/products_with_categories.json';
const OUTPUT_FILE = './milanohouse_products/products_improved.json';

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getSubCategory(title, category) {
  const t = title.toLowerCase();
  if (category === "Sunglasses") {
    if (t.includes("polarized")) return "Polarized";
    if (t.includes("aviator") || t.includes("pilot")) return "Aviator";
    if (t.includes("square") || t.includes("rectangular")) return "Square";
    if (t.includes("round")) return "Round";
    if (t.includes("wayfarer")) return "Wayfarer";
    return "Classic";
  }
  if (category === "Shoes") return "Sneakers";
  if (category === "Watches") return "Luxury Watch";
  if (category === "Perfumes") return "Eau de Parfum";
  if (category === "Wallets") return "Men's Wallet";
  return null;
}

function calculateDiscount(compareAtPrice, price) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

async function main() {
  const products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const improvedProducts = [];

  console.log(`Improving ${products.length} products...\n`);

  for (const p of products) {
    let finalPrice = p.price;

    // Client Demand: Add +₹500 for Shoes and Watches
    if (p.category === "Shoes" || p.category === "Watches") {
      finalPrice = p.price + 500;
    }

    const slug = generateSlug(p.title);
    const discount = calculateDiscount(p.compareAtPrice, finalPrice);
    const subCategory = getSubCategory(p.title, p.category);

    const improved = {
      ...p,
      price: finalPrice,                    // Updated price (+500 for Shoes & Watches)
      slug: slug,
      discountPercentage: discount,
      subCategory: subCategory || null,
      
      // Realistic stock quantities
      stockQuantity: p.category === "Shoes" || p.category === "Watches" 
                     ? Math.floor(Math.random() * 12) + 8     // 8–19
                     : Math.floor(Math.random() * 25) + 15,   // 15–39

      status: "Out of Stock",               // Most products are currently out of stock
      tags: [
        ...new Set([
          p.vendor?.toLowerCase() || '',
          p.category.toLowerCase(),
          ...(p.title.toLowerCase().split(' ').filter(word => word.length > 2))
        ].filter(Boolean))
      ].slice(0, 8)
    };

    improvedProducts.push(improved);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(improvedProducts, null, 2));

  console.log("✅ JSON Successfully Improved!");
  console.log(`Final file saved → ${OUTPUT_FILE}`);
  console.log(`\nChanges Applied:`);
  console.log(`• Added +₹500 to all Shoes and Watches`);
  console.log(`• Generated clean slugs`);
  console.log(`• Calculated discount percentages`);
  console.log(`• Added realistic stock quantities`);
  console.log(`• Added subCategory where possible`);
  console.log(`• Added basic tags`);
}

main().catch(console.error);