/**
 * Modern CLI UI components
 * Uses third-party libraries for cross-platform compatibility
 */

import figures from 'figures';
import stripAnsiLib from 'strip-ansi';
import ansiEscapes from 'ansi-escapes';
import boxen from 'boxen';
import cliProgress from 'cli-progress';

// ANSI color codes - kept as raw strings for template literal composition
const ESC = '\x1b';
const CSI = `${ESC}[`;

export const colors = {
  // Reset
  reset: `${CSI}0m`,

  // Styles
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,

  // Foreground colors
  black: `${CSI}30m`,
  red: `${CSI}31m`,
  green: `${CSI}32m`,
  yellow: `${CSI}33m`,
  blue: `${CSI}34m`,
  magenta: `${CSI}35m`,
  cyan: `${CSI}36m`,
  white: `${CSI}37m`,
  gray: `${CSI}90m`,

  // Bright foreground
  brightRed: `${CSI}91m`,
  brightGreen: `${CSI}92m`,
  brightYellow: `${CSI}93m`,
  brightBlue: `${CSI}94m`,
  brightMagenta: `${CSI}95m`,
  brightCyan: `${CSI}96m`,
  brightWhite: `${CSI}97m`,

  // Background colors
  bgBlack: `${CSI}40m`,
  bgRed: `${CSI}41m`,
  bgGreen: `${CSI}42m`,
  bgYellow: `${CSI}43m`,
  bgBlue: `${CSI}44m`,
  bgMagenta: `${CSI}45m`,
  bgCyan: `${CSI}46m`,
  bgWhite: `${CSI}47m`,
  bgGray: `${CSI}100m`,
};

// Shorthand
const c = colors;

// Unicode symbols - using figures for cross-platform compatibility
export const symbols = {
  // Status
  success: figures.tick,
  error: figures.cross,
  warning: figures.warning,
  info: figures.bullet, // Using bullet (●) instead of figures.info (ℹ) to match original

  // Arrows
  arrowRight: figures.arrowRight,
  arrowLeft: figures.arrowLeft,
  arrowUp: figures.arrowUp,
  arrowDown: figures.arrowDown,

  // Shapes
  bullet: figures.bullet,
  dot: '·', // figures.dot is different (․)
  ellipsis: figures.ellipsis,

  // Box drawing (using figures' line drawing characters)
  boxTopLeft: figures.lineDownRightArc,
  boxTopRight: figures.lineDownLeftArc,
  boxBottomLeft: figures.lineUpRightArc,
  boxBottomRight: figures.lineUpLeftArc,
  boxHorizontal: figures.line,
  boxVertical: figures.lineVertical,

  // Spinners (not in figures, keep custom)
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],

  // Misc
  pointer: figures.pointer,
  check: figures.tick,
  cross: figures.cross,
  star: figures.star,
  heart: figures.heart,
  play: figures.play,
  square: figures.squareCenter,
  squareSmall: figures.squareSmallFilled,
  circle: figures.bullet,
  circleFilled: figures.circleFilled,
  circleEmpty: figures.circle,

  // File types (emojis, not in figures)
  file: '📄',
  folder: '📁',
  image: '🖼',
  pdf: '📑',
};

/**
 * Strip ANSI codes from string
 */
export const stripAnsi = stripAnsiLib;

/**
 * Style text with color codes
 */
export function style(text, ...styles) {
  const codes = styles.join('');
  return `${codes}${text}${c.reset}`;
}

/**
 * Create a styled box around text (using boxen)
 */
export function box(content, options = {}) {
  const {
    padding = 1,
    title = null,
    titleColor = c.cyan,
  } = options;

  // Build boxen options
  const boxenOptions = {
    padding,
    borderStyle: 'round',
    dimBorder: true,
  };

  // Add title if provided
  if (title) {
    boxenOptions.title = `${titleColor}${title}${c.reset}`;
    boxenOptions.titleAlignment = 'center';
  }

  return boxen(content, boxenOptions);
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text, maxLen) {
  const stripped = stripAnsi(text);
  if (stripped.length <= maxLen) return text;
  return stripped.slice(0, maxLen - 1) + symbols.ellipsis;
}

/**
 * Create a progress bar (using cli-progress Format)
 */
export function progressBar(current, total, options = {}) {
  const {
    width = 30,
    complete = '█',
    incomplete = '░',
    showPercent = true,
    showCount = false,
    color = c.cyan,
  } = options;

  const progress = total > 0 ? current / total : 0;
  const percent = Math.round(progress * 100);

  // Use cli-progress's BarFormat for the bar string
  const barString = cliProgress.Format.BarFormat(progress, {
    barsize: width,
    barCompleteString: complete.repeat(width),
    barIncompleteString: incomplete.repeat(width),
    barGlue: '',
  });

  // Apply colors to the bar
  const filledLen = Math.round(progress * width);
  const coloredBar = `${color}${barString.slice(0, filledLen)}${c.dim}${barString.slice(filledLen)}${c.reset}`;

  let result = coloredBar;

  if (showPercent) {
    result += ` ${c.dim}${percent}%${c.reset}`;
  }

  if (showCount) {
    result += ` ${c.dim}(${current}/${total})${c.reset}`;
  }

  return result;
}

/**
 * Format a key-value pair for display
 */
export function keyValue(key, value, options = {}) {
  const {
    keyWidth = 12,
    keyColor = c.dim,
    valueColor = c.reset,
    separator = '',
  } = options;

  const paddedKey = key.padEnd(keyWidth);
  return `${keyColor}${paddedKey}${c.reset}${separator}${valueColor}${value}${c.reset}`;
}

/**
 * Create a table from data
 */
export function table(data, options = {}) {
  const {
    headers = null,
    padding = 2,
    headerColor = c.bold + c.cyan,
    borderColor = c.dim,
  } = options;

  if (data.length === 0) return '';

  // Calculate column widths
  const columns = Object.keys(data[0]);
  const widths = {};

  for (const col of columns) {
    const headerLen = headers?.[col]?.length || col.length;
    const maxDataLen = Math.max(...data.map(row => String(row[col] ?? '').length));
    widths[col] = Math.max(headerLen, maxDataLen);
  }

  const lines = [];

  // Header
  if (headers) {
    const headerLine = columns
      .map(col => `${headerColor}${(headers[col] || col).padEnd(widths[col])}${c.reset}`)
      .join(' '.repeat(padding));
    lines.push(headerLine);

    // Separator
    const separator = columns
      .map(col => `${borderColor}${symbols.boxHorizontal.repeat(widths[col])}${c.reset}`)
      .join(' '.repeat(padding));
    lines.push(separator);
  }

  // Rows
  for (const row of data) {
    const rowLine = columns
      .map(col => String(row[col] ?? '').padEnd(widths[col]))
      .join(' '.repeat(padding));
    lines.push(rowLine);
  }

  return lines.join('\n');
}

/**
 * Format a header/banner
 */
export function header(title, subtitle = null) {
  const lines = [];
  lines.push('');
  lines.push(`  ${c.bold}${c.cyan}${title}${c.reset}${subtitle ? ` ${c.dim}${subtitle}${c.reset}` : ''}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Format a section header
 */
export function section(title) {
  return `\n${c.bold}${c.white}${title}${c.reset}\n`;
}

/**
 * Format a divider line
 */
export function divider(width = 50) {
  return `${c.dim}${symbols.boxHorizontal.repeat(width)}${c.reset}`;
}

/**
 * Format a list item
 */
export function listItem(text, options = {}) {
  const { indent = 2, bullet = symbols.bullet, bulletColor = c.dim } = options;
  return `${' '.repeat(indent)}${bulletColor}${bullet}${c.reset} ${text}`;
}

/**
 * Format file info
 */
export function fileInfo(filename, options = {}) {
  const { showIcon = true, color = c.white } = options;
  const ext = filename.split('.').pop()?.toLowerCase();

  let icon = symbols.file;
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif'].includes(ext)) {
    icon = symbols.image;
  } else if (ext === 'pdf') {
    icon = symbols.pdf;
  }

  return showIcon ? `${icon}  ${color}${filename}${c.reset}` : `${color}${filename}${c.reset}`;
}

/**
 * Format a status badge
 */
export function badge(text, type = 'default') {
  const styles = {
    default: { bg: c.bgGray, fg: c.white },
    success: { bg: c.bgGreen, fg: c.black },
    error: { bg: c.bgRed, fg: c.white },
    warning: { bg: c.bgYellow, fg: c.black },
    info: { bg: c.bgBlue, fg: c.white },
    primary: { bg: c.bgCyan, fg: c.black },
  };

  const s = styles[type] || styles.default;
  return `${s.bg}${s.fg}${c.bold} ${text} ${c.reset}`;
}

/**
 * Format timestamp
 */
export function timestamp() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${c.dim}${time}${c.reset}`;
}

// Cursor and terminal control - using ansi-escapes

/**
 * Clear the current line
 */
export function clearLine() {
  process.stdout.write(ansiEscapes.eraseLine);
}

/**
 * Move cursor up n lines
 */
export function cursorUp(n = 1) {
  process.stdout.write(ansiEscapes.cursorUp(n));
}

/**
 * Move cursor down n lines
 */
export function cursorDown(n = 1) {
  process.stdout.write(ansiEscapes.cursorDown(n));
}

/**
 * Save cursor position
 */
export function saveCursor() {
  process.stdout.write(ansiEscapes.cursorSavePosition);
}

/**
 * Restore cursor position
 */
export function restoreCursor() {
  process.stdout.write(ansiEscapes.cursorRestorePosition);
}

/**
 * Hide cursor
 */
export function hideCursor() {
  process.stdout.write(ansiEscapes.cursorHide);
}

/**
 * Show cursor
 */
export function showCursor() {
  process.stdout.write(ansiEscapes.cursorShow);
}

/**
 * Get terminal dimensions
 */
export function getTerminalSize() {
  return {
    rows: process.stdout.rows || 24,
    cols: process.stdout.columns || 80,
  };
}

/**
 * Move cursor to specific row and column (1-indexed)
 */
export function moveTo(row, col = 1) {
  // ansi-escapes.cursorTo uses 0-indexed (x, y), we use 1-indexed (row, col)
  process.stdout.write(ansiEscapes.cursorTo(col - 1, row - 1));
}

/**
 * Set scroll region (1-indexed, inclusive)
 */
export function setScrollRegion(top, bottom) {
  process.stdout.write(`\x1b[${top};${bottom}r`);
}

/**
 * Reset scroll region to full terminal
 */
export function resetScrollRegion() {
  process.stdout.write('\x1b[r');
}

// Export default object for convenience
export default {
  colors,
  symbols,
  style,
  box,
  stripAnsi,
  truncate,
  progressBar,
  keyValue,
  table,
  header,
  section,
  divider,
  listItem,
  fileInfo,
  badge,
  timestamp,
  clearLine,
  cursorUp,
  cursorDown,
  saveCursor,
  restoreCursor,
  hideCursor,
  showCursor,
  getTerminalSize,
  moveTo,
  setScrollRegion,
  resetScrollRegion,
};
