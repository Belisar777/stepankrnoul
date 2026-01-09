const fs = require('fs');
const path = require('path');
// Cesta k souboru package.json
const configPath = path.join(__dirname, 'package.json');

// Funkce pro načtení konfigurace ze souboru package.json
function loadConfig() {
	try {
		const configData = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(configData);
	} catch (error) {
		console.error(`\x1b[31m✗\x1b[0m Chyba při načítání souboru package.json: ${error.message}`);
		process.exit(1); // Ukončí skript s chybovým kódem
	}
}

const isEmailAndConvertToEntities = (input) => {
	// Regulární výraz pro validaci emailové adresy
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	// Ověření, zda vstup odpovídá emailové adrese
	if (emailRegex.test(input)) {
		// Funkce pro převod textu do HTML entit
		return input
			.split('')
			.map(char => `&#${char.charCodeAt(0)};`)
			.join('');
	} else {
		return input;
	}
};

// Funkce pro rekurzivní procházení adresářů a vyhledávání souborů s příponami .html, .txt, .xml a .js
function getFiles(dir, fileTypes = ['.html', '.js', '.txt', '.xml', '.webmanifest']) {
	let results = [];
	const list = fs.readdirSync(dir);
	list.forEach((file) => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);
		if (stat && stat.isDirectory()) {
			results = results.concat(getFiles(filePath, fileTypes)); // Rekurzivní procházení
		} else if (fileTypes.includes(path.extname(file))) {
			results.push(filePath);
		}
	});
	return results;
}

// Spuštění hlavního skriptu
function main() {
	const now = new Date();
	const package = loadConfig();
	const config = package.config;

	config.author = package.author;
	config.version = package.version;
	config.description = package.description;
	config.name = package.name;
	config.script = '<script src="scripts.min.js?v=' + package.version + '"></script>';
	config.style = '<link rel="stylesheet" href="styles.min.css?v=' + package.version + '">';
	config.currentTime = now.toISOString().split('T')[0] + 'T01:00:00+00:00';;

	const files = getFiles(__dirname + "/dist");

	if (files.length === 0) {
		console.log('\x1b[31m✗\x1b[0m Nenalezeny žádné soubory pro úpravu.');
		return;
	}

	files.forEach((filePath) => {
		try {
			let content = fs.readFileSync(filePath, 'utf-8');

			// Odstranění všech linku na css a skriptů z html souborů
			if (filePath.indexOf(".html") > -1) {
				content = content.replace(/<link .*css.*>/g, '');
				content = content.replace(/<script.*src.*js.*>/g, '');
				content = content.replace(/<!--{{(.*?)}}-->/g, '{{$1}}');

				console.log(`\x1b[32m✓ \x1b[0m Odstranění všech prolinkovaných skriptů a stylů v souboru: ${filePath}`);
			}

			// Provede nahrazení pro všechny vlastnosti z package.json
			for (const [key, value] of Object.entries(config)) {
				const regex = new RegExp(`{{${key}}}`, 'g');
				content = content.replace(regex, isEmailAndConvertToEntities(value));
			}
			fs.writeFileSync(filePath, content, 'utf-8');
			console.log(`\x1b[32m✓  \x1b[0mNahrazeny vlastnosti v souboru: ${filePath}`);
		} catch (error) {
			console.error(`\x1b[31m✗\x1b[0m Chyba při zpracování souboru ${filePath}: ${error.message}`);
		}
	});

	console.log('\x1b[32m✓  \x1b[0mNahrazení vlastností bylo dokončeno.');
}
// Spuštění skriptu
main();
