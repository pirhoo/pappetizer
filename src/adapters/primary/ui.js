/**
 * Modern CLI UI components inspired by Claude CLI
 */

// ANSI escape codes
const ESC = '\x1b';
const CSI = `${ESC}[`;

// Colors
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

// Unicode symbols
export const symbols = {
  // Status
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: '●',

  // Arrows
  arrowRight: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',

  // Shapes
  bullet: '•',
  dot: '·',
  ellipsis: '…',

  // Box drawing
  boxTopLeft: '╭',
  boxTopRight: '╮',
  boxBottomLeft: '╰',
  boxBottomRight: '╯',
  boxHorizontal: '─',
  boxVertical: '│',

  // Spinners
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],

  // Misc
  pointer: '❯',
  check: '✔',
  cross: '✖',
  star: '★',
  heart: '♥',
  play: '▶',
  square: '■',
  squareSmall: '◼',
  circle: '●',
  circleFilled: '◉',
  circleEmpty: '○',

  // File types
  file: '📄',
  folder: '📁',
  image: '🖼',
  pdf: '📑',
};

/**
 * Style text with color codes
 */
export function style(text, ...styles) {
  const codes = styles.join('');
  return `${codes}${text}${c.reset}`;
}

/**
 * Create a styled box around text
 */
export function box(content, options = {}) {
  const {
    padding = 1,
    borderColor = c.dim,
    title = null,
    titleColor = c.cyan,
    width = null,
  } = options;

  const lines = content.split('\n');
  const maxLen = width || Math.max(...lines.map(l => stripAnsi(l).length));
  const innerWidth = maxLen + padding * 2;

  const horizontal = symbols.boxHorizontal.repeat(innerWidth);
  const paddingStr = ' '.repeat(padding);

  const result = [];

  // Top border with optional title
  if (title) {
    const titleText = ` ${title} `;
    const titleLen = stripAnsi(titleText).length;
    const leftPad = Math.floor((innerWidth - titleLen) / 2);
    const rightPad = innerWidth - titleLen - leftPad;
    result.push(
      `${borderColor}${symbols.boxTopLeft}${symbols.boxHorizontal.repeat(leftPad)}${c.reset}${titleColor}${titleText}${c.reset}${borderColor}${symbols.boxHorizontal.repeat(rightPad)}${symbols.boxTopRight}${c.reset}`,
    );
  } else {
    result.push(`${borderColor}${symbols.boxTopLeft}${horizontal}${symbols.boxTopRight}${c.reset}`);
  }

  // Content lines
  for (const line of lines) {
    const lineLen = stripAnsi(line).length;
    const rightPad = maxLen - lineLen;
    result.push(
      `${borderColor}${symbols.boxVertical}${c.reset}${paddingStr}${line}${' '.repeat(rightPad)}${paddingStr}${borderColor}${symbols.boxVertical}${c.reset}`,
    );
  }

  // Bottom border
  result.push(`${borderColor}${symbols.boxBottomLeft}${horizontal}${symbols.boxBottomRight}${c.reset}`);

  return result.join('\n');
}

/**
 * Strip ANSI codes from string
 */
export function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
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
 * Create a spinner instance
 */
export function createSpinner(text = '') {
  let frameIndex = 0;
  let interval = null;
  let currentText = text;

  const render = () => {
    const frame = symbols.spinner[frameIndex];
    process.stdout.write(`\r  ${c.cyan}${frame}${c.reset} ${currentText}`);
    frameIndex = (frameIndex + 1) % symbols.spinner.length;
  };

  return {
    start(newText) {
      if (newText) currentText = newText;
      if (interval) return;
      interval = setInterval(render, 80);
      render();
    },

    update(newText) {
      currentText = newText;
    },

    stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      process.stdout.write('\r' + ' '.repeat(stripAnsi(currentText).length + 6) + '\r');
    },

    success(newText) {
      this.stop();
      console.log(`${c.green}${symbols.success}${c.reset} ${newText || currentText}`);
    },

    fail(newText) {
      this.stop();
      console.log(`${c.red}${symbols.error}${c.reset} ${newText || currentText}`);
    },

    warn(newText) {
      this.stop();
      console.log(`${c.yellow}${symbols.warning}${c.reset} ${newText || currentText}`);
    },

    info(newText) {
      this.stop();
      console.log(`${c.blue}${symbols.info}${c.reset} ${newText || currentText}`);
    },

    /**
     * Show a completed step and continue with new text
     */
    step(completedText, newText) {
      // Clear current line and show completed step
      process.stdout.write('\r' + ' '.repeat(stripAnsi(currentText).length + 6) + '\r');
      console.log(`  ${c.dim}${symbols.success}${c.reset} ${c.dim}${completedText}${c.reset}`);
      // Update text and continue spinning
      if (newText) {
        currentText = newText;
      }
    },
  };
}

/**
 * Create a progress bar
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

  const percent = Math.round((current / total) * 100);
  const filledLen = Math.round((current / total) * width);
  const emptyLen = width - filledLen;

  let bar = `${color}${complete.repeat(filledLen)}${c.dim}${incomplete.repeat(emptyLen)}${c.reset}`;

  if (showPercent) {
    bar += ` ${c.dim}${percent}%${c.reset}`;
  }

  if (showCount) {
    bar += ` ${c.dim}(${current}/${total})${c.reset}`;
  }

  return bar;
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

/**
 * Clear the current line
 */
export function clearLine() {
  process.stdout.write('\r\x1b[K');
}

/**
 * Move cursor up n lines
 */
export function cursorUp(n = 1) {
  process.stdout.write(`\x1b[${n}A`);
}

/**
 * Hide/show cursor
 */
export function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

export function showCursor() {
  process.stdout.write('\x1b[?25h');
}

// Export default object for convenience
export default {
  colors,
  symbols,
  style,
  box,
  stripAnsi,
  truncate,
  createSpinner,
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
  hideCursor,
  showCursor,
};
