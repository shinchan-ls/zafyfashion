const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = './milanohouse_products/products.json';
const IMAGES_FOLDER = './milanohouse_products/images';
const OUTPUT_JSON = './milanohouse_products/products_with_local_paths.json';

function getLocalImagesForProduct(handle) {
  const localImages = [];
  let index = 1;

  while (true) {
    let found = false;
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];

    for (const ext of extensions) {
      const filename = `${handle}_${index}${ext}`;
      const fullPath = path.join(IMAGES_FOLDER, filename);

      if (fs.existsSync(fullPath)) {
        localImages.push({
          index: index,
          filename: filename,
          localPath: fullPath,
          relativePath: `images/${filename}`   // useful for your frontend later
        });
        found = true;
        break;
      }
    }

    if (!found) break;
    index++;
  }

  return localImages;
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'));
  const mappedProducts = [];
  let totalImagesMapped = 0;

  console.log(`Mapping local images for ${products.length} products...\n`);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const localImages = getLocalImagesForProduct(product.handle);

    const mappedProduct = {
      ...product,
      localImages: localImages,           // ← New field with local mapping
      imageCount: localImages.length
    };

    mappedProducts.push(mappedProduct);
    totalImagesMapped += localImages.length;

    if ((i + 1) % 50 === 0) {
      console.log(`Processed ${i + 1}/${products.length} products...`);
    }
  }

  // Save the mapped JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(mappedProducts, null, 2));

  console.log("\n✅ Mapping Completed!");
  console.log(`Total Products Mapped : ${mappedProducts.length}`);
  console.log(`Total Images Mapped   : ${totalImagesMapped}`);
  console.log(`Output File Saved     : ${OUTPUT_JSON}`);
  
  // Summary by image count
  const summary = mappedProducts.reduce((acc, p) => {
    acc[p.imageCount] = (acc[p.imageCount] || 0) + 1;
    return acc;
  }, {});

  console.log("\n📊 Images per product summary:");
  Object.keys(summary).sort((a,b)=>b-a).forEach(count => {
    console.log(`   ${count} images → ${summary[count]} products`);
  });
}

main().catch(console.error);