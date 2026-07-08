import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const distDir = path.join(projectRoot, "dist");
const assetsDir = path.join(distDir, "assets");
const outputDir = path.join(projectRoot, "dist-portable");
const outputName = "GEOTECH3D_GEOSPATIAL_HUB_DEMO.html";
const zipName = "GEOTECH3D_GEOSPATIAL_HUB_DEMO.zip";
const outputHtmlPath = path.join(outputDir, outputName);
const outputZipPath = path.join(outputDir, zipName);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required build file was not found: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    ".css": "text/css",
    ".gif": "image/gif",
    ".html": "text/html",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".otf": "font/otf",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function makeDataUrl(filePath) {
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(fileName);
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${data}`;
}

function getAssetFiles() {
  if (!fs.existsSync(assetsDir)) return [];
  return fs
    .readdirSync(assetsDir)
    .filter((fileName) => fs.statSync(path.join(assetsDir, fileName)).isFile())
    .map((fileName) => ({
      fileName,
      filePath: path.join(assetsDir, fileName),
      dataUrl: makeDataUrl(path.join(assetsDir, fileName)),
    }));
}

function normalizeAssetSource(src) {
  const cleanSrc = String(src || "").replace(/^\.\//, "").replace(/^\//, "");
  return path.join(distDir, cleanSrc);
}

function inlineAssetReferences(content, assetFiles) {
  let nextContent = content;

  assetFiles.forEach((asset) => {
    const encodedName = encodeURIComponent(asset.fileName).replace(/%2F/g, "/");
    const patterns = [
      `/assets/${asset.fileName}`,
      `assets/${asset.fileName}`,
      `./assets/${asset.fileName}`,
      `/assets/${encodedName}`,
      `assets/${encodedName}`,
      `./assets/${encodedName}`,
    ];

    [...new Set(patterns)].forEach((pattern) => {
      nextContent = nextContent.split(pattern).join(asset.dataUrl);
    });
  });

  return nextContent;
}

function inlineStylesheets(html, assetFiles) {
  return html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      const stylesheetPath = normalizeAssetSource(href);
      if (!fs.existsSync(stylesheetPath)) return match;
      const css = inlineAssetReferences(fs.readFileSync(stylesheetPath, "utf8"), assetFiles)
        .replace(/<\/style>/gi, "<\\/style>");
      return `<style>\n${css}\n</style>`;
    },
  );
}

function inlineModuleScripts(html, assetFiles) {
  return html.replace(
    /<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (match, attrs, src) => {
      const scriptPath = normalizeAssetSource(src);
      if (!fs.existsSync(scriptPath)) return match;
      const isModule = /type=["']module["']/i.test(attrs) || src.endsWith(".js");
      const js = inlineAssetReferences(fs.readFileSync(scriptPath, "utf8"), assetFiles)
        .replace(/<\/script>/gi, "<\\/script>");
      return `<script${isModule ? ' type="module"' : ""}>\n${js}\n</script>`;
    },
  );
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

function createZip(entries, zipPath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime();

  entries.forEach((entry) => {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const dataBuffer = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const checksum = crc32(dataBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, dataBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(localDirectory.length, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  fs.writeFileSync(zipPath, Buffer.concat([localDirectory, centralDirectory, endOfCentralDirectory]));
}

function buildPortableHtml() {
  const indexPath = path.join(distDir, "index.html");
  const assetFiles = getAssetFiles();
  let html = readRequiredFile(indexPath).toString("utf8");

  html = inlineStylesheets(html, assetFiles);
  html = inlineModuleScripts(html, assetFiles);
  html = inlineAssetReferences(html, assetFiles);
  html = html.replace(
    "</head>",
    `  <meta name="portable-build" content="GEOTECH 3D GEOSPATIAL HUB local demo" />\n</head>`,
  );

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputHtmlPath, html, "utf8");
  createZip([{ name: outputName, data: Buffer.from(html, "utf8") }], outputZipPath);

  const htmlSizeKb = (fs.statSync(outputHtmlPath).size / 1024).toFixed(1);
  const zipSizeKb = (fs.statSync(outputZipPath).size / 1024).toFixed(1);
  console.log(`Portable HTML created: ${path.relative(projectRoot, outputHtmlPath)} (${htmlSizeKb} KB)`);
  console.log(`Portable ZIP created: ${path.relative(projectRoot, outputZipPath)} (${zipSizeKb} KB)`);
}

buildPortableHtml();
