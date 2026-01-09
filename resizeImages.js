const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'dev/img/';
const outputDir = 'dev/imgResized/';
const headPicture = "header.webp";
const headPictureHeight = 900;

if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

function processDirectory(dir) {
	fs.readdirSync(dir).forEach(file => {
		const inputFile = path.join(dir, file);
		const relativePath = path.relative(inputDir, inputFile);
		const outputFileDir = path.join(outputDir, path.dirname(relativePath));
		const outputName = path.parse(file).name;

		if (!fs.existsSync(outputFileDir)) {
			fs.mkdirSync(outputFileDir, { recursive: true });
		}

		const stats = fs.statSync(inputFile);

		if (stats.isDirectory()) {
			processDirectory(inputFile); // Rekurzivně projít podadresář
		} else {
			sharp(inputFile)
				.metadata()
				.then(({ width, height }) => {
					let sizes = [];
					if (width > 2000 || height > 2000) {
						sizes = [480, 768, 1200, 2000];
					} else if (width > 1200 || height > 1200) {
						sizes = [480, 768, 1200];
					} else if (width > 768 || height > 768) {
						sizes = [480, 768];
					}

					if (sizes.length > 0) {
						if (file === headPicture) {
							generateResizedImages(inputFile, outputFileDir, outputName, headPictureHeight, true, sizes);
						} else {
							generateResizedImages(inputFile, outputFileDir, outputName, null, false, sizes);
						}
					} else {
						console.warn(`\x1b[33m⚠️\x1b[0m  Přeskakuji ${file}, protože je menší než 768 px.`);
					}
				})
				.catch(err => console.error(`\x1b[31m✗\x1b[0m Chyba při získávání metadat obrázku ${file}:`, err));
		}
	});
}

function generateResizedImages(inputFile, outputDir, outputName, height = null, crop = false, sizes = []) {
	const fitOption = crop ? sharp.fit.cover : sharp.fit.inside;

	sizes.forEach(size => {
		const resizeOptions = height ? { width: size, height, fit: fitOption, position: sharp.gravity.center } : { width: size };
		sharp(inputFile)
			.resize(resizeOptions)
			.webp({ quality: 80 })
			.toFile(`${outputDir}/${outputName}-${size}.webp`)
			.then(() => console.log(`\x1b[32m✓ \x1b[0m Vygenerováno: ${outputName}-${size}.webp`))
			.catch(err => console.error('\x1b[31m✗\x1b[0m Chyba při zpracování obrázku:', err));
	});
}

// Spuštění rekurzivního procházení složky
processDirectory(inputDir);
