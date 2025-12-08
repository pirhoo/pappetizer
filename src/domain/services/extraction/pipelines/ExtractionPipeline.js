/**
 * Generic extraction pipeline
 * Runs extractors in priority order with configurable result handling
 */
export class ExtractionPipeline {
  /**
   * @param {object} options
   * @param {BaseExtractor[]} options.extractors - Ordered list of extractors
   * @param {string} options.strategy - 'first-match' | 'aggregate'
   */
  constructor({ extractors = [], strategy = 'first-match' } = {}) {
    this.extractors = this.sortByPriority(extractors);
    this.strategy = strategy;
  }

  sortByPriority(extractors) {
    return [...extractors].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add an extractor to the pipeline
   * @param {BaseExtractor} extractor
   * @param {number} [atPriority] - Override the extractor's priority
   */
  addExtractor(extractor, atPriority = null) {
    if (atPriority !== null) {
      extractor.priority = atPriority;
    }
    this.extractors = this.sortByPriority([...this.extractors, extractor]);
  }

  /**
   * Remove an extractor by name or class
   * @param {string|Function} nameOrClass
   */
  removeExtractor(nameOrClass) {
    const predicate =
      typeof nameOrClass === 'string'
        ? (e) => e.name !== nameOrClass
        : (e) => !(e instanceof nameOrClass);
    this.extractors = this.extractors.filter(predicate);
  }

  /**
   * Build context object for extractors
   * @param {string} text
   * @returns {object}
   */
  buildContext(text) {
    return {
      normalizedText: text?.toLowerCase() || '',
      lines: text?.split('\n').map((l) => l.trim()).filter((l) => l) || [],
      rawText: text,
    };
  }

  /**
   * Execute the pipeline
   * @param {string} text
   * @param {object} additionalContext
   * @returns {*}
   */
  run(text, additionalContext = {}) {
    if (!text) return null;

    const context = { ...this.buildContext(text), ...additionalContext };

    switch (this.strategy) {
    case 'first-match':
      return this.runFirstMatch(text, context);
    case 'aggregate':
      return this.runAggregate(text, context);
    default:
      throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  runFirstMatch(text, context) {
    for (const extractor of this.extractors) {
      if (!extractor.canHandle(text)) continue;

      const result = extractor.extract(text, context);
      if (result !== null && result !== undefined) {
        return result;
      }
    }
    return null;
  }

  runAggregate(text, context) {
    const results = [];
    for (const extractor of this.extractors) {
      if (!extractor.canHandle(text)) continue;

      const result = extractor.extract(text, context);
      if (result !== null && result !== undefined) {
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }
    }
    return results;
  }
}
