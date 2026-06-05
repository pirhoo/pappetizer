<h1 align="center">Pappetizer</h1>
<p align="center"><strong>A CLI tool to automatically rename receipt files by extracting vendor, date, and amount information using OCR and optional AI-powered extraction.</strong></p>

<div align="center">

|      | Status |
| ---: | :--- |
| **CI checks** | [![Github Actions](https://img.shields.io/github/actions/workflow/status/pirhoo/pappetizer/ci.yml?style=flat-square)](https://github.com/pirhoo/pappetizer/actions/workflows/ci.yml) |
| **Latest version** | [![Latest version](https://img.shields.io/npm/v/pappetizer?style=flat-square&color=success)](https://www.npmjs.com/package/pappetizer) |
| **Release date** | [![Release date](https://img.shields.io/github/release-date/pirhoo/pappetizer?style=flat-square&color=success)](https://github.com/pirhoo/pappetizer/releases/latest) |
| **Downloads** | [![Downloads](https://img.shields.io/npm/dm/pappetizer?style=flat-square&color=success)](https://www.npmjs.com/package/pappetizer) |
| **Open issues** | [![Open issues](https://img.shields.io/github/issues/pirhoo/pappetizer?style=flat-square&color=success)](https://github.com/pirhoo/pappetizer/issues/) |

</div>

## ✨ Features

- 📄 **Smart Text Extraction** - Extract text from PDFs (native text or image-based) and images
- 🔍 **OCR Support** - Built-in Tesseract OCR for image-based receipts
- 🤖 **AI-Powered Extraction** - Optional LLM integration for improved accuracy
  - Anthropic (Claude)
  - OpenAI (ChatGPT)
  - Ollama (local models)
- 📝 **Configurable Naming** - Customize date format, separators, and filename templates
- 🔄 **Restore Function** - Revert renamed files to their original names
- 👀 **Watch Mode** - Automatically process new files as they appear
- 🧠 **Memory Feature** - Learns vendor name corrections and applies them automatically
- 📊 **Confidence Scoring** - Shows extraction confidence to help identify uncertain results
- 🌍 **Multi-language** - Support for multiple OCR languages
- 💾 **Manifest Tracking** - Keeps track of all renames for easy restoration

## 📦 Installation

Requires Node.js >= 18. OCR is built in (powered by [tesseract.js](https://github.com/naptha/tesseract.js)) — no system dependencies needed.

```bash
# Install globally
npm install -g pappetizer
```

Or run it directly without installing:

```bash
npx pappetizer clean ~/Documents/receipts
```

### From source

```bash
git clone https://github.com/pirhoo/pappetizer.git
cd pappetizer
npm install
npm link # link globally (optional)
```

## 🚀 Usage

### Configuration

Before processing receipts, you can configure Pappetizer's default behavior using the interactive wizard. This saves your preferences so you don't need to specify them each time.

```bash
pappetizer configure
```

The wizard guides you through setting:
- **Date format** - How dates appear in filenames (YYYYMMDD, YYYY-MM-DD, DD-MM-YYYY, etc.)
- **Filename separator** - Character(s) between name parts (default: ` - `)
- **Filename template** - Structure of the output filename
- **Default currency** - Fallback when currency can't be detected (USD, EUR, CHF, etc.)
- **OCR language** - Language for text recognition (English, German, French, etc.)
- **LLM settings** - AI provider, API keys, and model selection

Configuration is stored in `~/.config/pappetizer/config.json`.

### Basic Commands

#### Process a Directory

Scan a directory for receipt files and rename them based on extracted data:

```bash
pappetizer clean ./receipts
```

For each file, Pappetizer extracts the vendor name, date, and amount, then presents a suggested new filename. You can accept, edit, or skip each suggestion.

#### Process a Single File

Rename just one specific receipt file:

```bash
pappetizer clean ./receipt.pdf
```

Useful when you have a single receipt to process without scanning an entire directory.

#### Preview Changes (Dry Run)

See what would be renamed without actually modifying any files:

```bash
pappetizer clean ./receipts --dry-run
```

This is helpful to verify the extraction quality before committing to changes. The output shows proposed renames but leaves all files untouched.

#### Process Subdirectories

Recursively process all receipt files in nested subdirectories:

```bash
pappetizer clean ./receipts -r
```

Without this flag, only files in the specified directory are processed. Hidden directories (starting with `.`) are always skipped.

#### Auto-Accept All Suggestions

Skip the confirmation prompt and automatically accept all rename suggestions:

```bash
pappetizer clean ./receipts -y
```

Best used after verifying extraction quality with `--dry-run`. Files with low confidence scores will still prompt for review to prevent incorrect renames.

#### Watch Mode

Continuously monitor a directory and automatically process new files as they appear:

```bash
pappetizer clean ./receipts --watch
```

Useful for automating receipt processing. When a new file is added to the directory, Pappetizer detects it and processes it automatically. Press `Ctrl+C` to stop watching.

#### Force Re-processing

Re-process files that have already been renamed by Pappetizer:

```bash
pappetizer clean ./receipts --force
```

By default, Pappetizer tracks renamed files in a manifest and skips them on subsequent runs. Use `--force` to override this and re-extract data from previously processed files.

#### Combine Options

Options can be combined for powerful workflows:

```bash
# Preview recursive processing with auto-accept
pappetizer clean ./receipts -r --dry-run -y

# Watch a directory with recursive processing
pappetizer clean ./receipts -r --watch

# Force re-process with AI extraction
pappetizer clean ./receipts --force --use-llm
```

### Using AI Extraction

AI-powered extraction significantly improves accuracy, especially for receipts with complex layouts or unusual formatting. The LLM analyzes the OCR text and intelligently extracts structured data.

#### Anthropic (Claude)

Use Anthropic's Claude models for extraction:

```bash
pappetizer clean ./receipts --use-llm --llm-provider anthropic --api-key sk-ant-...
```

Available models: `claude-3-haiku` (fastest), `claude-3-5-haiku` (balanced), `claude-3-5-sonnet` (best quality).

#### OpenAI (ChatGPT)

Use OpenAI's GPT models:

```bash
pappetizer clean ./receipts --use-llm --llm-provider openai --api-key sk-...
```

Available models: `gpt-4o-mini` (fastest), `gpt-4o` (balanced), `gpt-4-turbo` (best quality).

#### Ollama (Local)

Run AI extraction locally without sending data to external services:

```bash
pappetizer clean ./receipts --use-llm --llm-provider ollama --model llama3.2
```

Requires Ollama running locally (default: `http://localhost:11434`). Specify a different host with `--ollama-host`.

#### Specifying Models

Override the default model for any provider:

```bash
# Use a specific Claude model
pappetizer clean ./receipts --use-llm --llm-provider anthropic --model claude-3-5-sonnet-20241022

# Use a specific Ollama model
pappetizer clean ./receipts --use-llm --llm-provider ollama --model mistral
```

### Restore Original Names

Pappetizer keeps a manifest of all renames, allowing you to restore files to their original names at any time.

#### Restore a Directory

Restore all renamed files in a directory to their original names:

```bash
pappetizer restore ./receipts
```

For each file, you'll be asked to confirm the restoration. Files not in the manifest (not renamed by Pappetizer) are skipped.

#### Auto-Accept Restoration

Restore all files without confirmation prompts:

```bash
pappetizer restore ./receipts -y
```

#### Preview Restoration

See what would be restored without making changes:

```bash
pappetizer restore ./receipts --dry-run
```

#### Recursive Restoration

Restore files in all subdirectories:

```bash
pappetizer restore ./receipts -r
```

## 📋 Filename Template

The default template is: `{date}{sep}{vendor}{sep}{amount} {currency}{ext}`

Available placeholders:
- `{date}` - Transaction date (formatted according to your date format setting)
- `{vendor}` - Vendor/store name (sanitized and uppercased)
- `{amount}` - Total amount (with 2 decimal places)
- `{currency}` - Currency code (3 letters, e.g., USD, EUR)
- `{sep}` - Configured separator
- `{ext}` - Original file extension (preserved)

**Example outputs:**
- Default: `20240315 - WALMART - 42.99 USD.pdf`
- European date: `15-03-2024 - MIGROS - 23.50 CHF.pdf`
- Custom separator: `2024.03.15_AMAZON_129.00_EUR.pdf`

## 🔧 Environment Variables

Instead of passing API keys on the command line, you can set them as environment variables:

```bash
# For Anthropic/Claude
export ANTHROPIC_API_KEY=sk-ant-...

# For OpenAI/ChatGPT
export OPENAI_API_KEY=sk-...

# For Ollama (custom host)
export OLLAMA_HOST=http://localhost:11434
```

With environment variables set, you can simply run:

```bash
pappetizer clean ./receipts --use-llm --llm-provider anthropic
```

## 📁 Supported File Types

- **PDF** (`.pdf`) - Native text extraction with automatic OCR fallback for image-based PDFs
- **Images** (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.tif`, `.bmp`, `.gif`) - Full OCR processing

## 🧠 Memory Feature

Pappetizer learns from your corrections. When you edit a vendor name (e.g., changing "AMAZON WEB SERVICES" to "AWS"), it remembers this preference and automatically applies it to future receipts from the same vendor.

Vendor aliases are stored globally in your configuration and work across all directories.

## 📊 Confidence Scoring

Each extraction includes a confidence score (0-100%) based on:
- Whether all fields (vendor, date, amount, currency) were detected
- Whether AI extraction was used (higher confidence)

Files with low confidence scores prompt for manual review even when using `-y` (auto-accept), helping prevent incorrect renames.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT
