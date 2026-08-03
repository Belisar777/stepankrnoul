const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pLimit = require('p-limit').default;

// ======================================================
// VÝKON
// ======================================================

sharp.concurrency(2);

const PARALLEL_IMAGES = Math.max(2, Math.floor(os.cpus().length / 2));

// ======================================================
// KONFIGURACE
// ======================================================

const inputDir = 'dev/img/';
const outputDir = 'dev/imgResized/';

const headPicture = 'header.webp';
const headPictureHeight = 900;

const iconSource = path.join(__dirname, 'dev/img/logoSquare.webp');

const iconOutputDir = path.join(__dirname, 'dev/img/icons');

const iconSizes = [
	{ width: 192, height: 192 },
	{ width: 512, height: 512 },
	{ width: 180, height: 180 },
	{ width: 152, height: 152 },
	{ width: 144, height: 144 },
	{ width: 128, height: 128 },
	{ width: 32, height: 32 },
	{ width: 16, height: 16 }
];

// ======================================================
// GLOBÁLNÍ SEZNAM OČEKÁVANÝCH SOUBORŮ
// ======================================================

const expectedOutputs = new Set();

// ======================================================
// HELPERS
// ======================================================

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function getAllFiles(dir) {

	if (!fs.existsSync(dir)) {
		return [];
	}

	const result = [];

	for (const file of fs.readdirSync(dir)) {

		const fullPath = path.join(dir, file);

		if (fs.statSync(fullPath).isDirectory()) {
			result.push(...getAllFiles(fullPath));
		} else {
			result.push(fullPath);
		}
	}

	return result;
}

function needsRegeneration(sourceFile, outputFile) {

	if (!fs.existsSync(outputFile)) {
		return true;
	}

	const srcTime = fs.statSync(sourceFile).mtimeMs;
	const dstTime = fs.statSync(outputFile).mtimeMs;

	return srcTime > dstTime;
}

function registerExpected(file) {
	expectedOutputs.add(path.resolve(file));
}

// ======================================================
// RESIZE
// ======================================================

async function generateResizedImages(image, inputFile, outputDirectory, outputName, height = null, crop = false, sizes = []) {

	const fitOption = crop ? sharp.fit.cover : sharp.fit.inside;

	await Promise.all(sizes.map(async size => {

		const outputFile = path.join(outputDirectory, `${outputName}-${size}.webp`);

		registerExpected(outputFile);

		if (!needsRegeneration(inputFile, outputFile)) {

			console.log(`⏩ ${path.basename(outputFile)}`);

			return;
		}

		const resizeOptions = height
			? {
				width: size,
				height,
				fit: fitOption,
				position:
					sharp.gravity.center
			}
			: {
				width: size
			};

		await image
			.clone()
			.resize(resizeOptions)
			.webp({
				quality: 80,
				effort: 2
			})
			.toFile(outputFile);

		console.log(`✅ ${path.basename(outputFile)}`);
	})
	);
}

async function processImage(inputFile) {

	try {

		const image = sharp(inputFile);

		const metadata = await image.metadata();

		const width = metadata.width;
		const height = metadata.height;

		let sizes = [];

		if (width > 2000 || height > 2000) {

			sizes = [480, 768, 1200, 2000];

		} else if (width > 1200 || height > 1200) {

			sizes = [480, 768, 1200];

		} else if (width > 768 || height > 768) {

			sizes = [480, 768];
		}

		if (sizes.length === 0) {
			console.log(`⚠️ Přeskočeno: ${path.basename(inputFile)}`);

			return;
		}

		const relativePath = path.relative(inputDir, inputFile);

		const outputFileDir = path.join(outputDir, path.dirname(relativePath));

		ensureDir(outputFileDir);

		const fileName = path.basename(inputFile);

		const outputName = path.parse(fileName).name;

		await generateResizedImages(
			image,
			inputFile,
			outputFileDir,
			outputName,
			fileName === headPicture
				? headPictureHeight
				: null,
			fileName === headPicture,
			sizes
		);

	} catch (err) {
		console.error(`❌ ${inputFile}`, err);
	}
}

// ======================================================
// IKONY
// ======================================================

async function generateIcons() {

	if (!fs.existsSync(iconSource)) {

		console.warn('⚠️ Zdroj ikon neexistuje');

		return;
	}

	const image = sharp(iconSource);
	await Promise.all(

		iconSizes.map(async size => {

			const outputFile =
				path.join(
					iconOutputDir,
					`icon-${size.width}x${size.height}.png`
				);

			registerExpected(outputFile);

			if (!needsRegeneration(iconSource, outputFile)) {
				return;
			}

			await image
				.clone()
				.resize(
					size.width,
					size.height
				)
				.png()
				.toFile(outputFile);

			console.log(`✅ ${path.basename(outputFile)}`);
		})
	);

	const faviconPath =
		path.join(
			iconOutputDir,
			'favicon.ico'
		);

	registerExpected(faviconPath);

	if (needsRegeneration(iconSource, faviconPath)) {

		await image
			.clone()
			.resize(48, 48)
			.png()
			.toFile(faviconPath);

		console.log('✅ favicon.ico');
	}
}

// ======================================================
// CLEANUP
// ======================================================

function cleanupDirectory(baseDir) {

	const files =
		getAllFiles(baseDir);

	let removed = 0;

	for (const file of files) {

		const absolute = path.resolve(file);

		if (!expectedOutputs.has(absolute)) {

			fs.unlinkSync(file);
			removed++;
			console.log(`🗑️ ${file}`);
		}
	}

	return removed;
}

// ======================================================
// MAIN
// ======================================================

async function main() {

	console.time('Celkem');

	ensureDir(outputDir);
	ensureDir(iconOutputDir);

	console.log(`CPU: ${os.cpus().length}`);

	const files = getAllFiles(inputDir);

	const imageFiles =
		files.filter(file =>
			/\.(jpg|jpeg|png|webp)$/i.test(
				file
			)
		);

	console.log(`Nalezeno souborů: ${imageFiles.length}`);

	const limit = pLimit(PARALLEL_IMAGES);

	await Promise.all(

		imageFiles.map(file =>
			limit(() => processImage(file)
			)
		)
	);

	await generateIcons();

	console.log('\n🧹 Úklid neplatných souborů...');

	const removedResized = cleanupDirectory(outputDir);
	const removedIcons = cleanupDirectory(iconOutputDir);

	console.log(`🗑️ Odstraněno ${removedResized + removedIcons} souborů`);

	console.timeEnd('Celkem');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});