import fs from "fs/promises";
import path from "path";

const regexes = [
/import\s+{ *getCustomStaticPath *}\s+from\s+['"]@\/utils\/getCustomStaticPath['"];\s*/g,
/export\s+const\s+meta\s*=\s*\{[\s\S]*?\};\s*/g,
/export\s+const\s+getStaticPaths\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\};\s*/g,
/export\s+function\s+getStaticProps\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/g,
/\s*title="[^"]*"/g,
/\s*showLineNumbers=\{(?:true|false)\}/g,
/\{\s*\};\s*/g
];

async function getFiles(dir) {
  let files = [];
  let entries = await fs.readdir(dir, { withFileTypes: true });
  for (let entry of entries) {
    let fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      let subFiles = await getFiles(fullPath);
      files = files.concat(subFiles);
    } else if (entry.isFile() && !["cleaner.js", "package.json", ".gitignore"].includes(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function processFile(file) {
  let content = await fs.readFile(file, "utf8");
  let newContent = content;
  for (let regex of regexes) {
    newContent = newContent.replace(regex, "");
  }
  if (newContent !== content) {
    await fs.writeFile(file, newContent, "utf8");
  }
}

async function main() {
  let cwd = process.cwd();
  let files = await getFiles(cwd);
  for (let file of files) {
    await processFile(file);
  }
}

await main();