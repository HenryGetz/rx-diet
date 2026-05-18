#!/usr/bin/env node
import { Command } from 'commander';
import { dehydrateFile } from '../dehydrate/index.js';
import { rehydrateFile } from '../rehydrate/index.js';
import { detectOperation, derivePaths, readStdin, writeTextFile } from '../utils/file.js';
import { getPrompt } from './prompt.js';
import { lintRxResumeMd } from './lint.js';
import { fixRxResumeMd } from './fix.js';
import type { DehydrateResult } from '../dehydrate/types.js';
import type { RehydrateResult } from '../rehydrate/index.js';

interface CliOptions {
  output?: string;
  base?: string;
  inPlace?: boolean;
  backup?: boolean;
  diff?: boolean;
  dryRun?: boolean;
  confirm?: boolean;
  prompt?: boolean;
  lint?: boolean;
  fix?: boolean;
  jsonErrors?: boolean;
}

const program = new Command();

program
  .name('rx-diet')
  .description(
    'Token-efficient bidirectional bridge between Reactive Resume JSON and specialized Markdown',
  )
  .version('1.0.0')
  .argument(
    '[inputs...]',
    'Input file(s) (.json to dehydrate, .rxresume.md to rehydrate, or - for stdin)',
  )
  .option('-o, --output <path>', 'Override default output path')
  .option('-b, --base <path>', 'Override base JSON lookup (rehydrate only)')
  .option('--in-place', 'Overwrite the base JSON on rehydrate')
  .option('--backup', 'Pair with --in-place; writes .json.bak backup')
  .option('--diff', 'Show semantic diff, write nothing, exit 0 (no changes) / 1 (changes) / 2 (error)')
  .option('--dry-run', 'Run full pipeline, print result to stdout, write nothing')
  .option('--confirm', 'Required when fuzzy-match identity resolution is used')
  .option('--prompt', 'Print the recommended LLM system prompt to stdout')
  .option('--lint', 'Validate .rxresume.md format without rehydrating')
  .option('--fix', 'Auto-fix common .rxresume.md formatting issues')
  .option('--json-errors', 'Emit errors as structured JSON to stderr')
  .action(async (inputs: string[], options: CliOptions) => {
    if (options.prompt) {
      console.log(getPrompt());
      return;
    }

    if (!inputs || inputs.length === 0) {
      console.error('Error: no input files specified');
      process.exit(1);
    }

    if (options.lint && !options.fix) {
      let hasErrors = false;
      for (const input of inputs) {
        try {
          const result = await lintRxResumeMd(input);
          if (result.errors.length === 0) {
            console.error(`\u2713 ${input}: format is valid`);
          } else {
            hasErrors = true;
            console.error(`\u2717 ${input}: ${result.errors.length} issue(s) found`);
            for (const err of result.errors) {
              console.error(`  ${err.type}: ${err.message}`);
              if (err.line) console.error(`    at line ${err.line}: ${err.context}`);
              if (err.fix) console.error(`    Fix: ${err.fix}`);
            }
          }
        } catch (error) {
          hasErrors = true;
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`\u2717 ${input}: ${msg}`);
        }
      }
      process.exit(hasErrors ? 1 : 0);
    }

    if (options.fix) {
      let anyFixed = false;
      for (const input of inputs) {
        try {
          const result = await fixRxResumeMd(input);
          if (result.fixed.length === 0 && result.unfixed.length === 0) {
            console.error(`${input}: nothing to fix`);
          } else {
            for (const f of result.fixed) console.error(`${input}: fixed — ${f}`);
            for (const u of result.unfixed) console.error(`${input}: unfixed — ${u}`);
            anyFixed = true;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`${input}: error — ${msg}`);
        }
      }
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const input of inputs) {
      try {
        await processFile(input, options);
        successCount++;
      } catch (error) {
        failCount++;
        handleError(error, options.jsonErrors);
      }
    }

    if (inputs.length > 1) {
      console.error(`\nProcessed: ${successCount} succeeded, ${failCount} failed`);
    }

    process.exit(failCount > 0 ? 1 : 0);
  });

program.parse();

// ─── File Processing ─────────────────────────────────────────────────────

async function processFile(input: string, options: CliOptions): Promise<void> {
  if (input === '-') {
    await processStdin(options);
    return;
  }

  const operation = detectOperation(input);

  if (operation === 'dehydrate') {
    await processDehydrate(input, options);
  } else {
    await processRehydrate(input, options);
  }
}

async function processStdin(options: CliOptions): Promise<void> {
  const content = await readStdin();

  const isRehydrate = !!options.base;
  const ext = isRehydrate ? 'rxresume.md' : 'json';
  const tmpFile = `/tmp/rx-diet-stdin-${Date.now()}.${ext}`;

  try {
    await writeTextFile(tmpFile, content);

    if (isRehydrate) {
      await rehydrateFile(tmpFile, {
        base: options.base,
        output: options.output,
        inPlace: options.inPlace,
        backup: options.backup,
        dryRun: options.dryRun,
        diff: options.diff,
        confirm: options.confirm,
      });
    } else {
      await dehydrateFile(tmpFile, {
        output: options.output,
      });
    }
  } finally {
    const { unlink } = await import('node:fs/promises');
    await unlink(tmpFile).catch(() => {});
  }
}

async function processDehydrate(input: string, options: CliOptions): Promise<void> {
  const result: DehydrateResult = await dehydrateFile(input, {
    output: options.output,
  });

  const outputPath = options.output ?? derivePaths(input).md;
  console.error(`rx-diet: ${input} → ${outputPath}${result.assetCount > 0 ? ` (${result.assetCount} assets stripped)` : ''}`);
}

async function processRehydrate(input: string, options: CliOptions): Promise<void> {
  const result: RehydrateResult = await rehydrateFile(input, {
    base: options.base,
    output: options.output,
    inPlace: options.inPlace,
    backup: options.backup,
    dryRun: options.dryRun,
    diff: options.diff,
    confirm: options.confirm,
  });

  if (options.diff || options.dryRun) return;

  const outputPath = options.output ?? derivePaths(input).base.replace(/\.json$/, '_updated.json');
  const status = [];
  if (result.fuzzyMatches > 0) status.push(`${result.fuzzyMatches} fuzzy`);
  if (result.newEntries > 0) status.push(`${result.newEntries} new`);
  status.push(`${result.changes.filter(c => c.type === 'modified').length} modified`);
  status.push(`${result.changes.filter(c => c.type === 'removed').length} removed`);
  console.error(`rx-diet: ${input} → ${outputPath} (${status.join(', ')})`);

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.error(`  ⚠ ${w}`);
    }
  }
}

function handleError(error: unknown, jsonErrors: boolean | undefined): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (jsonErrors) {
    const structured = {
      error: detectErrorType(err),
      message: err.message,
      suggestion: getSuggestion(err),
    };
    process.stderr.write(JSON.stringify(structured) + '\n');
  } else {
    console.error(`Error: ${err.message}`);
  }
}

function detectErrorType(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes('validation') || msg.includes('schema')) return 'schema_validation_failed';
  if (msg.includes('version mismatch')) return 'version_mismatch';
  if (msg.includes('fuzzy match') && msg.includes('confirm')) return 'fuzzy_match_unconfirmed';
  if (msg.includes('enoent') || msg.includes('not found') || msg.includes('failed to read')) return 'file_not_found';
  if (msg.includes('parse') || msg.includes('yaml') || msg.includes('json')) return 'parse_error';
  return 'processing_failed';
}

function getSuggestion(err: Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes('validation')) return 'Check the input file against the Reactive Resume V5 schema.';
  if (msg.includes('version mismatch')) return 'Re-dehydrate from the original JSON to update the grammar version.';
  if (msg.includes('fuzzy match')) return 'Re-run with --confirm to accept fuzzy matches, or add explicit <!-- id:UUID --> comments to entries.';
  if (msg.includes('not found')) return 'Ensure the input file exists and the path is correct.';
  return 'Check the file format and try again.';
}
