const fs = require('fs');

const INPUT_FILE = './milanohouse_products/products_final_r2.json';
const OUTPUT_FILE = './milanohouse_products/products_with_categories.json';

function detectCategory(product) {
    const title = (product.title || '').toLowerCase();
    const handle = (product.handle || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const text = title + " " + handle + " " + desc;

    // === High Accuracy Rules ===
    if (text.includes("sunglass") || text.includes("sunglas") || 
        text.includes("tom ford") || text.includes("rayban") || 
        text.includes("gucci") || text.includes("chanel") || 
        text.includes("prada") || text.includes("balmain") || 
        text.includes("lacoste") || text.includes("fendi") || 
        text.includes("versace") || text.includes("louis vuitton")) {
        return "Sunglasses";
    }

    if (text.includes("watch") || text.includes("rolex") || 
        text.includes("omega") || text.includes("cartier") || 
        text.includes("tissot")) {
        return "Watches";
    }

    if (text.includes("shoe") || text.includes("sneaker") || 
        text.includes("trainer") || text.includes("jordan") || 
        text.includes("nike") || text.includes("onitsuka") || 
        text.includes("lv trainer") || text.includes("air force")) {
        return "Shoes";
    }

    if (text.includes("wallet") || text.includes("purse") || 
        text.includes("card holder") || text.includes("bi-fold")) {
        return "Wallets";
    }

    if (text.includes("perfume") || text.includes("eau") || 
        text.includes("fragrance") || text.includes("bombshell") || 
        text.includes("chanel combo") || text.includes("versace eau") || 
        text.includes("tobacco vanille") || text.includes("bleu de chanel")) {
        return "Perfumes";
    }

    if (text.includes("belt")) {
        return "Belts";
    }

    // Fallback based on keywords
    if (text.includes("gift set") || text.includes("miniature")) return "Perfumes";
    if (text.includes("frame")) return "Sunglasses";

    return "Uncategorized";
}

async function main() {
    const products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    let categorizedCount = 0;

    const updatedProducts = products.map(product => {
        const category = detectCategory(product);
        if (category !== "Uncategorized") categorizedCount++;

        return {
            ...product,
            category: category
        };
    });

    // Save new file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedProducts, null, 2));

    // Summary
    const summary = {};
    updatedProducts.forEach(p => {
        summary[p.category] = (summary[p.category] || 0) + 1;
    });

    console.log("✅ Categories Added Successfully!\n");
    console.log("📊 Category Summary:");
    Object.keys(summary).sort().forEach(cat => {
        console.log(`   ${cat.padEnd(15)} : ${summary[cat]} products`);
    });

    console.log(`\nTotal Products: ${updatedProducts.length}`);
    console.log(`Categorized    : ${categorizedCount}`);
    console.log(`Final File Saved: ${OUTPUT_FILE}`);
}

main().catch(console.error);