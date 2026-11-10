/**
 * Cross-platform clipboard helper utilizing native Bun APIs and OS tools,
 * with OSC 52 ANSI escape sequence fallback for terminal multiplexers / SSH.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  let copied = false;

  // 1. Send OSC 52 ANSI escape sequence to stdout.
  // Modern terminals (VS Code, Windows Terminal, iTerm2, WezTerm, Alacritty)
  // intercept this escape sequence to copy directly into the user's OS clipboard.
  try {
    const base64 = Buffer.from(text).toString("base64");
    process.stdout.write(`\x1b]52;c;${base64}\x07`);
    copied = true;
  } catch {
    // Ignore error and continue to native tool
  }

  // 2. Also invoke native system clipboard tool via Bun.spawn
  try {
    if (process.platform === "win32") {
      const proc = Bun.spawn(["clip"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      const code = await proc.exited;
      if (code === 0) copied = true;
    } else if (process.platform === "darwin") {
      const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      const code = await proc.exited;
      if (code === 0) copied = true;
    } else {
      // Linux: wl-copy (Wayland) or xclip (X11)
      const tool = Bun.which("wl-copy") ? "wl-copy" : Bun.which("xclip") ? "xclip" : null;
      if (tool === "wl-copy") {
        const proc = Bun.spawn(["wl-copy"], { stdin: "pipe" });
        proc.stdin.write(text);
        proc.stdin.end();
        const code = await proc.exited;
        if (code === 0) copied = true;
      } else if (tool === "xclip") {
        const proc = Bun.spawn(["xclip", "-selection", "clipboard"], { stdin: "pipe" });
        proc.stdin.write(text);
        proc.stdin.end();
        const code = await proc.exited;
        if (code === 0) copied = true;
      }
    }
  } catch {
    // Suppress native spawn errors if headless or restricted
  }

  return copied;
}

