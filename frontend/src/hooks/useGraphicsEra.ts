/**
 * Hook to read the current graphics era from the document body class.
 * Returns '1990s', '2000s', or '2026s'.
 * All renderers should use this to apply era-appropriate styling.
 */
export function useGraphicsEra(): '1990s' | '2000s' | '2026s' {
  const classList = document.body.classList;
  if (classList.contains('era-2000s')) return '2000s';
  if (classList.contains('era-2026s')) return '2026s';
  return '1990s';
}
