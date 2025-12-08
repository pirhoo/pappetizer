import { jest } from '@jest/globals';
import { UserPromptAdapter } from '../../../adapters/primary/UserPromptAdapter.js';

describe('UserPromptAdapter', () => {
  let adapter;
  let consoleLogSpy;

  beforeEach(() => {
    adapter = new UserPromptAdapter();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('output methods', () => {
    it('log should print message', () => {
      adapter.log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('success should print formatted message', () => {
      adapter.success('success message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('success message');
    });

    it('error should print formatted message', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      adapter.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('error message');
      consoleErrorSpy.mockRestore();
    });

    it('skipped should print formatted message', () => {
      adapter.skipped('file.pdf', 'reason');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('file.pdf');
      expect(call).toContain('reason');
    });

    it('info should print formatted message', () => {
      adapter.info('info message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('info message');
    });

    it('warn should print formatted message', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      adapter.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0][0];
      expect(call).toContain('warning message');
      consoleWarnSpy.mockRestore();
    });

    it('dim should print formatted message', () => {
      adapter.dim('dim message');
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0][0];
      expect(call).toContain('dim message');
    });
  });
});
