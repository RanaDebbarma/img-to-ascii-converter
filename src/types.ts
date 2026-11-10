export type RenderMode = "braille" | "ascii";

export interface ConvertOptions {
  /**
   * Target width in characters (default: 120).
   */
  width?: number;
  /**
   * Rendering mode: "braille" (2x4 Unicode dot matrix) or "ascii" (classic character ramp).
   * Default: "braille".
   */
  mode?: RenderMode;
  /**
   * Brightness cutoff threshold between 0 and 255 for Braille mode (default: 128).
   */
  threshold?: number;
  /**
   * Invert light and dark pixels (default: false).
   */
  invert?: boolean;
  /**
   * Apply Floyd-Steinberg error diffusion dithering for smooth shading gradients (default: false).
   */
  dither?: boolean;
  /**
   * Enable 24-bit Truecolor ANSI color codes for terminal rendering (default: false).
   */
  color?: boolean;
  /**
   * Custom ASCII character ramp for "ascii" mode (from darkest to brightest).
   * Default: " .:-=+*#%@"
   */
  ramp?: string;
}

