const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const fg = require('fast-glob');

const distDir = path.join(__dirname, 'dist');

// Funkce pro odstranění nepotřebných souborů
const cleanUpFiles = (dist) => {
	const files = fs.readdirSync(dist);

	files.forEach(file => {
		const filePath = path.join(dist, file);
		const ext = path.extname(file);

		// Pokud je to adresář, procházíme rekurzivně
		if (fs.statSync(filePath).isDirectory()) {
			cleanUpFiles(filePath);
		} else {
			// Odstraníme všechny soubory s příponou .css a .js, které nejsou .min.css nebo .min.js
			if ((ext === '.css' && !file.endsWith('.min.css')) || (ext === '.js' && !file.endsWith('.min.js'))) {
				fs.unlinkSync(filePath);
				console.log(`\x1b[32m✓  \x1b[0mOdstraněn soubor: ${filePath}`);
			}
		}
	});
};

async function getUsedIcons(distDir) {
	const files = await fg([distDir + '/*.html'], { ignore: ['node_modules/**'] });
	const usedIcons = new Map(); // Map<spriteFileName, Set<iconId>>

	for (const file of files) {
		const content = fs.readFileSync(file, 'utf8');
		const $ = cheerio.load(content);

		$('use').each((_, el) => {
			const href = $(el).attr('xlink:href') || $(el).attr('href');
			if (!href || !href.startsWith('sprites/')) return;

			const [spritePath, iconId] = href.split('#');
			const spriteFile = path.basename(spritePath);

			if (!usedIcons.has(spriteFile)) {
				usedIcons.set(spriteFile, new Set());
			}
			usedIcons.get(spriteFile).add(iconId);
		});
	}
	return usedIcons;
}

function filterSprite(spritePath, usedIconIds) {
	const svgContent = fs.readFileSync(spritePath, 'utf8');
	const $ = cheerio.load(svgContent, { xmlMode: true });

	$('symbol').each((_, el) => {
		const id = $(el).attr('id');
		if (!usedIconIds.has(id)) {
			$(el).remove();
		}
	});

	let content = $.xml(); // return filtered SVG
	return content.replace(/^\s*[\r\n]/gm, '');
}

async function cleanUnusedSprites(distDir) {
	const usedIcons = await getUsedIcons(distDir);
	const spriteFiles = await fg([path.join(distDir, 'sprites/*.svg')]);

	for (const spritePath of spriteFiles) {
		const spriteFile = path.basename(spritePath);

		if (!usedIcons.has(spriteFile)) {
			fs.unlinkSync(spritePath);
			console.log(`⚠️  Sprite "${spriteFile}" není použit v HTML. Přeskakuji.`);
			continue;
		}

		const filteredSvg = filterSprite(spritePath, usedIcons.get(spriteFile));
		fs.writeFileSync(spritePath, filteredSvg, 'utf8');
		console.log(`\x1b[32m✓ \x1b[0m  Vyfiltrovaný sprite: ${spriteFile}`);
	}
}

async function cleanUnusedFonts(distDir) {
	const stylesPath = path.join(distDir, 'styles.min.css');
	const fontsDir = path.join(distDir, 'fonts');

	if (!fs.existsSync(stylesPath) || !fs.existsSync(fontsDir)) {
		console.warn('\x1b[31m✗\x1b[0m Soubor styles.min.css nebo složka fonts neexistuje.');
		return;
	}

	const stylesContent = await fs.promises.readFile(stylesPath, 'utf-8');
	const urlRegex = /url\(\s*['"]?(fonts\/([^)'"]+))['"]?\s*\)/gi;
	const usedFontFiles = new Set();

	let match;
	while ((match = urlRegex.exec(stylesContent)) !== null) {
		usedFontFiles.add(match[2]); // pouze název souboru bez složky
	}

	const allFontFiles = await fs.promises.readdir(fontsDir);

	for (const file of allFontFiles) {
		if (!usedFontFiles.has(file)) {
			const filePath = path.join(fontsDir, file);
			await fs.promises.unlink(filePath);
			console.log(`\x1b[32m✓ \x1b[0m Smazán nepoužitý font: ${file}`);
		}
	}

	console.log('\x1b[32m✓ \x1b[0m Nepotřebné soubory fontů byly odstraněny');
}

cleanUpFiles(distDir);
console.log('\x1b[32m✓  \x1b[0mNepotřebné soubory js a css byly odstraněny');
cleanUnusedFonts(distDir);
cleanUnusedSprites(distDir).catch(err => {
	console.error('\x1b[31m✗\x1b[0m Chyba při zpracování sprite souborů:', err);
	process.exit(1);
});

