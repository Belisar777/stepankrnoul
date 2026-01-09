const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pathImg = __dirname + "/dev/img/";
console.log(pathImg);

// Cesta k původnímu souboru logoObdelnik.webp
const inputPath = path.join(pathImg, 'logoCtverec.webp');

// Adresář pro uložení ikon
const outputDir = path.join(pathImg, 'icons');

// Zkontrolujeme, zda existuje výstupní adresář, pokud ne, vytvoříme ho
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir);
}

// Seznam požadovaných velikostí ikon
const sizes = [
	{ width: 192, height: 192 },
	{ width: 512, height: 512 },
	{ width: 180, height: 180 },
	{ width: 152, height: 152 },
	{ width: 144, height: 144 },
	{ width: 128, height: 128 },
	{ width: 16, height: 16 },
	{ width: 32, height: 32 }
];

// Funkce pro generování ikon
async function generateIcons() {
	for (const size of sizes) {
		const outputPath = path.join(outputDir, `icon-${size.width}x${size.height}.png`);
		await sharp(inputPath)
			.resize(size.width, size.height)
			.toFile(outputPath);
		console.log(`\x1b[32m✓ \x1b[0m Ikona vytvořena: ${outputPath}`);
	}

	// Vytvoření favicon.ico (48x48)
	const faviconPath = path.join(outputDir, 'favicon.ico');
	await sharp(inputPath)
		.resize(48, 48)
		.toFile(faviconPath);
	console.log(`\x1b[32m✓ \x1b[0m Ikona vytvořena: ${faviconPath}`);
}

// Spustíme funkci pro generování ikon
generateIcons().catch(err => {
	console.error(`\x1b[31m✗\x1b[0m Chyba při vytváření ikon:`, err);
});