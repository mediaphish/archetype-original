
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const LIB = path.join(ROOT, "knowledge");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : p;
  });
}

const files = fs.existsSync(LIB) ? walk(LIB).filter(p => p.endsWith(".md")) : [];
const docs = files.map(p => {
  const raw = fs.readFileSync(p, "utf8");
  const { data, content } = matter(raw);
  const id = path.relative(LIB, p).replace(/\\/g, "/");
  return {
    id,
    title: data.title || path.basename(p, ".md"),
    slug: data.slug || path.basename(p, ".md"),
    type: data.type || "note",
    tags: data.tags || [],
    status: data.status || "draft",
    summary: data.summary || "",
    created_at: data.created_at || "",
    updated_at: data.updated_at || "",
    body: content
  };
});

const out = { generated_at: new Date().toISOString(), count: docs.length, docs };
fs.mkdirSync(path.join(ROOT, "public"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "public", "knowledge.json"), JSON.stringify(out, null, 2));
console.log(`Wrote public/knowledge.json with ${docs.length} docs`);
