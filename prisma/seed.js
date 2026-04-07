const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const JSON_FILE = './milanohouse_products/products_final.json';

async function main() {
  console.log('🚀 Starting fresh product seeding...\n');

  // Step 1: Clear old products (to avoid slug conflicts)
  await prisma.orderItem.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  console.log('🗑️  Old products cleared.');

  const productsData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

  let success = 0;
  let failed = 0;

  for (const p of productsData) {
    try {
      // Make slug 100% unique by adding ID
      const uniqueSlug = `${p.slug}-${p.id}`;

      await prisma.product.create({
        data: {
          id: BigInt(p.id),
          title: p.title,
          slug: uniqueSlug,
          handle: p.handle,
          price: p.price,
          compareAtPrice: p.compareAtPrice || null,
          discountPercentage: p.discountPercentage || 0,
          stockQuantity: p.stockQuantity || 0,
          category: p.category,
          subCategory: p.subCategory || null,
          size: p.size || null,
          color: p.color || null,
          description: p.description || null,
          images: p.images || [],
          tags: p.tags || [],
          status: p.status || "Out of Stock",
          vendor: p.vendor || null,
          isFeatured: p.isFeatured || false,
          isNewArrival: p.isNewArrival || false,
          weightGrams: p.weightGrams || 200,
        },
      });

      success++;
      if (success % 50 === 0) {
        console.log(`✅ Seeded ${success} products...`);
      }
    } catch (err) {
      console.log(`❌ Failed: ${p.title} (ID: ${p.id}) → ${err.message}`);
      failed++;
    }
  }

  console.log('\n🎉 Seeding Completed!');
  console.log(`✅ Successfully seeded: ${success} products`);
  console.log(`❌ Failed: ${failed} products`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });