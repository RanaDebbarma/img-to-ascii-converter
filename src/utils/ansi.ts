/**
 * Strips ANSI color and formatting escape codes from a string.
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Wraps text with 24-bit RGB Truecolor escape codes.
 */
export function rgbColor(r: number, g: number, b: number, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

// Styling helpers for compact CLI prompts
export const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
export const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;
export const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;
export const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
export const red = (text: string) => `\x1b[31m${text}\x1b[0m`;

