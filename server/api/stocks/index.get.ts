import { H3Event, getQuery } from 'h3';
import yahooFinance from 'yahoo-finance2';

type StockItem = {
  symbol: string;
  name?: string | null;
  currency?: string | null;
  price: number;
  change: number;
  changePercent: string; // keep string for UI formatting consistency
  volume: number;
  previousClose: number;
};

// Simple in-memory cache to reduce jitter and API load
const CACHE_TTL_MS = 60_000; // 1 minute
let cache: { ts: number; data: StockItem[] } | null = null;

const SYMBOLS = [
  'AAPL',
  'GOOGL',
  'MSFT',
  'AMZN',
  'TSLA',
  'META',
  'NVDA',
  'NFLX',
];

// Static deterministic fallbacks (only used if no cache and API fails)
const STATIC_FALLBACKS: Record<string, StockItem> = Object.fromEntries(
  SYMBOLS.map(s => [
    s,
    {
      symbol: s,
      name: s,
      currency: 'USD',
      price: 100,
      change: 0,
      changePercent: '0.00',
      volume: 0,
      previousClose: 100,
    },
  ]),
);

export default defineEventHandler(async (event: H3Event) => {
  const { symbols } = getQuery(event) as { symbols?: string };
  // If caller provided symbols, fetch those directly (no shared cache)
  if (symbols) {
    const list = symbols
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 50);
    if (list.length === 0) {
      return { stocks: [] };
    }
    try {
      const quotes = await yahooFinance.quote(list as unknown as string[]);
      const out: StockItem[] = list.map((symbol) => {
        const q = (Array.isArray(quotes) ? quotes : [quotes]).find(item => item?.symbol === symbol);
        if (q) {
          return {
            symbol,
            name: q.shortName || (q as any).longName || symbol,
            currency: q.currency || 'USD',
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePercent: (q.regularMarketChangePercent ?? 0).toFixed(2),
            volume: q.regularMarketVolume ?? 0,
            previousClose: q.regularMarketPreviousClose ?? 0,
          };
        }
        return STATIC_FALLBACKS[symbol] ?? {
          symbol,
          name: symbol,
          currency: 'USD',
          price: 0,
          change: 0,
          changePercent: '0.00',
          volume: 0,
          previousClose: 0,
        };
      });
      return { stocks: out };
    } catch (err: any) {
      // On failure, return empty to signal client to retry/change input
      return { stocks: [] };
    }
  }

  // Default curated list with cache
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return { stocks: cache.data };
  }

  try {
    // Fetch all quotes. yahoo-finance2 supports array input for quote.
    const quotes = await yahooFinance.quote(SYMBOLS as unknown as string[]);
    const bySymbol = new Map<string, any>();
    const list = Array.isArray(quotes) ? quotes : [quotes];
    list.forEach((q) => {
      if (q?.symbol) {
        bySymbol.set(q.symbol, q);
      }
    });

    const results: StockItem[] = SYMBOLS.map((symbol) => {
      const q = bySymbol.get(symbol);
      if (q) {
        return {
          symbol,
          name: q.shortName || q.longName || symbol,
          currency: q.currency || 'USD',
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: (q.regularMarketChangePercent ?? 0).toFixed(2),
          volume: q.regularMarketVolume ?? 0,
          previousClose: q.regularMarketPreviousClose ?? 0,
        };
      }
      // Fallback to previous cache or static values
      const cached = cache?.data.find(it => it.symbol === symbol);
      return cached ?? STATIC_FALLBACKS[symbol];
    });

    cache = { ts: now, data: results };
    return { stocks: results };
  } catch (error: any) {
    // On total failure, try cache or static
    if (cache) {
      return { stocks: cache.data };
    }
    return { stocks: SYMBOLS.map(s => STATIC_FALLBACKS[s]) };
  }
});
