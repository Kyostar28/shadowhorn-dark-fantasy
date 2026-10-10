/**
 * Packs the whole project source into public/shadowhorn-project.zip so it can be
 * downloaded from the "Descargar proyecto" button (bottom-left of the site).
 * Runs automatically before every `npm run build` (see "prebuild" in package.json).
 *
 * Dependency-free ZIP writer (DEFLATE + CRC32) so it works in any build environment.
 * Secrets (.env*), node_modules and build outputs are never included.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(OUT_DIR, "shadowhorn-project.zip");
const ZIP_ROOT = "shadowhorn-dark-fantasy";

const EXCLUDED_DIRS = new Set([
  "node_modules", ".next", ".next.previous", ".open-next", ".wrangler", ".git", ".vercel",
  ".claude", ".playwright-mcp", "playwright-screenshots", "screenshots", "out", "build", "coverage", "tmp",
]);
const EXCLUDED_FILE_PATTERNS = [
  /^\.env/i, // never ship secrets
  /\.log$/i,
  /\.tsbuildinfo$/i,
  /\.pem$/i,
  /^\.DS_Store$/,
];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  if (typeof zlib.crc32 === "function") return zlib.crc32(buf) >>> 0;
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function collect(dir, rel = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...collect(abs, relPath));
    } else if (entry.isFile()) {
      if (EXCLUDED_FILE_PATTERNS.some((re) => re.test(entry.name))) continue;
      if (abs === OUT_FILE) continue;
      // Skip root-level screenshots generated while testing
      if (!rel && /\.(png|jpe?g)$/i.test(entry.name)) continue;
      files.push({ abs, rel: relPath });
    }
  }
  return files;
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = dosDateTime(new Date());

  for (const f of files) {
    const data = fs.readFileSync(f.abs);
    const name = Buffer.from(`${ZIP_ROOT}/${f.rel}`, "utf8");
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = compressed.length < data.length;
    const body = useDeflate ? compressed : data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(useDeflate ? 8 : 0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 30); // extra + comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + body.length;
  }

  const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

try {
  const files = collect(ROOT);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const zip = buildZip(files);
  fs.writeFileSync(OUT_FILE, zip);
  console.log(`[zip-project] ${files.length} archivos -> public/shadowhorn-project.zip (${(zip.length / 1024 / 1024).toFixed(2)} MB)`);
} catch (err) {
  console.error("[zip-project] Error generando el ZIP del proyecto:", err);
  process.exit(1);
}
