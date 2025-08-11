import { H3Event } from 'h3';
import yahooFinance from 'yahoo-finance2';

export default defineEventHandler(async (event: H3Event) => {
  const { symbol, range = '1M' } = getQuery(event) as { symbol?: string; range?: string };

  if (!symbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing symbol parameter',
    });
  }

  // Map UI range to Yahoo Finance query options
  type Interval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1d' | '5d' | '1wk' | '1mo' | '3mo';
  let interval: Interval = '1d';
  let period1: Date | undefined; // start date
  let period2: Date | undefined; // end date (now)

  const now = new Date();
  if (range === '1J') {
    // 1 day intraday, use 1m/2m/5m depending on API availability; 1m works for ~7 days
    interval = '1m';
    period2 = now;
    period1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (range === '1W') {
    interval = '5m';
    period2 = now;
    period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '1M') {
    interval = '15m';
    period2 = now;
    period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === '6M') {
    interval = '1d';
    period2 = now;
    period1 = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
  } else if (range === '1Y') {
    interval = '1d';
    period2 = now;
    period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  } else if (range === '5Y') {
    interval = '1wk';
    period2 = now;
    period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
  } else if (range === 'YTD') {
    interval = '1d';
    period2 = now;
    period1 = new Date(now.getFullYear(), 0, 1);
  } else {
    // ALL
    interval = '1mo';
  }

  try {
    // Ensure period1 exists for yahooFinance.chart (required)
    if (!period1) {
      period1 = new Date(now.getTime() - 30 * 365 * 24 * 60 * 60 * 1000); // ~30 ans
    }
    const chart = await yahooFinance.chart(symbol!, {
      interval,
      period1,
      period2,
      includePrePost: true,
    });

    if (!chart?.quotes || chart.quotes.length === 0) {
      throw createError({ statusCode: 502, statusMessage: 'Yahoo Finance returned no data' });
    }

    const ts = chart.quotes.map(q => Math.floor((q.date as Date).getTime() / 1000));
    const closes = chart.quotes.map(q => q.close as number | null);
    // Build labels/prices, filter out nulls
    const labels: string[] = [];
    const prices: number[] = [];
    ts.forEach((t, i) => {
      const v = closes[i];
      if (v != null) {
        labels.push(new Date(t * 1000).toISOString());
        prices.push(Number(v));
      }
    });

    return { labels, prices };
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Failed to fetch Yahoo Finance data' });
  }
  // Unreachable: return occurs in try block
});
