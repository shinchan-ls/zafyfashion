// update-image-urls.js
const fs = require('fs');

const INPUT_FILE = './milanohouse_products/products_improved.json';
const OUTPUT_FILE = './milanohouse_products/products_final.json';

const NEW_BASE_URL = 'https://images.zafyfashion.com';

async function main() {
  let products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  let updatedCount = 0;

  products = products.map(product => {
    if (product.images && Array.isArray(product.images)) {
      product.images = product.images.map(oldUrl => {
        // Replace any old R2 pub URL with your custom domain
        const newUrl = oldUrl.replace(/https:\/\/pub-[^.]+\.r2\.dev/, NEW_BASE_URL);
        if (newUrl !== oldUrl) updatedCount++;
        return newUrl;
      });
    }
    return product;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));

  console.log("✅ Image URLs Updated Successfully!");
  console.log(`New base URL: ${NEW_BASE_URL}`);
  console.log(`Updated ${updatedCount} image URLs`);
  console.log(`Final file saved: ${OUTPUT_FILE}`);
}

main().catch(console.error);