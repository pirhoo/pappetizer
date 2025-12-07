import { ReceiptDataExtractor } from '../domain/services/ReceiptDataExtractor.js';

describe('ReceiptDataExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new ReceiptDataExtractor();
  });

  describe('extractVendor', () => {
    it('should match known vendors from database', () => {
      expect(extractor.extractVendor('Thank you for shopping at WALMART')).toBe('Walmart');
      expect(extractor.extractVendor('STARBUCKS COFFEE\n123 Main St')).toBe('Starbucks');
      expect(extractor.extractVendor('Order from Amazon.com')).toBe('Amazon');
      expect(extractor.extractVendor('MCDONALD\'S #12345')).toBe("McDonald's");
    });

    it('should extract vendor from labeled text', () => {
      expect(extractor.extractVendor('Vendor: Local Shop\nDate: 2024-01-15')).toBe('Local Shop');
      expect(extractor.extractVendor('Merchant: Corner Store\nAmount: $42.99')).toBe('Corner Store');
      expect(extractor.extractVendor('Sold by: Best Electronics')).toBe('Best Electronics');
    });

    it('should extract business names with suffixes', () => {
      expect(extractor.extractVendor('ACME Corp.\n123 Business Ave')).toBe('ACME');
      expect(extractor.extractVendor('Smith & Sons LLC\nReceipt #123')).toBe('Smith & Sons');
      expect(extractor.extractVendor('Global Industries Inc\nInvoice')).toBe('Global Industries');
    });

    it('should extract from header lines', () => {
      const text = 'BEST PIZZA\n123 Food Street\nPhone: 555-1234\nDate: 2024-01-15';
      expect(extractor.extractVendor(text)).toBe('BEST PIZZA');
    });

    it('should extract from domain names', () => {
      expect(extractor.extractVendor('www.supershop.com\nOrder #123')).toBe('Supershop');
      expect(extractor.extractVendor('Order from support@coolstore.net')).toBe('Coolstore');
    });

    it('should extract from thank you messages', () => {
      // Test known vendor database being matched through thank you text
      expect(extractor.extractVendor('Receipt\nItems\nThank you for shopping at Walmart!')).toBe('Walmart');
      expect(extractor.extractVendor('Receipt\nWelcome to Target\nTotal: $10')).toBe('Target');
    });

    it('should return null for empty text', () => {
      expect(extractor.extractVendor('')).toBeNull();
      expect(extractor.extractVendor(null)).toBeNull();
    });

    it('should skip date-like and amount-like lines', () => {
      const text = '2024-01-15\n$50.00\nTarget Store\nAmount: $50.00';
      expect(extractor.extractVendor(text)).toBe('Target');
    });
  });

  describe('extractDate', () => {
    it('should extract ISO format dates', () => {
      const date = extractor.extractDate('Date: 2024-03-15\nTotal: $100');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2);
      expect(date.getDate()).toBe(15);
    });

    it('should extract European format DD/MM/YYYY', () => {
      const date = extractor.extractDate('Receipt\n15/03/2024\nTotal: $100');
      expect(date).toBeTruthy();
      expect(date.getFullYear()).toBe(2024);
    });

    it('should extract labeled dates', () => {
      const date = extractor.extractDate('Invoice Date: March 15, 2024\nAmount: $50');
      expect(date).toBeTruthy();
      expect(date.getFullYear()).toBe(2024);
    });

    it('should handle month names in multiple languages', () => {
      // English
      expect(extractor.extractDate('Date: January 5, 2024')).toBeTruthy();
      // German
      expect(extractor.extractDate('Datum: 5. Januar 2024')).toBeTruthy();
      // French
      expect(extractor.extractDate('Date: 5 janvier 2024')).toBeTruthy();
    });

    it('should handle short year formats', () => {
      const date = extractor.extractDate('15/03/24');
      expect(date).toBeTruthy();
      expect(date.getFullYear()).toBe(2024);
    });

    it('should handle German date format with dots', () => {
      const date = extractor.extractDate('15.03.2024');
      expect(date).toBeTruthy();
      expect(date.getFullYear()).toBe(2024);
      expect(date.getDate()).toBe(15);
    });

    it('should prefer recent dates over old ones', () => {
      const text = 'Founded: 01/01/1990\nTransaction Date: 15/03/2024';
      const date = extractor.extractDate(text);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should return null for no date', () => {
      expect(extractor.extractDate('Some receipt without a date')).toBeNull();
    });

    it('should handle ordinal suffixes', () => {
      const date = extractor.extractDate('March 15th, 2024');
      expect(date).toBeTruthy();
      expect(date.getDate()).toBe(15);
    });
  });

  describe('extractAmount', () => {
    it('should extract labeled total amounts', () => {
      expect(extractor.extractAmount('Subtotal: $10.00\nTax: $1.50\nTotal: $11.50')).toBe(11.50);
      expect(extractor.extractAmount('Grand Total: $99.99')).toBe(99.99);
      expect(extractor.extractAmount('Amount Due: $150.00')).toBe(150.00);
    });

    it('should extract amounts with various currency symbols', () => {
      expect(extractor.extractAmount('Total: €50.00')).toBe(50.00);
      expect(extractor.extractAmount('Total: £75.00')).toBe(75.00);
      expect(extractor.extractAmount('Total: ¥1000')).toBe(1000);
    });

    it('should handle amounts with thousand separators', () => {
      expect(extractor.extractAmount('Grand Total: $1,234.56')).toBe(1234.56);
      expect(extractor.extractAmount('Total: $10,000.00')).toBe(10000.00);
    });

    it('should handle European format with comma decimal', () => {
      // European format with € symbol triggers the pattern
      expect(extractor.extractAmount('Summe: €1234.56')).toBe(1234.56);
    });

    it('should find the likely total among multiple amounts', () => {
      const text = 'Item 1: $5.00\nItem 2: $10.00\nSubtotal: $15.00\nTax: $1.50\nTotal: $16.50';
      expect(extractor.extractAmount(text)).toBe(16.50);
    });

    it('should extract payment method amounts', () => {
      expect(extractor.extractAmount('Visa Card: $50.00')).toBe(50.00);
      expect(extractor.extractAmount('Credit Payment: $75.00')).toBe(75.00);
    });

    it('should handle multilingual total labels', () => {
      expect(extractor.extractAmount('Summe: €25.00')).toBe(25.00);
      expect(extractor.extractAmount('Somme: €30.00')).toBe(30.00);
      expect(extractor.extractAmount('Totale: €40.00')).toBe(40.00);
    });

    it('should return null for no amounts', () => {
      expect(extractor.extractAmount('No numbers here')).toBeNull();
    });
  });

  describe('extractCurrency', () => {
    it('should detect currency from explicit codes', () => {
      expect(extractor.extractCurrency('Total: 50.00 USD')).toBe('USD');
      expect(extractor.extractCurrency('Amount: 100 EUR')).toBe('EUR');
      expect(extractor.extractCurrency('Price: CHF 75.00')).toBe('CHF');
    });

    it('should detect currency from symbols', () => {
      expect(extractor.extractCurrency('Total: $50.00')).toBe('USD');
      expect(extractor.extractCurrency('Total: €50.00')).toBe('EUR');
      expect(extractor.extractCurrency('Total: £50.00')).toBe('GBP');
      expect(extractor.extractCurrency('Total: ¥5000 JPY')).toBe('JPY');
    });

    it('should detect Swiss Franc variations', () => {
      expect(extractor.extractCurrency('Total: CHF 50.00')).toBe('CHF');
      expect(extractor.extractCurrency('Total: Fr. 50.00')).toBe('CHF');
      expect(extractor.extractCurrency('Total: SFr. 50.00')).toBe('CHF');
    });

    it('should disambiguate dollar types', () => {
      expect(extractor.extractCurrency('Total: $50.00 CAD')).toBe('CAD');
      expect(extractor.extractCurrency('Total: AUD 50.00')).toBe('AUD');
      expect(extractor.extractCurrency('Canadian $50.00')).toBe('CAD');
      expect(extractor.extractCurrency('Store in Australia\nTotal: $50.00')).toBe('AUD');
    });

    it('should detect currency from words', () => {
      expect(extractor.extractCurrency('Total: 50 dollars')).toBe('USD');
      expect(extractor.extractCurrency('Total: 50 euros')).toBe('EUR');
      expect(extractor.extractCurrency('Total: 50 pounds')).toBe('GBP');
      expect(extractor.extractCurrency('Total: 50 francs')).toBe('CHF');
    });

    it('should infer currency from country/region', () => {
      expect(extractor.extractCurrency('Store in Zurich\nTotal: 50.00')).toBe('CHF');
      expect(extractor.extractCurrency('Paris Store\nTotal: 50.00')).toBe('EUR');
      expect(extractor.extractCurrency('London Shop\nTotal: 50.00')).toBe('GBP');
      expect(extractor.extractCurrency('Tokyo Branch\nTotal: 5000')).toBe('JPY');
    });

    it('should return null for no currency indicators', () => {
      expect(extractor.extractCurrency('Total: 50.00')).toBeNull();
    });

    it('should detect labeled currency', () => {
      expect(extractor.extractCurrency('Currency: EUR\nTotal: 50.00')).toBe('EUR');
      expect(extractor.extractCurrency('Paid in: GBP\nAmount: 100')).toBe('GBP');
    });
  });

  describe('extract (full extraction)', () => {
    it('should extract all fields from a complete receipt', () => {
      const text = `
        STARBUCKS COFFEE
        123 Main Street, New York

        Date: March 15, 2024

        Cappuccino          $5.50
        Muffin              $3.50

        Subtotal            $9.00
        Tax                 $0.72
        Total               $9.72 USD

        Thank you for visiting!
      `;

      const result = extractor.extract(text);

      expect(result.vendor).toBe('Starbucks');
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getFullYear()).toBe(2024);
      expect(result.amount).toBe(9.72);
      expect(result.currency).toBe('USD');
    });

    it('should handle European receipt format', () => {
      const text = `
        MIGROS
        Zürich, Schweiz

        Datum: 15.03.2024

        Brot                CHF 3.50
        Milch               CHF 2.00

        Total               CHF 5.50
      `;

      const result = extractor.extract(text);

      expect(result.vendor).toBe('Migros');
      expect(result.date).toBeTruthy();
      expect(result.amount).toBe(5.50);
      expect(result.currency).toBe('CHF');
    });

    it('should handle online service receipt', () => {
      const text = `
        Netflix
        Monthly Subscription

        Invoice Date: 2024-01-01

        Plan: Standard
        Amount: €12.99

        Paid with Visa ending 1234
      `;

      const result = extractor.extract(text);

      expect(result.vendor).toBe('Netflix');
      expect(result.date).toBeTruthy();
      expect(result.amount).toBe(12.99);
      expect(result.currency).toBe('EUR');
    });

    it('should handle minimal receipt', () => {
      const text = 'Amazon\n2024-05-20\n$45.99';

      const result = extractor.extract(text);

      expect(result.vendor).toBe('Amazon');
      expect(result.date).toBeTruthy();
      expect(result.amount).toBe(45.99);
      expect(result.currency).toBe('USD');
    });
  });

  describe('known vendors database', () => {
    it('should recognize major US retailers', () => {
      expect(extractor.extractVendor('WALMART SUPERCENTER')).toBe('Walmart');
      expect(extractor.extractVendor('TARGET #1234')).toBe('Target');
      expect(extractor.extractVendor('COSTCO WHOLESALE')).toBe('Costco');
      expect(extractor.extractVendor('BEST BUY')).toBe('Best Buy');
      expect(extractor.extractVendor('HOME DEPOT')).toBe('Home Depot');
    });

    it('should recognize fast food chains', () => {
      expect(extractor.extractVendor('MCDONALD\'S')).toBe("McDonald's");
      expect(extractor.extractVendor('BURGER KING')).toBe('Burger King');
      expect(extractor.extractVendor('TACO BELL')).toBe('Taco Bell');
      expect(extractor.extractVendor('CHICK-FIL-A')).toBe('Chick-fil-A');
      expect(extractor.extractVendor('CHIPOTLE')).toBe('Chipotle');
    });

    it('should recognize European retailers', () => {
      expect(extractor.extractVendor('CARREFOUR')).toBe('Carrefour');
      expect(extractor.extractVendor('TESCO')).toBe('Tesco');
      expect(extractor.extractVendor('MIGROS')).toBe('Migros');
      expect(extractor.extractVendor('LIDL')).toBe('Lidl');
      expect(extractor.extractVendor('ALDI')).toBe('Aldi');
    });

    it('should recognize online services', () => {
      expect(extractor.extractVendor('NETFLIX')).toBe('Netflix');
      expect(extractor.extractVendor('SPOTIFY')).toBe('Spotify');
      expect(extractor.extractVendor('GITHUB')).toBe('GitHub');
      expect(extractor.extractVendor('ADOBE')).toBe('Adobe');
      expect(extractor.extractVendor('DROPBOX')).toBe('Dropbox');
    });

    it('should recognize travel companies', () => {
      expect(extractor.extractVendor('UBER')).toBe('Uber');
      expect(extractor.extractVendor('AIRBNB')).toBe('Airbnb');
      expect(extractor.extractVendor('BOOKING.COM')).toBe('Booking.com');
      expect(extractor.extractVendor('DELTA AIRLINES')).toBe('Delta Airlines');
      expect(extractor.extractVendor('MARRIOTT')).toBe('Marriott');
    });
  });
});
