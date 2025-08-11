import { H3Event, getQuery } from 'h3';
import yahooFinance from 'yahoo-finance2';

export default defineEventHandler(async (event: H3Event) => {
  const { q } = getQuery(event) as { q?: string };
  const query = (q || '').trim();
  if (!query) {
    return { results: [] };
  }
  try {
    // yahoo-finance2: use search method to find matching symbols
    const res = await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 });
    const results = (res?.quotes || [])
      .filter((it: any) => it?.symbol)
      .slice(0, 10)
      .map((it: any) => ({
        symbol: it.symbol,
        name: it.shortname || it.longname || null,
        exchange: it.exchange || null,
        type: it.quoteType || null,
        currency: it.currency || null,
      }));
    return { results };
  } catch (err: any) {
    return { results: [] };
  }
});
