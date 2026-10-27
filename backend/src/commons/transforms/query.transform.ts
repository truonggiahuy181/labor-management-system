import type { TransformFnParams } from 'class-transformer';

export function parseBooleanQueryParam({
  obj,
  key,
  value,
}: TransformFnParams): unknown {
  const rawValue = (obj as Record<string, unknown> | undefined)?.[key] ?? value;

  if (rawValue === true || rawValue === 'true') return true;
  if (rawValue === false || rawValue === 'false') return false;
  return rawValue;
}
