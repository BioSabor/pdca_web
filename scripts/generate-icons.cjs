const sharp = require("sharp");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const source = path.join(__dirname, "..", "public", "icono.png");
const outDir = path.join(__dirname, "..", "public", "icons");

async function generate() {
  for (const size of sizes) {
    const outFile = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(source)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outFile);
    console.log(`✅ icon-${size}x${size}.png`);
  }
  console.log("\n✅ Iconos generados en public/icons/");
}

generate().catch(console.error);
