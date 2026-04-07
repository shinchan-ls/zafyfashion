const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const MAPPED_JSON = './milanohouse_products/products_with_local_paths.json';
const FINAL_JSON = './milanohouse_products/products_final_r2.json';

// ================== YOUR CONFIG ==================
const s3Client = new S3Client({
    region: 'auto',
    endpoint: 'https://25c2ae586f4612b82880230d122bc247.r2.cloudflarestorage.com',
    credentials: {
        accessKeyId: '338c7c8187eb621f062ff5ba92646c74',          // ← Change
        secretAccessKey: 'e4c0b60cebe23be293e4340c75d02008996be2bfac52e0f2c7368a59c86acb68'   // ← Change
    }
});

const BUCKET_NAME = 'products-image';
// ================================================

async function uploadToR2(localPath, key) {
    try {
        const fileContent = fs.readFileSync(localPath);
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: 'image/jpeg'
        }));

        // Public URL using your pub- link
        return `https://pub-25c2ae586f4612b82880230d122bc247.r2.dev/${key}`;
    } catch (err) {
        console.log(`❌ Failed: ${key}`);
        return null;
    }
}

async function main() {
    const products = JSON.parse(fs.readFileSync(MAPPED_JSON, 'utf-8'));
    const finalProducts = [];
    let uploadedCount = 0;

    console.log(`🚀 Starting upload to Cloudflare R2...\n`);

    for (const product of products) {
        console.log(`Uploading images for: ${product.title}`);

        const imageUrls = [];

        for (const img of product.localImages) {
            const key = `products/${product.handle}_${img.index}.jpg`;
            const publicUrl = await uploadToR2(img.localPath, key);

            if (publicUrl) {
                imageUrls.push(publicUrl);
                uploadedCount++;
            }
        }

        const finalProduct = {
            id: product.id,
            title: product.title,
            handle: product.handle,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            available: product.available,
            description: product.description,
            images: imageUrls,                    // ← Final Cloudflare R2 URLs
            status: product.available ? "In Stock" : "Out of Stock",
            vendor: product.vendor || "Milanohouse"
        };

        finalProducts.push(finalProduct);
    }

    fs.writeFileSync(FINAL_JSON, JSON.stringify(finalProducts, null, 2));

    console.log("\n🎉 SUCCESSFULLY COMPLETED!");
    console.log(`✅ Total Images Uploaded: ${uploadedCount}`);
    console.log(`✅ Final JSON Saved: ${FINAL_JSON}`);
    console.log(`\nYou can now import this file into your Vercel Postgres database.`);
}

main().catch(console.error);