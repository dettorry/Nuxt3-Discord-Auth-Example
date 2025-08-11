import { H3Event } from 'h3';
import yahooFinance from 'yahoo-finance2';

export default defineEventHandler(async (event: H3Event) => {
  const { symbol } = getQuery(event) as { symbol?: string };
  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Missing symbol parameter' });
  }

  try {
    const q = await yahooFinance.quote(symbol);
    if (!q) {
      throw createError({ statusCode: 502, statusMessage: 'Yahoo Finance returned no data' });
    }

    return {
      symbol: q.symbol || symbol,
      shortName: q.shortName || null,
      longName: (q as any).longName || null,
      currency: q.currency || 'USD',
      marketTime: q.regularMarketTime || null,
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent != null ? Number(q.regularMarketChangePercent.toFixed(2)) : null,
      open: q.regularMarketOpen ?? null,
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      previousClose: q.regularMarketPreviousClose ?? null,
      volume: q.regularMarketVolume ?? null,
      averageVolume: q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null,
      marketCap: q.marketCap ?? null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
      peRatio: q.trailingPE ?? null,
      epsTrailing: q.epsTrailingTwelveMonths ?? null,
    };
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Failed to fetch Yahoo Finance quote' });
  }
});
