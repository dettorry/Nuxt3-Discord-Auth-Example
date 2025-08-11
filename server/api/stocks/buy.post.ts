import { H3Event, readBody } from 'h3';
import UnbApi from 'unb-api';

const { Client } = UnbApi as unknown as { Client: new (...args: any[]) => any };

type BuyBody = {
  userId?: string;
  guildId?: string;
  symbol?: string;
  quantity?: number;
  unitPrice?: number; // optional, will be rounded; required for now
  reason?: string;
};

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig() as unknown as {
    UNBELIEVABOAT_TOKEN?: string;
    GUILD_ID?: string;
  };

  if (!config.UNBELIEVABOAT_TOKEN) {
    throw createError({ statusCode: 500, statusMessage: 'Server token is not configured' });
  }

  const body = (await readBody(event)) as BuyBody;
  const {
    userId,
    guildId: bodyGuildId,
    symbol: bodySymbol,
    quantity: bodyQty,
    unitPrice: bodyUnitPrice,
    reason: bodyReason,
  } = body;
  const guildId = bodyGuildId || config.GUILD_ID;
  const symbol = (bodySymbol || '').toString().toUpperCase();
  const quantity = Number(bodyQty);
  const priceInput = Number(bodyUnitPrice);

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing userId' });
  }
  if (!guildId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing guildId (and no default GUILD_ID configured)' });
  }
  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Missing symbol' });
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid quantity (must be a positive integer)' });
  }
  if (!Number.isFinite(priceInput) || priceInput <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid unitPrice' });
  }

  const unitPrice = Math.round(priceInput); // cents not supported
  const totalCost = unitPrice * quantity;

  const client = new Client(config.UNBELIEVABOAT_TOKEN);
  try {
    const balance = await client.getUserBalance(guildId, userId);
    const bank: number = Number((balance as any)?.bank ?? 0);
    if (!Number.isFinite(bank)) {
      throw createError({ statusCode: 502, statusMessage: 'Invalid balance shape from provider' });
    }
    if (bank < totalCost) {
      throw createError({ statusCode: 400, statusMessage: `Fonds insuffisants, totalCost = ${totalCost} - bank = ${bank}` });
    }

    // Debit directly from bank, include reason in body
    const reason = bodyReason || `Achat de ${quantity} actions ${symbol}`;
    // eslint-disable-next-line object-shorthand
    await client.editUserBalance(guildId, userId, { bank: -totalCost }, reason);

    return {
      ok: true,
      symbol,
      quantity,
      unitPrice,
      totalCost,
    };
  } catch (err: any) {
    if (err?.statusCode) {
      throw err;
    }
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Achat impossible' });
  }
});
