.PHONY: help test test-watch coverage lint format clean install configure run restore build release-dry _check-npm

SRC := src

help:
	@echo "pappetizer - Rename receipt files by extracting vendor, date, amount from PDFs and images"
	@echo ""
	@echo "Usage:"
	@echo "  make configure        Run the interactive configuration wizard"
	@echo "  make run TARGET=x     Rename receipt files in a directory or a single file"
	@echo "  make restore TARGET=x Restore renamed files to their original names"
	@echo ""
	@echo "Development:"
	@echo "  make test             Run unit tests"
	@echo "  make test-watch       Run unit tests in watch mode"
	@echo "  make coverage         Run tests with coverage report"
	@echo "  make lint             Check code style"
	@echo "  make format           Auto-format code"
	@echo "  make clean            Remove cache files and build artifacts"
	@echo "  make install          Install dependencies from the lockfile"
	@echo ""
	@echo "Release:"
	@echo "  make build            Build the npm tarball"
	@echo "  make release-dry      Preview the next release (version, notes) without publishing"
	@echo ""
	@echo "Releases are automated: pushing conventional commits to main triggers"
	@echo "semantic-release (fix -> patch, feat -> minor, BREAKING CHANGE -> major)."

_check-npm:
	@command -v npm >/dev/null 2>&1 || { \
		echo "Error: npm is not installed"; \
		echo ""; \
		echo "Install Node.js >= 18 from https://nodejs.org/"; \
		exit 1; \
	}

test: _check-npm
	@npm test

test-watch: _check-npm
	@npm run test:watch

coverage: _check-npm
	@npm run test:coverage

lint: _check-npm
	@npm run lint && echo "Lint OK"

format: _check-npm
	@npm run lint:fix && echo "Format OK"

clean:
	@rm -rf coverage dist *.tgz
	@rm -f *.log
	@echo "Cleaned"

install: _check-npm
	@npm ci
	@echo "Installed pappetizer dependencies"

configure: _check-npm
	@node $(SRC)/index.js configure

run: _check-npm
ifndef TARGET
	@echo "Usage: make run TARGET=<directory-or-file>"
else
	@node $(SRC)/index.js clean $(TARGET)
endif

restore: _check-npm
ifndef TARGET
	@echo "Usage: make restore TARGET=<directory-or-file>"
else
	@node $(SRC)/index.js restore $(TARGET)
endif

build: _check-npm
	@rm -rf dist && mkdir -p dist
	@npm pack --pack-destination dist
	@echo ""
	@echo "Built artifacts:"
	@ls -1 dist

release-dry: _check-npm
	@npx semantic-release --dry-run --no-ci
