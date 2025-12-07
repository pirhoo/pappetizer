# Pappetizer

A CLI tool to automatically rename receipt files by extracting vendor, date, and amount information using OCR and optional AI-powered extraction.

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

```bash
# Clone the repository
git clone https://github.com/yourusername/pappetizer.git
cd pappetizer

# Install dependencies
npm install

# Install Tesseract OCR (required)
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Link globally (optional)
npm link
```

## 🚀 Usage

### Configuration

This will change the default values used by Pappetizer commands:

```bash
# Run interactive configuration wizard
pappetizer configure
```

Configuration options include:
- Date format (YYYYMMDD, YYYY-MM-DD, DD-MM-YYYY, etc.)
- Filename separator
- Filename template
- Default currency
- OCR language
- LLM provider and settings

### Basic Commands

```bash
# Rename receipts in a directory
pappetizer clean ./receipts

# Process a single file
pappetizer clean ./receipt.pdf

# Preview changes without renaming (dry run)
pappetizer clean ./receipts --dry-run

# Process subdirectories recursively
pappetizer clean ./receipts -r

# Auto-accept all suggestions
pappetizer clean ./receipts -y

# Watch for new files
pappetizer clean ./receipts --watch

# Re-process files even if already renamed
pappetizer clean ./receipts --force
```

### Using AI Extraction

```bash
# With Anthropic (Claude)
pappetizer clean ./receipts --use-llm --llm-provider anthropic --api-key sk-ant-...

# With OpenAI (ChatGPT)
pappetizer clean ./receipts --use-llm --llm-provider openai --api-key sk-...

# With Ollama (local)
pappetizer clean ./receipts --use-llm --llm-provider ollama --model llama3.2
```

### Restore Original Names

```bash
# Restore files in a directory
pappetizer restore ./receipts

# Restore with auto-accept
pappetizer restore ./receipts -y

# Preview restoration
pappetizer restore ./receipts --dry-run
```

## 📋 Filename Template

The default template is: `{date}{sep}{vendor}{sep}{amount} {currency}{ext}`

Available placeholders:
- `{date}` - Transaction date
- `{vendor}` - Vendor/store name
- `{amount}` - Total amount
- `{currency}` - Currency code
- `{sep}` - Configured separator
- `{ext}` - Original file extension

Example output: `20240315 - WALMART - 42.99 USD.pdf`

## 🔧 Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...  # For Anthropic/Claude
OPENAI_API_KEY=sk-...         # For OpenAI/ChatGPT
OLLAMA_HOST=http://localhost:11434  # For Ollama
```

## 📁 Supported File Types

- PDF (`.pdf`) - Native text extraction with OCR fallback
- Images (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.tif`, `.bmp`, `.gif`)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT
