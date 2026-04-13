const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const INPUT_FILE = "./products_final.json";
const FAILED_FILE = "./failed-products.json";

const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

console.log("📦 Total JSON:", raw.length);

// ===== SAFE NUMBER =====
function safeNumber(val, max = 99999999) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  if (num > max) return max;
  if (num < 0) return 0;
  return num;
}

// ===== TRANSFORM =====
function transform(p) {
  return {
    id: BigInt(p.id),

    title: p.title || "",
    slug: `${p.slug || "product"}-${p.id}`, // unique

    handle: p.handle || null,

    price: safeNumber(p.price),
    compareAtPrice: p.compareAtPrice ? safeNumber(p.compareAtPrice) : null,
    discountPercentage: safeNumber(p.discountPercentage, 100),

    stockQuantity: safeNumber(p.stockQuantity, 10000),

    category: p.category || "Other",
    subCategory: p.subCategory || null,
    size: p.size || null,
    color: p.color || null,

    description: p.description || null,

    images: p.images || [],
    tags: p.tags || [],

    status: p.status || "Active",
    vendor: p.vendor || "Unknown",

    isFeatured: Boolean(p.isFeatured || false),
    isNewArrival: Boolean(p.isNewArrival || false),

    averageRating: safeNumber(p.averageRating, 5),
    reviewCount: safeNumber(p.reviewCount, 100000),

    weightGrams: safeNumber(p.weightGrams, 10000),
  };
}

// ===== MAIN =====
async function run() {
  console.log("🔍 Fetching DB IDs...");

  const dbProducts = await prisma.product.findMany({
    select: { id: true },
  });

  const dbSet = new Set(dbProducts.map(p => p.id.toString()));

  console.log("📊 DB Count:", dbSet.size);

  // ===== FIND MISSING =====
  const missing = raw.filter(p => !dbSet.has(p.id.toString()));

  console.log("❌ Missing:", missing.length);

  let success = 0;
  let failed = [];

  const BATCH_SIZE = 500;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batchRaw = missing.slice(i, i + BATCH_SIZE);
    const batch = batchRaw.map(transform);

    try {
      const res = await prisma.product.createMany({
        data: batch,
      });

      success += res.count;
    } catch (err) {
      console.log("⚠️ Batch fallback...");

      for (const item of batchRaw) {
        try {
          await prisma.product.create({
            data: transform(item),
          });
          success++;
        } catch (e) {
          failed.push({
            id: item.id,
            error: e.message,
          });
        }
      }
    }

    console.log(`🚀 Progress: ${i + batchRaw.length}/${missing.length}`);
  }

  fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));

  console.log("\n🎉 DONE");
  console.log("📦 Final Inserted:", success);
  console.log("❌ Failed:", failed.length);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());