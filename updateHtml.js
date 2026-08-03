const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

/**
 * Jak skript funguje?
 *
 * Pokud v template (index.html) má něco atribut data-remove, tak se to zahodí.
 * Nepřenese se to ze šablony.
 *
 * Vše v template, co má atribut data-keep="neco",
 * je nahrazeno data-keep="neco" z cíle.
 *
 * Obsah elementu data-snipet="jmeno snipetu"
 * je nahrazený obsahem elementu se stejným atributem a jménem ze souboru snipets.html.
 * 
 * cílivý element snipetu s emusí nacházet v nepřepisované části
 */

const KEEP_ATTR = "data-keep";
const REMOVE_ATTR = "data-remove";
const SNIPET_ATTR = "data-snipet";

const DEV_DIR = "dev";
const TEMPLATE = "index.html";
const SNIPETS = "snipets.html";

const TEMPLATE_FILE = path.join(DEV_DIR, TEMPLATE);
const SNIPETS_FILE = path.join(DEV_DIR, SNIPETS);

const EXCLUDES = [
	TEMPLATE,
	SNIPETS
];

// načti template
const templateHtml = fs.readFileSync(TEMPLATE_FILE, "utf8");

// načti snipety, pokud existují
const snipetMap = new Map();

if (fs.existsSync(SNIPETS_FILE)) {
	const snipetsHtml = fs.readFileSync(SNIPETS_FILE, "utf8");

	const snipets = cheerio.load(snipetsHtml, {
		decodeEntities: false
	});

	// seskupení všech data-snipet ze souboru snipets.html
	snipets(`[${SNIPET_ATTR}]`).each((i, el) => {
		const key = snipets(el).attr(SNIPET_ATTR);

		if (!key) {
			return;
		}

		snipetMap.set(key, snipets(el).html());
	});
} else {
	console.log(`Soubor ${SNIPETS_FILE} nebyl nalezen, snipety nebudou aplikovány.`);
}

function applySnipets($) {
	$(`[${SNIPET_ATTR}]`).each((i, el) => {
		const key = $(el).attr(SNIPET_ATTR);

		if (!snipetMap.has(key)) {
			return;
		}

		$(el).html(snipetMap.get(key));
	});
}

function processFile(filePath) {
	const originalHtml = fs.readFileSync(filePath, "utf8");

	const original = cheerio.load(originalHtml, {
		decodeEntities: false
	});

	const template = cheerio.load(templateHtml, {
		decodeEntities: false
	});

	// seskupení všech data-keep z cílového souboru
	const keepMap = new Map();

	original(`[${KEEP_ATTR}]`).each((i, el) => {
		const key = original(el).attr(KEEP_ATTR);

		if (!keepMap.has(key)) {
			keepMap.set(key, []);
		}

		keepMap.get(key).push(original.html(el));
	});

	// nahrazení data-keep v template
	template(`[${KEEP_ATTR}]`).each((i, el) => {
		const key = template(el).attr(KEEP_ATTR);

		if (!keepMap.has(key)) {
			return;
		}

		const htmlBlocks = keepMap.get(key);

		template(el).replaceWith(htmlBlocks.join("\n"));
	});

	// vložení snipetů
	applySnipets(template);

	// odstranění všech data-remove
	template(`[${REMOVE_ATTR}]`).remove();

	fs.writeFileSync(filePath, template.html(), "utf8");

	console.log(`Aktualizováno: ${filePath}`);
}

fs.readdirSync(DEV_DIR)
	.filter(fileName => {
		return (
			fileName.endsWith(".html") &&
			!EXCLUDES.includes(fileName)
		);
	})
	.forEach(fileName => {
		processFile(path.join(DEV_DIR, fileName));
	});

console.log("Hotovo – všechny HTML soubory ve složce dev byly aktualizovány.");