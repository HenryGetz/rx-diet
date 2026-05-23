import { readTextFile, writeTextFile } from "../utils/file.js";
import { GRAMMAR_VERSION } from "../schema/v5/index.js";
export async function fixRxResumeMd(path, dryRun = false) {
    const fixed = [];
    const unfixed = [];
    let content;
    try {
        content = await readTextFile(path);
    }
    catch (e) {
        return { fixed, unfixed: [`Cannot read file: ${e instanceof Error ? e.message : String(e)}`], content: "" };
    }
    // ── Whitespace fixes ─────────────────────────────────────────────
    let prev = content;
    content = content.replace(/[ \t]+$/gm, "");
    if (content !== prev)
        fixed.push("Stripped trailing whitespace");
    prev = content;
    content = content.replace(/\n{3,}/g, "\n\n");
    if (content !== prev)
        fixed.push("Collapsed multiple blank lines");
    prev = content;
    content = content.replace(/^(\s*[-*+])\s{2,}/gm, "$1 ");
    if (content !== prev)
        fixed.push("Normalized bullet spacing");
    // ── Pipe-delimited heading fixes ─────────────────────────────────
    // Fix pipe-delimited headings: normalize "### a | b | c" spacing
    prev = content;
    content = content.replace(/^(###\s+.+?)\s*\|\s*/gm, (_, heading) => heading + " | ");
    content = content.replace(/\|\s+/g, "| ");
    if (content !== prev)
        fixed.push("Normalized pipe-delimited heading spacing");
    // Fix headings with 3+ pipe-delimited parts that have "|" directly against text
    prev = content;
    content = content.replace(/^(###\s+.+?)\|(.+)$/gm, "$1 | $2");
    if (content !== prev)
        fixed.push("Normalized pipe spacing in headings");
    // ── Frontmatter extraction ───────────────────────────────────────
    const fmStart = content.startsWith("---\n") ? 0 : -1;
    const fmEnd = fmStart === 0 ? content.indexOf("\n---\n", 4) : -1;
    if (fmStart !== 0) {
        unfixed.push("No frontmatter found. Run: rx-diet original.json to regenerate");
        return { fixed, unfixed, content };
    }
    let frontmatterRaw;
    let body;
    if (fmEnd !== -1) {
        frontmatterRaw = content.slice(4, fmEnd);
        body = content.slice(fmEnd + 5);
    }
    else {
        const bodyStart = content.search(/\n(?=# )/);
        if (bodyStart === -1) {
            unfixed.push("Cannot locate body after frontmatter");
            return { fixed, unfixed, content };
        }
        frontmatterRaw = content.slice(4, bodyStart);
        body = content.slice(bodyStart + 1);
        fixed.push("Added missing closing --- to frontmatter");
    }
    // ── Frontmatter key typo fixes ───────────────────────────────────
    const FM_KEY_FIXES = {
        "rx diet version": "rx_diet_version",
        "rx_diet_verison": "rx_diet_version",
        "rx_diet_verson": "rx_diet_version",
        "rx resume schema": "rxresume_schema",
        "rxresume schema": "rxresume_schema",
        "rx_resume_schema": "rxresume_schema",
        "rx resume_schema": "rxresume_schema",
    };
    let fmChanged = false;
    for (const [typo, correct] of Object.entries(FM_KEY_FIXES)) {
        const escaped = typo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`^${escaped}(?=\\s*:)`, "gm");
        let match;
        while ((match = regex.exec(frontmatterRaw)) !== null) {
            frontmatterRaw = frontmatterRaw.slice(0, match.index) + correct + frontmatterRaw.slice(match.index + match[0].length);
            fmChanged = true;
        }
    }
    if (fmChanged) {
        content = `---\n${frontmatterRaw}\n---\n\n${body}`;
        fixed.push("Fixed frontmatter key typos");
    }
    // ── Frontmatter validation ───────────────────────────────────────
    let fm = {};
    let fmValid = true;
    try {
        const yaml = await import("js-yaml");
        const parsed = yaml.load(frontmatterRaw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            fm = parsed;
        }
    }
    catch {
        fmValid = false;
    }
    if (!fmValid || !fm.rx_diet_version || !fm.rxresume_schema) {
        const source = typeof fm.source === "string" ? fm.source : "resume.json";
        const yamlModule = await import("js-yaml");
        const newFm = { rx_diet_version: GRAMMAR_VERSION, rxresume_schema: "v5", source, generated: new Date().toISOString().split("T")[0] };
        const dumped = yamlModule.dump(newFm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).replace(/\n*$/, "");
        content = `---\n${dumped}\n---\n\n${body.trimStart()}`;
        fixed.push("Regenerated frontmatter");
    }
    else {
        let changed = false;
        if (Number(fm.rx_diet_version) !== GRAMMAR_VERSION) {
            fm.rx_diet_version = GRAMMAR_VERSION;
            changed = true;
        }
        if (fm.rxresume_schema !== "v5") {
            fm.rxresume_schema = "v5";
            changed = true;
        }
        if (!fm.generated) {
            fm.generated = new Date().toISOString().split("T")[0];
            changed = true;
        }
        if (!fm.source) {
            fm.source = "resume.json";
            changed = true;
        }
        if (changed) {
            const yamlModule = await import("js-yaml");
            const dumped = yamlModule.dump(fm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).replace(/\n*$/, "");
            content = `---\n${dumped}\n---\n\n${body.trimStart()}`;
            fixed.push("Updated frontmatter fields");
        }
    }
    // ── Placeholder identity comments for entries missing them ───────
    prev = content;
    let idCount = 0;
    content = content.replace(/^(### .+)\n(?!<!--\s*id:)/gm, (match, heading) => {
        idCount++;
        return `${heading}\n<!-- id:MISSING_${idCount} -->`;
    });
    if (idCount > 0)
        fixed.push(`Added ${idCount} placeholder identity comments (<!-- id:MISSING -->) — replace with real UUIDs from base JSON`);
    // ── Final checks ─────────────────────────────────────────────────
    if (!content.match(/^# /m)) {
        unfixed.push("No H1 heading — add '# Your Name' after frontmatter");
    }
    if (!content.endsWith("\n"))
        content += "\n";
    if (!dryRun) {
        await writeTextFile(path, content);
    }
    return { fixed, unfixed, content };
}
//# sourceMappingURL=fix.js.map