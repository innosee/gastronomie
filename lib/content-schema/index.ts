import type { ContentSchema } from './types';
import { kaiserSchema } from './kaiser';

export * from './types';
export { kaiserSchema };

// Registry Template → Schema. Aktuell nur kaiser; haldenhof/sueden/valeron
// folgen als eigene Dateien. Die Zuordnung Org → Template kommt später
// (z. B. über organization.metadata); bis dahin ist kaiser der Default.
export const CONTENT_SCHEMAS: Record<string, ContentSchema> = {
  kaiser: kaiserSchema,
};

export function getContentSchema(template = 'kaiser'): ContentSchema {
  return CONTENT_SCHEMAS[template] ?? kaiserSchema;
}
