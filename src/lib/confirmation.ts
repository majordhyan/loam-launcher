// Tolerate casing and accidental surrounding whitespace, not a different name.
export function confirmsGameName(input: string, name: string): boolean {
  return input.trim().length > 0 && input.trim().toLowerCase() === name.trim().toLowerCase();
}
