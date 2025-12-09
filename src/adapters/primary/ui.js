/**
 * Modern CLI UI components
 * Uses third-party libraries for cross-platform compatibility
 */

import figures from 'figures';
import stripAnsi from 'strip-ansi';
import ansiEscapes from 'ansi-escapes';
import boxen from 'boxen';
import cliProgress from 'cli-progress';
import pc from 'picocolors';

// Re-export picocolors as colors for convenience
// These are functions: colors.cyan('text') instead of `${colors.cyan}text${colors.reset}`
export const colors = pc;

// Shorthand
const c = pc;

// Unicode symbols - using figures for cross-platform compatibility
export const symbols = {
  // Status
  success: figures.tick,
  error: figures.cross,
  warning: figures.warning,
  info: figures.bullet,

  // Arrows
  arrowRight: figures.arrowRight,
  arrowLeft: figures.arrowLeft,
  arrowUp: figures.arrowUp,
  arrowDown: figures.arrowDown,

  // Shapes
  bullet: figures.bullet,
  dot: '·',
  ellipsis: figures.ellipsis,

  // Box drawing
  boxTopLeft: figures.lineDownRightArc,
  boxTopRight: figures.lineDownLeftArc,
  boxBottomLeft: figures.lineUpRightArc,
  boxBottomRight: figures.lineUpLeftArc,
  boxHorizontal: figures.line,
  boxVertical: figures.lineVertical,

  // Spinners
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

  // File types
  file: '📄',
  folder: '📁',
  image: '🖼',
  pdf: '📑',
};

// Re-export stripAnsi
export { stripAnsi };

/**
 * Create a styled box around text (using boxen)
 */
export function box(content, options = {}) {
  const { padding = 1, title = null } = options;

  const boxenOptions = {
    padding,
    borderStyle: 'round',
    dimBorder: true,
  };

  if (title) {
    boxenOptions.title = c.cyan(title);
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
  } = options;

  const progress = total > 0 ? current / total : 0;
  const percent = Math.round(progress * 100);

  const barString = cliProgress.Format.BarFormat(progress, {
    barsize: width,
    barCompleteString: complete.repeat(width),
    barIncompleteString: incomplete.repeat(width),
    barGlue: '',
  });

  const filledLen = Math.round(progress * width);
  const coloredBar = c.cyan(barString.slice(0, filledLen)) + c.dim(barString.slice(filledLen));

  let result = coloredBar;

  if (showPercent) {
    result += ' ' + c.dim(`${percent}%`);
  }

  if (showCount) {
    result += ' ' + c.dim(`(${current}/${total})`);
  }

  return result;
}

/**
 * Format a key-value pair for display
 */
export function keyValue(key, value, options = {}) {
  const { keyWidth = 12, separator = '' } = options;
  const paddedKey = key.padEnd(keyWidth);
  return c.dim(paddedKey) + separator + value;
}

/**
 * Create a table from data
 */
export function table(data, options = {}) {
  const { headers = null, padding = 2 } = options;

  if (data.length === 0) return '';

  const columns = Object.keys(data[0]);
  const widths = {};

  for (const col of columns) {
    const headerLen = headers?.[col]?.length || col.length;
    const maxDataLen = Math.max(...data.map(row => String(row[col] ?? '').length));
    widths[col] = Math.max(headerLen, maxDataLen);
  }

  const lines = [];

  if (headers) {
    const headerLine = columns
      .map(col => c.bold(c.cyan((headers[col] || col).padEnd(widths[col]))))
      .join(' '.repeat(padding));
    lines.push(headerLine);

    const separator = columns
      .map(col => c.dim(symbols.boxHorizontal.repeat(widths[col])))
      .join(' '.repeat(padding));
    lines.push(separator);
  }

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
  const lines = [''];
  lines.push('  ' + c.bold(c.cyan(title)) + (subtitle ? ' ' + c.dim(subtitle) : ''));
  lines.push('');
  return lines.join('\n');
}

/**
 * Format a section header
 */
export function section(title) {
  return '\n' + c.bold(c.white(title)) + '\n';
}

/**
 * Format a divider line
 */
export function divider(width = 50) {
  return c.dim(symbols.boxHorizontal.repeat(width));
}

/**
 * Format a list item
 */
export function listItem(text, options = {}) {
  const { indent = 2, bullet = symbols.bullet } = options;
  return ' '.repeat(indent) + c.dim(bullet) + ' ' + text;
}

/**
 * Format file info
 */
export function fileInfo(filename, options = {}) {
  const { showIcon = true } = options;
  const ext = filename.split('.').pop()?.toLowerCase();

  let icon = symbols.file;
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif'].includes(ext)) {
    icon = symbols.image;
  } else if (ext === 'pdf') {
    icon = symbols.pdf;
  }

  return showIcon ? `${icon}  ${filename}` : filename;
}

/**
 * Format a status badge
 */
export function badge(text, type = 'default') {
  const styles = {
    default: (t) => c.bgBlack(c.white(c.bold(` ${t} `))),
    success: (t) => c.bgGreen(c.black(c.bold(` ${t} `))),
    error: (t) => c.bgRed(c.white(c.bold(` ${t} `))),
    warning: (t) => c.bgYellow(c.black(c.bold(` ${t} `))),
    info: (t) => c.bgBlue(c.white(c.bold(` ${t} `))),
    primary: (t) => c.bgCyan(c.black(c.bold(` ${t} `))),
  };

  const styleFn = styles[type] || styles.default;
  return styleFn(text);
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
  return c.dim(time);
}

// Cursor and terminal control - using ansi-escapes

export function clearLine() {
  process.stdout.write(ansiEscapes.eraseLine);
}

export function cursorUp(n = 1) {
  process.stdout.write(ansiEscapes.cursorUp(n));
}

export function cursorDown(n = 1) {
  process.stdout.write(ansiEscapes.cursorDown(n));
}

export function saveCursor() {
  process.stdout.write(ansiEscapes.cursorSavePosition);
}

export function restoreCursor() {
  process.stdout.write(ansiEscapes.cursorRestorePosition);
}

export function hideCursor() {
  process.stdout.write(ansiEscapes.cursorHide);
}

export function showCursor() {
  process.stdout.write(ansiEscapes.cursorShow);
}

export function getTerminalSize() {
  return {
    rows: process.stdout.rows || 24,
    cols: process.stdout.columns || 80,
  };
}

export function moveTo(row, col = 1) {
  process.stdout.write(ansiEscapes.cursorTo(col - 1, row - 1));
}

export function setScrollRegion(top, bottom) {
  process.stdout.write(`\x1b[${top};${bottom}r`);
}

export function resetScrollRegion() {
  process.stdout.write('\x1b[r');
}

// Export default object for convenience
export default {
  colors,
  symbols,
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
