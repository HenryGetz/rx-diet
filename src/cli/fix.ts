import { readTextFile, writeTextFile } from "../utils/file.js";
import { GRAMMAR_VERSION } from "../schema/v5/index.js";

export interface FixResult {
  fixed: string[];
  unfixed: string[];
  content: string;
}

export async function fixRxResumeMd(path: string): Promise<FixResult> {
  const fixed: string[] = [];
  const unfixed: string[] = [];

  let content: string;
  try {
    content = await readTextFile(path);
  } catch (e) {
    return { fixed, unfixed: [`Cannot read file: ${e instanceof Error ? e.message : String(e)}`], content: "" };
  }

  let prev = content;
  content = content.replace(/[ \t]+$/gm, "");
  if (content !== prev) fixed.push("Stripped trailing whitespace");

  prev = content;
  content = content.replace(/\n{3,}/g, "\n\n");
  if (content !== prev) fixed.push("Collapsed multiple blank lines");

  prev = content;
  content = content.replace(/^(\s*[-*+])\s{2,}/gm, "$1 ");
  if (content !== prev) fixed.push("Normalized bullet spacing");

  const fmStart = content.startsWith("---\n") ? 0 : -1;
  const fmEnd = fmStart === 0 ? content.indexOf("\n---\n", 4) : -1;

  if (fmStart !== 0) {
    unfixed.push("No frontmatter found. Run: rx-diet original.json to regenerate");
    return { fixed, unfixed, content };
  }

  let frontmatterRaw: string;
  let body: string;

  if (fmEnd !== -1) {
    frontmatterRaw = content.slice(4, fmEnd);
    body = content.slice(fmEnd + 5);
  } else {
    const bodyStart = content.search(/\n(?=# )/);
    if (bodyStart === -1) {
      unfixed.push("Cannot locate body after frontmatter");
      return { fixed, unfixed, content };
    }
    frontmatterRaw = content.slice(4, bodyStart);
    body = content.slice(bodyStart + 1);
    fixed.push("Added missing closing --- to frontmatter");
  }

  let fm: Record<string, unknown> = {};
  let fmValid = true;
  try {
    const yaml = await import("js-yaml");
    const parsed = yaml.load(frontmatterRaw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      fm = parsed as Record<string, unknown>;
    }
  } catch {
    fmValid = false;
  }

  if (!fmValid || !fm.rx_diet_version || !fm.rxresume_schema) {
    const source = typeof fm.source === "string" ? fm.source : "resume.json";
    const yamlModule = await import("js-yaml");
    const newFm = { rx_diet_version: GRAMMAR_VERSION, rxresume_schema: "v5", source, generated: new Date().toISOString().split("T")[0] };
    const dumped = yamlModule.dump(newFm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).replace(/\n*$/, "");
    content = `---\n${dumped}\n---\n\n${body.trimStart()}`;
    fixed.push("Regenerated frontmatter");
  } else {
    let changed = false;
    if (Number(fm.rx_diet_version) !== GRAMMAR_VERSION) { fm.rx_diet_version = GRAMMAR_VERSION; changed = true; }
    if (fm.rxresume_schema !== "v5") { fm.rxresume_schema = "v5"; changed = true; }
    if (!fm.generated) { fm.generated = new Date().toISOString().split("T")[0]; changed = true; }
    if (!fm.source) { fm.source = "resume.json"; changed = true; }
    if (changed) {
      const yamlModule = await import("js-yaml");
      const dumped = yamlModule.dump(fm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).replace(/\n*$/, "");
      content = `---\n${dumped}\n---\n\n${body.trimStart()}`;
      fixed.push("Updated frontmatter fields");
    }
  }

  if (!content.match(/^# /m)) {
    unfixed.push("No H1 heading — add '# Your Name' after frontmatter");
  }

  if (!content.endsWith("\n")) content += "\n";

  await writeTextFile(path, content);
  return { fixed, unfixed, content };
}
