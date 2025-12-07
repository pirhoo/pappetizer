/**
 * Service to extract receipt data (vendor, date, amount, currency) from text
 * Uses multiple heuristics and pattern matching for accurate extraction
 */
export class ReceiptDataExtractor {
  constructor() {
    this.knownVendors = this.buildKnownVendorsDatabase();
    this.monthNames = this.buildMonthNamesMap();
    this.currencyPatterns = this.buildCurrencyPatterns();
  }

  /**
   * Database of known vendors for fuzzy matching
   */
  buildKnownVendorsDatabase() {
    return [
      // Major retailers
      { patterns: ['walmart', 'wal-mart', 'wal mart'], name: 'Walmart' },
      { patterns: ['target'], name: 'Target' },
      { patterns: ['costco'], name: 'Costco' },
      { patterns: ['amazon', 'amzn', 'aws'], name: 'Amazon' },
      { patterns: ['ebay'], name: 'eBay' },
      { patterns: ['best buy', 'bestbuy'], name: 'Best Buy' },
      { patterns: ['home depot'], name: 'Home Depot' },
      { patterns: ['lowes', "lowe's"], name: "Lowe's" },
      { patterns: ['ikea'], name: 'IKEA' },
      { patterns: ['cvs'], name: 'CVS' },
      { patterns: ['walgreens'], name: 'Walgreens' },
      { patterns: ['rite aid'], name: 'Rite Aid' },
      { patterns: ['kroger'], name: 'Kroger' },
      { patterns: ['safeway'], name: 'Safeway' },
      { patterns: ['whole foods', 'wholefoods'], name: 'Whole Foods' },
      { patterns: ['trader joe', "trader joe's"], name: "Trader Joe's" },
      { patterns: ['aldi'], name: 'Aldi' },
      { patterns: ['lidl'], name: 'Lidl' },
      { patterns: ['publix'], name: 'Publix' },
      { patterns: ['7-eleven', '7 eleven', 'seven eleven'], name: '7-Eleven' },
      { patterns: ['dollar general'], name: 'Dollar General' },
      { patterns: ['dollar tree'], name: 'Dollar Tree' },
      { patterns: ['family dollar'], name: 'Family Dollar' },
      { patterns: ['big lots'], name: 'Big Lots' },
      { patterns: ['bed bath', 'bed bath & beyond'], name: 'Bed Bath & Beyond' },
      { patterns: ['pier 1', 'pier one'], name: 'Pier 1' },
      { patterns: ['pottery barn'], name: 'Pottery Barn' },
      { patterns: ['williams sonoma', 'williams-sonoma'], name: 'Williams-Sonoma' },
      { patterns: ['crate & barrel', 'crate and barrel'], name: 'Crate & Barrel' },
      { patterns: ['nordstrom'], name: 'Nordstrom' },
      { patterns: ['macy', "macy's"], name: "Macy's" },
      { patterns: ['jcpenney', 'jc penney', 'j.c. penney'], name: 'JCPenney' },
      { patterns: ['kohl', "kohl's"], name: "Kohl's" },
      { patterns: ['sears'], name: 'Sears' },
      { patterns: ['t.j. maxx', 'tjmaxx', 'tj maxx'], name: 'TJ Maxx' },
      { patterns: ['marshalls'], name: 'Marshalls' },
      { patterns: ['ross'], name: 'Ross' },
      { patterns: ['burlington'], name: 'Burlington' },
      { patterns: ['old navy'], name: 'Old Navy' },
      { patterns: ['gap'], name: 'Gap' },
      { patterns: ['banana republic'], name: 'Banana Republic' },
      { patterns: ['h&m', 'h & m'], name: 'H&M' },
      { patterns: ['zara'], name: 'Zara' },
      { patterns: ['uniqlo'], name: 'Uniqlo' },
      { patterns: ['forever 21'], name: 'Forever 21' },
      { patterns: ['urban outfitters'], name: 'Urban Outfitters' },
      { patterns: ['anthropologie'], name: 'Anthropologie' },
      { patterns: ['free people'], name: 'Free People' },
      { patterns: ['asos'], name: 'ASOS' },
      { patterns: ['shein'], name: 'SHEIN' },
      { patterns: ['nike'], name: 'Nike' },
      { patterns: ['adidas'], name: 'Adidas' },
      { patterns: ['puma'], name: 'Puma' },
      { patterns: ['under armour'], name: 'Under Armour' },
      { patterns: ['foot locker', 'footlocker'], name: 'Foot Locker' },
      { patterns: ['finish line'], name: 'Finish Line' },

      // Tech & Electronics
      { patterns: ['apple store', 'apple.com'], name: 'Apple' },
      { patterns: ['microsoft'], name: 'Microsoft' },
      { patterns: ['google'], name: 'Google' },
      { patterns: ['samsung'], name: 'Samsung' },
      { patterns: ['newegg'], name: 'Newegg' },
      { patterns: ['b&h', 'b & h', 'bhphotovideo'], name: 'B&H Photo' },
      { patterns: ['micro center'], name: 'Micro Center' },
      { patterns: ['fry', "fry's"], name: "Fry's Electronics" },
      { patterns: ['gamestop'], name: 'GameStop' },
      { patterns: ['steam'], name: 'Steam' },
      { patterns: ['playstation', 'psn'], name: 'PlayStation' },
      { patterns: ['xbox'], name: 'Xbox' },
      { patterns: ['nintendo'], name: 'Nintendo' },

      // Grocery & Food
      { patterns: ['starbucks'], name: 'Starbucks' },
      { patterns: ['dunkin', "dunkin'"], name: "Dunkin'" },
      { patterns: ['mcdonald', "mcdonald's", 'mcdonalds'], name: "McDonald's" },
      { patterns: ['burger king'], name: 'Burger King' },
      { patterns: ['wendy', "wendy's"], name: "Wendy's" },
      { patterns: ['taco bell'], name: 'Taco Bell' },
      { patterns: ['chipotle'], name: 'Chipotle' },
      { patterns: ['subway'], name: 'Subway' },
      { patterns: ['pizza hut'], name: 'Pizza Hut' },
      { patterns: ['domino', "domino's"], name: "Domino's" },
      { patterns: ['papa john', "papa john's"], name: "Papa John's" },
      { patterns: ['little caesars'], name: 'Little Caesars' },
      { patterns: ['kfc', 'kentucky fried'], name: 'KFC' },
      { patterns: ['popeyes', "popeye's"], name: 'Popeyes' },
      { patterns: ['chick-fil-a', 'chick fil a', 'chickfila'], name: 'Chick-fil-A' },
      { patterns: ['panera'], name: 'Panera Bread' },
      { patterns: ['panda express'], name: 'Panda Express' },
      { patterns: ['five guys'], name: 'Five Guys' },
      { patterns: ['shake shack'], name: 'Shake Shack' },
      { patterns: ['in-n-out', 'in n out'], name: 'In-N-Out' },
      { patterns: ['whataburger'], name: 'Whataburger' },
      { patterns: ['sonic'], name: 'Sonic' },
      { patterns: ["arby's", 'arbys'], name: "Arby's" },
      { patterns: ['dairy queen'], name: 'Dairy Queen' },
      { patterns: ['baskin robbins', 'baskin-robbins'], name: 'Baskin-Robbins' },
      { patterns: ['cold stone'], name: 'Cold Stone' },
      { patterns: ['jamba'], name: 'Jamba' },
      { patterns: ['smoothie king'], name: 'Smoothie King' },

      // European retailers
      { patterns: ['carrefour'], name: 'Carrefour' },
      { patterns: ['tesco'], name: 'Tesco' },
      { patterns: ['sainsbury', "sainsbury's"], name: "Sainsbury's" },
      { patterns: ['asda'], name: 'Asda' },
      { patterns: ['morrisons'], name: 'Morrisons' },
      { patterns: ['waitrose'], name: 'Waitrose' },
      { patterns: ['marks & spencer', 'm&s'], name: 'Marks & Spencer' },
      { patterns: ['primark'], name: 'Primark' },
      { patterns: ['rewe'], name: 'REWE' },
      { patterns: ['edeka'], name: 'EDEKA' },
      { patterns: ['migros'], name: 'Migros' },
      { patterns: ['coop', 'co-op'], name: 'Coop' },
      { patterns: ['manor'], name: 'Manor' },
      { patterns: ['globus'], name: 'Globus' },
      { patterns: ['denner'], name: 'Denner' },
      { patterns: ['spar'], name: 'SPAR' },
      { patterns: ['mercadona'], name: 'Mercadona' },
      { patterns: ['el corte ingles', 'el corte inglés'], name: 'El Corte Inglés' },
      { patterns: ['fnac'], name: 'Fnac' },
      { patterns: ['darty'], name: 'Darty' },
      { patterns: ['mediamarkt', 'media markt'], name: 'MediaMarkt' },
      { patterns: ['saturn'], name: 'Saturn' },
      { patterns: ['decathlon'], name: 'Decathlon' },
      { patterns: ['intersport'], name: 'Intersport' },

      // Online services
      { patterns: ['netflix'], name: 'Netflix' },
      { patterns: ['spotify'], name: 'Spotify' },
      { patterns: ['apple music'], name: 'Apple Music' },
      { patterns: ['youtube'], name: 'YouTube' },
      { patterns: ['hulu'], name: 'Hulu' },
      { patterns: ['disney+', 'disney plus'], name: 'Disney+' },
      { patterns: ['hbo max', 'hbo'], name: 'HBO Max' },
      { patterns: ['paramount+', 'paramount plus'], name: 'Paramount+' },
      { patterns: ['peacock'], name: 'Peacock' },
      { patterns: ['dropbox'], name: 'Dropbox' },
      { patterns: ['adobe'], name: 'Adobe' },
      { patterns: ['notion'], name: 'Notion' },
      { patterns: ['slack'], name: 'Slack' },
      { patterns: ['zoom'], name: 'Zoom' },
      { patterns: ['github'], name: 'GitHub' },
      { patterns: ['gitlab'], name: 'GitLab' },
      { patterns: ['atlassian', 'jira'], name: 'Atlassian' },
      { patterns: ['aws', 'amazon web services'], name: 'AWS' },
      { patterns: ['digitalocean', 'digital ocean'], name: 'DigitalOcean' },
      { patterns: ['heroku'], name: 'Heroku' },
      { patterns: ['vercel'], name: 'Vercel' },
      { patterns: ['netlify'], name: 'Netlify' },
      { patterns: ['cloudflare'], name: 'Cloudflare' },

      // Travel & Transportation
      { patterns: ['uber'], name: 'Uber' },
      { patterns: ['lyft'], name: 'Lyft' },
      { patterns: ['airbnb'], name: 'Airbnb' },
      { patterns: ['booking.com', 'booking'], name: 'Booking.com' },
      { patterns: ['expedia'], name: 'Expedia' },
      { patterns: ['hotels.com'], name: 'Hotels.com' },
      { patterns: ['tripadvisor'], name: 'TripAdvisor' },
      { patterns: ['delta'], name: 'Delta Airlines' },
      { patterns: ['united airlines', 'united'], name: 'United Airlines' },
      { patterns: ['american airlines'], name: 'American Airlines' },
      { patterns: ['southwest'], name: 'Southwest Airlines' },
      { patterns: ['jetblue'], name: 'JetBlue' },
      { patterns: ['spirit airlines'], name: 'Spirit Airlines' },
      { patterns: ['frontier'], name: 'Frontier Airlines' },
      { patterns: ['alaska airlines'], name: 'Alaska Airlines' },
      { patterns: ['lufthansa'], name: 'Lufthansa' },
      { patterns: ['british airways'], name: 'British Airways' },
      { patterns: ['air france'], name: 'Air France' },
      { patterns: ['klm'], name: 'KLM' },
      { patterns: ['swiss air', 'swiss international'], name: 'Swiss Air' },
      { patterns: ['ryanair'], name: 'Ryanair' },
      { patterns: ['easyjet'], name: 'EasyJet' },
      { patterns: ['hilton'], name: 'Hilton' },
      { patterns: ['marriott'], name: 'Marriott' },
      { patterns: ['hyatt'], name: 'Hyatt' },
      { patterns: ['sheraton'], name: 'Sheraton' },
      { patterns: ['holiday inn'], name: 'Holiday Inn' },
      { patterns: ['best western'], name: 'Best Western' },
      { patterns: ['motel 6'], name: 'Motel 6' },
      { patterns: ['la quinta'], name: 'La Quinta' },

      // Gas stations
      { patterns: ['shell'], name: 'Shell' },
      { patterns: ['exxon', 'exxonmobil'], name: 'ExxonMobil' },
      { patterns: ['chevron'], name: 'Chevron' },
      { patterns: ['bp'], name: 'BP' },
      { patterns: ['mobil'], name: 'Mobil' },
      { patterns: ['texaco'], name: 'Texaco' },
      { patterns: ['marathon'], name: 'Marathon' },
      { patterns: ['76'], name: '76' },
      { patterns: ['sunoco'], name: 'Sunoco' },
      { patterns: ['citgo'], name: 'Citgo' },
      { patterns: ['total'], name: 'Total' },
      { patterns: ['esso'], name: 'Esso' },
      { patterns: ['aral'], name: 'Aral' },

      // Pharmacies & Health
      { patterns: ['express scripts'], name: 'Express Scripts' },
      { patterns: ['optum'], name: 'Optum' },
      { patterns: ['united health', 'unitedhealthcare'], name: 'UnitedHealthcare' },
      { patterns: ['cigna'], name: 'Cigna' },
      { patterns: ['aetna'], name: 'Aetna' },
      { patterns: ['kaiser'], name: 'Kaiser' },
      { patterns: ['blue cross', 'bluecross'], name: 'Blue Cross' },
      { patterns: ['gnc'], name: 'GNC' },
      { patterns: ['vitamin shoppe'], name: 'Vitamin Shoppe' },

      // Utilities & Services
      { patterns: ['at&t', 'att'], name: 'AT&T' },
      { patterns: ['verizon'], name: 'Verizon' },
      { patterns: ['t-mobile', 'tmobile'], name: 'T-Mobile' },
      { patterns: ['sprint'], name: 'Sprint' },
      { patterns: ['comcast', 'xfinity'], name: 'Comcast' },
      { patterns: ['spectrum'], name: 'Spectrum' },
      { patterns: ['cox'], name: 'Cox' },
      { patterns: ['centurylink'], name: 'CenturyLink' },
      { patterns: ['vodafone'], name: 'Vodafone' },
      { patterns: ['orange'], name: 'Orange' },
      { patterns: ['swisscom'], name: 'Swisscom' },
      { patterns: ['sunrise'], name: 'Sunrise' },
      { patterns: ['salt'], name: 'Salt' },

      // Office supplies
      { patterns: ['staples'], name: 'Staples' },
      { patterns: ['office depot'], name: 'Office Depot' },
      { patterns: ['officemax'], name: 'OfficeMax' },

      // Hardware stores
      { patterns: ['ace hardware'], name: 'Ace Hardware' },
      { patterns: ['true value'], name: 'True Value' },
      { patterns: ['menards'], name: 'Menards' },
      { patterns: ['harbor freight'], name: 'Harbor Freight' },
      { patterns: ['northern tool'], name: 'Northern Tool' },

      // Pet stores
      { patterns: ['petco'], name: 'Petco' },
      { patterns: ['petsmart'], name: 'PetSmart' },
      { patterns: ['chewy'], name: 'Chewy' },

      // Auto
      { patterns: ['autozone'], name: 'AutoZone' },
      { patterns: ["o'reilly", 'oreilly'], name: "O'Reilly Auto Parts" },
      { patterns: ['advance auto'], name: 'Advance Auto Parts' },
      { patterns: ['napa'], name: 'NAPA Auto Parts' },
      { patterns: ['pep boys'], name: 'Pep Boys' },
      { patterns: ['jiffy lube'], name: 'Jiffy Lube' },
      { patterns: ['firestone'], name: 'Firestone' },
      { patterns: ['goodyear'], name: 'Goodyear' },
      { patterns: ['discount tire'], name: 'Discount Tire' },

      // Bookstores
      { patterns: ['barnes & noble', 'barnes and noble'], name: 'Barnes & Noble' },
      { patterns: ['books-a-million'], name: 'Books-A-Million' },
      { patterns: ['half price books'], name: 'Half Price Books' },

      // Sporting goods
      { patterns: ['dick', "dick's sporting"], name: "Dick's Sporting Goods" },
      { patterns: ['academy sports'], name: 'Academy Sports' },
      { patterns: ['rei'], name: 'REI' },
      { patterns: ['bass pro'], name: 'Bass Pro Shops' },
      { patterns: ['cabela'], name: "Cabela's" },

      // Payment processors (for identifying transactions)
      { patterns: ['paypal'], name: 'PayPal' },
      { patterns: ['stripe'], name: 'Stripe' },
      { patterns: ['square'], name: 'Square' },
      { patterns: ['venmo'], name: 'Venmo' },
      { patterns: ['zelle'], name: 'Zelle' },
      { patterns: ['wise', 'transferwise'], name: 'Wise' },
      { patterns: ['revolut'], name: 'Revolut' },
    ];
  }

  /**
   * Build month names map for multiple languages
   */
  buildMonthNamesMap() {
    return {
      // English
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8,
      oct: 9, nov: 10, dec: 11,
      // German
      januar: 0, februar: 1, märz: 2, maerz: 2, mai: 4, juni: 5, juli: 6,
      oktober: 9, dezember: 11,
      // French
      janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, juin: 5,
      juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
      // Spanish
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
      // Italian
      gennaio: 0, febbraio: 1, aprile: 3, maggio: 4, giugno: 5,
      luglio: 6, settembre: 8, ottobre: 9,
      // Portuguese
      janeiro: 0, fevereiro: 1, março: 2, maio: 4, junho: 5,
      setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
      // Dutch
      januari: 0, februari: 1, maart: 2, mei: 4, augustus: 7,
    };
  }

  /**
   * Build comprehensive currency patterns
   */
  buildCurrencyPatterns() {
    return {
      symbols: {
        '$': ['USD', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'MXN'],
        '€': ['EUR'],
        '£': ['GBP'],
        '¥': ['JPY', 'CNY'],
        '₣': ['CHF'],
        'Fr.': ['CHF'],
        'CHF': ['CHF'],
        'SFr.': ['CHF'],
        '₹': ['INR'],
        '₽': ['RUB'],
        '₩': ['KRW'],
        '฿': ['THB'],
        '₫': ['VND'],
        'R$': ['BRL'],
        'zł': ['PLN'],
        'kr': ['SEK', 'NOK', 'DKK'],
        'Kč': ['CZK'],
        'Ft': ['HUF'],
        'lei': ['RON'],
        '₪': ['ILS'],
        '₴': ['UAH'],
        'RM': ['MYR'],
        'S$': ['SGD'],
        'HK$': ['HKD'],
        'NT$': ['TWD'],
        'A$': ['AUD'],
        'C$': ['CAD'],
        'NZ$': ['NZD'],
        'R': ['ZAR'],
      },
      codes: [
        'USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'NZD', 'SGD',
        'HKD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK',
        'RUB', 'TRY', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'INR', 'IDR',
        'MYR', 'PHP', 'THB', 'VND', 'KRW', 'TWD', 'ILS', 'AED', 'SAR', 'QAR',
        'KWD', 'BHD', 'OMR', 'EGP', 'ZAR', 'NGN', 'KES', 'MAD', 'UAH',
      ],
      words: {
        dollar: 'USD', dollars: 'USD', buck: 'USD', bucks: 'USD',
        euro: 'EUR', euros: 'EUR',
        pound: 'GBP', pounds: 'GBP', sterling: 'GBP', quid: 'GBP',
        franc: 'CHF', francs: 'CHF', franken: 'CHF',
        yen: 'JPY',
        yuan: 'CNY', renminbi: 'CNY', rmb: 'CNY',
        rupee: 'INR', rupees: 'INR',
        real: 'BRL', reais: 'BRL',
        peso: 'MXN', pesos: 'MXN',
        krona: 'SEK', kronor: 'SEK', krone: 'NOK', kroner: 'NOK',
        zloty: 'PLN', złoty: 'PLN',
        koruna: 'CZK', korun: 'CZK',
        forint: 'HUF',
        lira: 'TRY',
        ruble: 'RUB', rubles: 'RUB', rouble: 'RUB', roubles: 'RUB',
        won: 'KRW',
        baht: 'THB',
        ringgit: 'MYR',
        rand: 'ZAR',
        shekel: 'ILS', shekels: 'ILS',
        dirham: 'AED', dirhams: 'AED',
        riyal: 'SAR', riyals: 'SAR',
      },
    };
  }

  /**
   * Extract receipt data from OCR text
   */
  extract(text) {
    const currency = this.extractCurrency(text);
    return {
      vendor: this.extractVendor(text),
      date: this.extractDate(text),
      amount: this.extractAmount(text),
      currency: currency,
    };
  }

  /**
   * Extract vendor name with multiple heuristics
   */
  extractVendor(text) {
    if (!text) return null;

    const normalizedText = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // 1. Check against known vendors database first (most reliable)
    const knownVendor = this.matchKnownVendor(normalizedText);
    if (knownVendor) return knownVendor;

    // 2. Look for explicit vendor labels
    const labeledVendor = this.extractLabeledVendor(text);
    if (labeledVendor) return this.cleanVendorName(labeledVendor);

    // 3. Look for business name patterns (LLC, Inc, Ltd, etc.)
    const businessName = this.extractBusinessName(text);
    if (businessName) return this.cleanVendorName(businessName);

    // 4. Look for logo/header text (usually first meaningful lines)
    const headerVendor = this.extractFromHeader(lines);
    if (headerVendor) return this.cleanVendorName(headerVendor);

    // 5. Look for website/email domains
    const domainVendor = this.extractFromDomain(text);
    if (domainVendor) return this.cleanVendorName(domainVendor);

    // 6. Look for "Thank you for shopping at" patterns
    const thankYouVendor = this.extractFromThankYou(text);
    if (thankYouVendor) return this.cleanVendorName(thankYouVendor);

    // 7. Look for "Store #" patterns with preceding name
    const storeVendor = this.extractFromStoreNumber(text);
    if (storeVendor) return this.cleanVendorName(storeVendor);

    return null;
  }

  matchKnownVendor(normalizedText) {
    for (const vendor of this.knownVendors) {
      for (const pattern of vendor.patterns) {
        if (normalizedText.includes(pattern.toLowerCase())) {
          return vendor.name;
        }
      }
    }
    return null;
  }

  extractLabeledVendor(text) {
    const patterns = [
      /(?:vendor|merchant|store|shop|restaurant|retailer|seller|sold by|purchased (?:from|at)|billed by|payee)[\s:]+([^\n\r,;]+)/i,
      /(?:from|at)[\s:]+([A-Z][A-Za-z0-9\s&'\-\.]+?)(?:\s*(?:\n|,|$))/,
      /(?:receipt from|invoice from|bill from)[\s:]+([^\n\r]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (this.isValidVendorName(vendor)) {
          return vendor;
        }
      }
    }
    return null;
  }

  extractBusinessName(text) {
    const patterns = [
      // Business suffixes
      /([A-Z][A-Za-z0-9\s&'\-\.]+?)\s*(?:LLC|L\.L\.C\.|Inc\.?|INC|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|GmbH|AG|SA|SAS|SARL|BV|NV|PLC|Pty|Co\.?|Company)\b/i,
      // "DBA" (Doing Business As)
      /(?:d\.?b\.?a\.?|doing business as)[\s:]+([^\n\r,]+)/i,
      // Registered trademark or service mark
      /([A-Z][A-Za-z0-9\s&'\-]+?)[\s]*[®™©]/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.isValidVendorName(name)) {
          return name;
        }
      }
    }
    return null;
  }

  extractFromHeader(lines) {
    // Skip receipt title lines and look for meaningful business names
    const skipPatterns = [
      /^(receipt|invoice|bill|order|transaction|confirmation|payment)/i,
      /^(tax|vat|gst)\s*(receipt|invoice)/i,
      /^\*+$/,
      /^-+$/,
      /^=+$/,
      /^#{1,}/,
      /^\d+$/,
      /^(tel|phone|fax|email|web|www|http)/i,
      /^(customer|cashier|register|terminal|trans)/i,
    ];

    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i];

      // Skip lines matching skip patterns
      let shouldSkip = false;
      for (const pattern of skipPatterns) {
        if (pattern.test(line)) {
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) continue;

      // Skip if it looks like a date, amount, or address
      if (!this.isValidVendorName(line)) continue;

      // Check if it looks like a business name (capitalized, reasonable length)
      if (this.looksLikeBusinessName(line)) {
        return line;
      }
    }

    return null;
  }

  looksLikeBusinessName(line) {
    // Too short or too long
    if (line.length < 2 || line.length > 60) return false;

    const letterCount = (line.match(/[a-zA-Z]/g) || []).length;

    if (letterCount === 0) return false;

    // At least some letters and not mostly numbers
    const digitCount = (line.match(/\d/g) || []).length;
    if (digitCount > letterCount) return false;

    // Starts with a letter
    if (!/^[A-Za-z]/.test(line)) return false;

    return true;
  }

  extractFromDomain(text) {
    // Look for website URLs or email domains
    const patterns = [
      /(?:www\.)?([a-z0-9\-]+)\.(?:com|org|net|co|io|shop|store|biz)/i,
      /(?:@)([a-z0-9\-]+)\.(?:com|org|net|co)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const domain = match[1];
        // Check if it's a known vendor
        const known = this.matchKnownVendor(domain.toLowerCase());
        if (known) return known;

        // Otherwise return capitalized domain
        if (domain.length > 2 && domain.length < 30) {
          return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
      }
    }
    return null;
  }

  extractFromThankYou(text) {
    const patterns = [
      /thank(?:s|\s*you)?(?:\s+for)?(?:\s+(?:shopping|visiting|dining|choosing|your (?:purchase|order|business)))?\s+(?:at|with)\s+([^\n\r!.]+)/i,
      /welcome\s+to\s+([A-Z][A-Za-z0-9\s&'\-]+)/i,
      /(?:visit|see)\s+(?:us|again)\s+(?:at|soon)\s+([A-Z][A-Za-z0-9\s&'\-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (this.isValidVendorName(vendor)) {
          return vendor;
        }
      }
    }
    return null;
  }

  extractFromStoreNumber(text) {
    // Look for patterns like "STORENAME Store #123" or "STORENAME #123"
    const patterns = [
      /([A-Z][A-Za-z0-9\s&'\-]+?)\s+(?:store|location|branch|outlet)?\s*#\s*\d+/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const vendor = match[1].trim();
        if (this.isValidVendorName(vendor) && vendor.length > 2) {
          return vendor;
        }
      }
    }
    return null;
  }

  isValidVendorName(name) {
    if (!name || name.length < 2 || name.length > 60) return false;

    // Skip if looks like a date
    if (/^\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(name)) return false;

    // Skip if looks like an amount
    if (/^[\$\€\£\¥₣₹]?\s*[\d,]+\.?\d*\s*$/.test(name)) return false;

    // Skip if looks like an address
    if (/\b(street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd|drive|dr\.|lane|ln\.|way|place|pl\.|court|ct\.)\b/i.test(name)) return false;

    // Skip if looks like phone number
    if (/^[\d\s\-\(\)\.+]{7,}$/.test(name)) return false;

    // Skip if looks like a time
    if (/^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(name)) return false;

    // Skip if it's mostly numbers
    const digitRatio = (name.match(/\d/g) || []).length / name.length;
    if (digitRatio > 0.6) return false;

    // Skip common receipt words
    const skipWords = [
      'receipt', 'invoice', 'total', 'subtotal', 'tax', 'change', 'cash', 'credit',
      'debit', 'card', 'payment', 'amount', 'balance', 'due', 'paid', 'qty', 'quantity',
      'item', 'items', 'description', 'price', 'unit', 'discount', 'saving', 'saved',
      'customer', 'cashier', 'register', 'terminal', 'transaction', 'date', 'time',
      'copy', 'duplicate', 'original', 'void', 'refund', 'return', 'exchange',
    ];
    const lowerName = name.toLowerCase();
    for (const word of skipWords) {
      if (lowerName === word) return false;
    }

    return true;
  }

  cleanVendorName(name) {
    if (!name) return null;

    return name
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove invalid filename chars
      .replace(/[®™©]/g, '') // Remove trademark symbols
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[\s\-\.]+|[\s\-\.]+$/g, '') // Trim special chars
      .trim()
      .substring(0, 50);
  }

  /**
   * Extract date with comprehensive pattern matching
   */
  extractDate(text) {
    if (!text) return null;

    // 1. First look for labeled dates (most reliable)
    const labeledDate = this.extractLabeledDate(text);
    if (labeledDate) return labeledDate;

    // 2. Try various date formats
    const allDates = this.findAllDates(text);

    if (allDates.length === 0) return null;

    // 3. Prefer dates that are recent (within last 2 years) and not in future
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    const validDates = allDates.filter(d =>
      d && d.getTime() <= now.getTime() && d.getTime() >= twoYearsAgo.getTime(),
    );

    if (validDates.length > 0) {
      // Return the most recent valid date
      return validDates.sort((a, b) => b.getTime() - a.getTime())[0];
    }

    // 4. Fallback to first found date if no valid recent dates
    return allDates[0];
  }

  extractLabeledDate(text) {
    const labelPatterns = [
      /(?:date|dated|issued|invoice\s*date|receipt\s*date|order\s*date|purchase\s*date|transaction\s*date|trans\.?\s*date|payment\s*date|bill\s*date|sale\s*date)[\s:]+([^\n\r]{5,30})/i,
      /(?:date\s*of\s*(?:purchase|sale|transaction|issue|invoice|receipt))[\s:]+([^\n\r]{5,30})/i,
    ];

    for (const pattern of labelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = this.parseFlexibleDate(match[1].trim());
        if (parsed) return parsed;
      }
    }

    return null;
  }

  findAllDates(text) {
    const dates = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // ISO format: YYYY-MM-DD
      const isoMatch = line.match(/\b(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})\b/);
      if (isoMatch) {
        const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        if (this.isValidDate(date)) dates.push(date);
      }

      // European/US format: DD/MM/YYYY or MM/DD/YYYY
      const slashMatch = line.match(/\b(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})\b/);
      if (slashMatch) {
        const parsedDates = this.parseAmbiguousDate(
          parseInt(slashMatch[1]),
          parseInt(slashMatch[2]),
          parseInt(slashMatch[3]),
        );
        dates.push(...parsedDates.filter(d => this.isValidDate(d)));
      }

      // Short year: DD/MM/YY or MM/DD/YY
      const shortYearMatch = line.match(/\b(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2})\b/);
      if (shortYearMatch) {
        const year = this.expandYear(parseInt(shortYearMatch[3]));
        const parsedDates = this.parseAmbiguousDate(
          parseInt(shortYearMatch[1]),
          parseInt(shortYearMatch[2]),
          year,
        );
        dates.push(...parsedDates.filter(d => this.isValidDate(d)));
      }

      // Month name formats
      const monthNameDates = this.extractMonthNameDates(line);
      dates.push(...monthNameDates.filter(d => this.isValidDate(d)));

      // German format: DD. Month YYYY or DD.MM.YYYY
      const germanMatch = line.match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})\b/);
      if (germanMatch) {
        let year = parseInt(germanMatch[3]);
        if (year < 100) year = this.expandYear(year);
        const date = new Date(year, parseInt(germanMatch[2]) - 1, parseInt(germanMatch[1]));
        if (this.isValidDate(date)) dates.push(date);
      }
    }

    // Remove duplicates
    const uniqueDates = [];
    const seen = new Set();
    for (const date of dates) {
      const key = date.toISOString().split('T')[0];
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDates.push(date);
      }
    }

    return uniqueDates;
  }

  extractMonthNameDates(text) {
    const dates = [];

    // Build month pattern from keys
    const monthPattern = Object.keys(this.monthNames).join('|');

    // Month DD, YYYY or Month DD YYYY
    const mdyRegex = new RegExp(`\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]+(\\d{4})\\b`, 'gi');
    let match;
    while ((match = mdyRegex.exec(text)) !== null) {
      const month = this.monthNames[match[1].toLowerCase()];
      if (month !== undefined) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[2]));
        dates.push(date);
      }
    }

    // DD Month YYYY
    const dmyRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${monthPattern})\\.?[,\\s]+(\\d{4})\\b`, 'gi');
    while ((match = dmyRegex.exec(text)) !== null) {
      const month = this.monthNames[match[2].toLowerCase()];
      if (month !== undefined) {
        const date = new Date(parseInt(match[3]), month, parseInt(match[1]));
        dates.push(date);
      }
    }

    // DD Month YY (short year)
    const dmyShortRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-]+(${monthPattern})\\.?[,\\s]+(\\d{2})\\b`, 'gi');
    while ((match = dmyShortRegex.exec(text)) !== null) {
      const month = this.monthNames[match[2].toLowerCase()];
      if (month !== undefined) {
        const year = this.expandYear(parseInt(match[3]));
        const date = new Date(year, month, parseInt(match[1]));
        dates.push(date);
      }
    }

    // Month YYYY (no day, assume 1st)
    const myRegex = new RegExp(`\\b(${monthPattern})\\.?[,\\s]+(\\d{4})\\b`, 'gi');
    while ((match = myRegex.exec(text)) !== null) {
      const month = this.monthNames[match[1].toLowerCase()];
      if (month !== undefined) {
        const date = new Date(parseInt(match[2]), month, 1);
        dates.push(date);
      }
    }

    return dates;
  }

  parseAmbiguousDate(a, b, year) {
    const dates = [];

    // Try DD/MM/YYYY (European)
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
      dates.push(new Date(year, b - 1, a));
    }

    // Try MM/DD/YYYY (American)
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      dates.push(new Date(year, a - 1, b));
    }

    return dates;
  }

  expandYear(shortYear) {
    // Assume years 00-50 are 2000s, 51-99 are 1900s
    if (shortYear <= 50) {
      return 2000 + shortYear;
    } else {
      return 1900 + shortYear;
    }
  }

  isValidDate(date) {
    if (!date || isNaN(date.getTime())) return false;

    const year = date.getFullYear();
    // Accept dates from 1990 to next year
    const nextYear = new Date().getFullYear() + 1;
    return year >= 1990 && year <= nextYear;
  }

  parseFlexibleDate(dateStr) {
    if (!dateStr) return null;

    // Clean up the string
    dateStr = dateStr.trim().replace(/\s+/g, ' ');

    // Try native parsing first
    const nativeParsed = new Date(dateStr);
    if (this.isValidDate(nativeParsed)) {
      return nativeParsed;
    }

    // Try our pattern matching
    const dates = this.findAllDates(dateStr);
    return dates.length > 0 ? dates[0] : null;
  }

  /**
   * Extract amount with improved heuristics
   */
  extractAmount(text) {
    if (!text) return null;

    // 1. Look for explicit total labels (highest priority)
    const labeledAmount = this.extractLabeledAmount(text);
    if (labeledAmount !== null) return labeledAmount;

    // 2. Look for amount patterns at end of lines (common in receipts)
    const lineEndAmounts = this.extractLineEndAmounts(text);

    // 3. Find all monetary amounts in text
    const allAmounts = this.findAllAmounts(text);

    // 4. Combine and find the likely total
    const candidates = [...lineEndAmounts, ...allAmounts];

    if (candidates.length === 0) return null;

    // Filter out very small amounts (likely per-item prices) if we have larger ones
    const maxAmount = Math.max(...candidates);
    const minReasonableTotal = maxAmount * 0.3; // Total should be at least 30% of max

    const reasonableAmounts = candidates.filter(a => a >= minReasonableTotal);

    // The total is often the largest amount, but not always
    // Look for amounts that appear after "total" text position
    return reasonableAmounts.length > 0 ? Math.max(...reasonableAmounts) : maxAmount;
  }

  extractLabeledAmount(text) {
    // Patterns ordered by specificity
    const patterns = [
      // Grand total (highest priority)
      /(?:grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*amount|net\s*total|final\s*total)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Regular total
      /(?:^|\n)\s*total[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/im,
      // Total with currency after
      /(?:^|\n)\s*total[\s:]*\s*([\d,]+\.?\d*)\s*(?:usd|eur|gbp|chf|cad|aud)/im,
      // "To pay" / "You pay"
      /(?:to\s*pay|you\s*pay|amount\s*paid|paid\s*amount)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Card/payment amount
      /(?:card|visa|mastercard|amex|debit|credit)\s*(?:amount|payment)?[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
      // Sum
      /(?:sum|summe|somme|suma|totale)[\s:]*[\$€£¥₣₹]?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = this.parseAmount(match[1]);
        if (amount !== null && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  extractLineEndAmounts(text) {
    const amounts = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for amounts at the end of lines
      const patterns = [
        /[\$€£¥₣₹]\s*([\d,]+\.\d{2})\s*$/,
        /([\d,]+\.\d{2})\s*[\$€£¥₣₹]?\s*$/,
        /([\d,]+\.\d{2})\s*(?:usd|eur|gbp|chf)?$/i,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = this.parseAmount(match[1]);
          if (amount !== null && amount > 0) {
            amounts.push(amount);
            break;
          }
        }
      }
    }

    return amounts;
  }

  findAllAmounts(text) {
    const amounts = [];

    // Pattern for various amount formats
    const patterns = [
      /[\$€£¥₣₹]\s*([\d,]+\.\d{2})/g,
      /[\$€£¥₣₹]\s*([\d,]+)/g,
      /([\d,]+\.\d{2})\s*(?:usd|eur|gbp|chf|cad|aud|jpy|cny)/gi,
      // European format (comma as decimal)
      /([\d.]+,\d{2})\s*[€£]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = this.parseAmount(match[1]);
        if (amount !== null && amount > 0) {
          amounts.push(amount);
        }
      }
    }

    return [...new Set(amounts)]; // Remove duplicates
  }

  parseAmount(amountStr) {
    if (!amountStr) return null;

    // Handle European format (1.234,56)
    if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(amountStr)) {
      amountStr = amountStr.replace(/\./g, '').replace(',', '.');
    }
    // Handle standard format (1,234.56)
    else {
      amountStr = amountStr.replace(/,/g, '');
    }

    const amount = parseFloat(amountStr);
    return isNaN(amount) ? null : amount;
  }

  /**
   * Extract currency with comprehensive detection
   */
  extractCurrency(text) {
    if (!text) return null;

    // 1. Look for explicit currency labels
    const labeledCurrency = this.extractLabeledCurrency(text);
    if (labeledCurrency) return labeledCurrency;

    // 2. Check for currency codes (most specific)
    const codeCurrency = this.extractCurrencyCode(text);
    if (codeCurrency) return codeCurrency;

    // 3. Check for currency symbols (need context to disambiguate $)
    const symbolCurrency = this.extractCurrencySymbol(text);
    if (symbolCurrency) return symbolCurrency;

    // 4. Check for currency words
    const wordCurrency = this.extractCurrencyWord(text);
    if (wordCurrency) return wordCurrency;

    // 5. Try to infer from country/region hints
    const inferredCurrency = this.inferCurrencyFromContext(text);
    if (inferredCurrency) return inferredCurrency;

    return null;
  }

  extractLabeledCurrency(text) {
    const patterns = [
      /(?:currency|curr\.?|devise)[\s:]+([A-Z]{3})/i,
      /(?:paid\s*in|payment\s*in|amount\s*in)[\s:]+([A-Z]{3})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const code = match[1].toUpperCase();
        if (this.currencyPatterns.codes.includes(code)) {
          return code;
        }
      }
    }
    return null;
  }

  extractCurrencyCode(text) {
    // Look for 3-letter currency codes
    const codePattern = new RegExp(`\\b(${this.currencyPatterns.codes.join('|')})\\b`, 'i');
    const match = text.match(codePattern);
    if (match) {
      return match[1].toUpperCase();
    }
    return null;
  }

  extractCurrencySymbol(text) {
    const symbolOrder = ['€', '£', '¥', '₣', '₹', '₽', '₩', '฿', '₫', '₪', '₴', 'R$', 'zł', 'Kč', 'Ft', '$'];

    for (const symbol of symbolOrder) {
      if (text.includes(symbol)) {
        const currencies = this.currencyPatterns.symbols[symbol];
        if (currencies && currencies.length === 1) {
          return currencies[0];
        }

        // For ambiguous symbols like $, try to determine from context
        if (symbol === '$') {
          return this.disambiguateDollar(text);
        }
      }
    }

    // Check compound symbols
    const compoundSymbols = ['CHF', 'Fr.', 'SFr.', 'HK$', 'S$', 'A$', 'C$', 'NZ$', 'NT$', 'RM'];
    for (const symbol of compoundSymbols) {
      if (text.includes(symbol)) {
        const currencies = this.currencyPatterns.symbols[symbol];
        if (currencies) {
          return currencies[0];
        }
      }
    }

    return null;
  }

  disambiguateDollar(text) {
    // Check for specific dollar type mentions
    if (/\b(canadian|cad|canada)\b/i.test(text)) return 'CAD';
    if (/\b(australian|aud|australia)\b/i.test(text)) return 'AUD';
    if (/\b(singapore|sgd)\b/i.test(text)) return 'SGD';
    if (/\b(hong kong|hkd)\b/i.test(text)) return 'HKD';
    if (/\b(new zealand|nzd)\b/i.test(text)) return 'NZD';
    if (/\b(taiwan|twd|nt\$)\b/i.test(text)) return 'TWD';
    if (/\b(mexican|mxn|mexico)\b/i.test(text)) return 'MXN';

    // Check for US-specific indicators
    if (/\b(usa|united states|american|us\$)\b/i.test(text)) return 'USD';

    // Default to USD for $ symbol
    return 'USD';
  }

  extractCurrencyWord(text) {
    const lowerText = text.toLowerCase();

    for (const [word, currency] of Object.entries(this.currencyPatterns.words)) {
      const pattern = new RegExp(`\\b${word}s?\\b`, 'i');
      if (pattern.test(lowerText)) {
        return currency;
      }
    }
    return null;
  }

  inferCurrencyFromContext(text) {
    const lowerText = text.toLowerCase();

    // Country/region patterns to currency mapping
    const regionPatterns = [
      { patterns: ['switzerland', 'swiss', 'zürich', 'zurich', 'geneva', 'bern', 'basel'], currency: 'CHF' },
      { patterns: ['germany', 'german', 'deutschland', 'berlin', 'munich', 'frankfurt', 'münchen'], currency: 'EUR' },
      { patterns: ['france', 'french', 'paris', 'lyon', 'marseille'], currency: 'EUR' },
      { patterns: ['italy', 'italian', 'italia', 'rome', 'roma', 'milan', 'milano'], currency: 'EUR' },
      { patterns: ['spain', 'spanish', 'españa', 'madrid', 'barcelona'], currency: 'EUR' },
      { patterns: ['netherlands', 'dutch', 'amsterdam', 'rotterdam'], currency: 'EUR' },
      { patterns: ['belgium', 'belgian', 'brussels', 'bruxelles'], currency: 'EUR' },
      { patterns: ['austria', 'austrian', 'wien', 'vienna'], currency: 'EUR' },
      { patterns: ['ireland', 'irish', 'dublin'], currency: 'EUR' },
      { patterns: ['portugal', 'portuguese', 'lisbon', 'lisboa'], currency: 'EUR' },
      { patterns: ['greece', 'greek', 'athens'], currency: 'EUR' },
      { patterns: ['finland', 'finnish', 'helsinki'], currency: 'EUR' },
      { patterns: ['united kingdom', 'uk', 'britain', 'british', 'england', 'london', 'manchester', 'scotland', 'wales'], currency: 'GBP' },
      { patterns: ['japan', 'japanese', 'tokyo', 'osaka'], currency: 'JPY' },
      { patterns: ['china', 'chinese', 'beijing', 'shanghai', 'guangzhou'], currency: 'CNY' },
      { patterns: ['india', 'indian', 'mumbai', 'delhi', 'bangalore'], currency: 'INR' },
      { patterns: ['australia', 'australian', 'sydney', 'melbourne', 'brisbane'], currency: 'AUD' },
      { patterns: ['canada', 'canadian', 'toronto', 'vancouver', 'montreal'], currency: 'CAD' },
      { patterns: ['sweden', 'swedish', 'stockholm'], currency: 'SEK' },
      { patterns: ['norway', 'norwegian', 'oslo'], currency: 'NOK' },
      { patterns: ['denmark', 'danish', 'copenhagen'], currency: 'DKK' },
      { patterns: ['poland', 'polish', 'warsaw', 'krakow'], currency: 'PLN' },
      { patterns: ['czech', 'prague', 'praha'], currency: 'CZK' },
      { patterns: ['hungary', 'hungarian', 'budapest'], currency: 'HUF' },
      { patterns: ['russia', 'russian', 'moscow', 'moskva'], currency: 'RUB' },
      { patterns: ['brazil', 'brazilian', 'são paulo', 'rio'], currency: 'BRL' },
      { patterns: ['mexico', 'mexican', 'mexico city', 'ciudad de mexico'], currency: 'MXN' },
      { patterns: ['south korea', 'korean', 'seoul'], currency: 'KRW' },
      { patterns: ['singapore', 'singaporean'], currency: 'SGD' },
      { patterns: ['hong kong'], currency: 'HKD' },
      { patterns: ['taiwan', 'taiwanese', 'taipei'], currency: 'TWD' },
      { patterns: ['thailand', 'thai', 'bangkok'], currency: 'THB' },
      { patterns: ['malaysia', 'malaysian', 'kuala lumpur'], currency: 'MYR' },
      { patterns: ['israel', 'israeli', 'tel aviv', 'jerusalem'], currency: 'ILS' },
      { patterns: ['uae', 'emirates', 'dubai', 'abu dhabi'], currency: 'AED' },
      { patterns: ['saudi', 'riyadh'], currency: 'SAR' },
      { patterns: ['south africa', 'johannesburg', 'cape town'], currency: 'ZAR' },
    ];

    for (const region of regionPatterns) {
      for (const pattern of region.patterns) {
        if (lowerText.includes(pattern)) {
          return region.currency;
        }
      }
    }

    return null;
  }
}
