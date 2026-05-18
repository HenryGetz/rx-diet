import type { Basics, CustomField } from '../../utils/types.js';

/**
 * The schema defines `link` as a required field on CustomField but the
 * TypeScript types in this project omit it.  We access it via a controlled
 * cast to avoid widening the public type.
 */
function getCustomFieldLink(field: CustomField): string | undefined {
  return (field as unknown as Record<string, unknown>).link as string | undefined;
}

function cleanCustomFieldText(text: string): string {
  return text
    .replace(/^github\//, '@')
    .replace(/^linkedin\/in\//, '@')
    .replace(/^twitter\//, '@')
    .replace(/^gitlab\//, '@');
}

export function serializeBasics(basics: Basics): string {
  const parts: string[] = [`# ${basics.name}`];

  if (basics.headline) {
    parts.push(basics.headline);
  }

  const fields: string[] = [];

  if (basics.email) {
    fields.push(`- **Email**: ${basics.email}`);
  }

  if (basics.phone) {
    fields.push(`- **Phone**: ${basics.phone}`);
  }

  if (basics.location) {
    fields.push(`- **Location**: ${basics.location}`);
  }

  if (basics.website?.url) {
    const label = basics.website.label || basics.website.url;
    fields.push(`- **Website**: [${label}](${basics.website.url})`);
  }

  for (const field of basics.customFields) {
    if (!field.text) continue;
    const link = getCustomFieldLink(field);
    const display = cleanCustomFieldText(field.text);
    if (link) {
      fields.push(`- **${display}**: [${link}](${link})`);
    } else {
      fields.push(`- **${display}**`);
    }
  }

  if (fields.length > 0) {
    parts.push(fields.join('\n'));
  }

  return parts.join('\n\n');
}
