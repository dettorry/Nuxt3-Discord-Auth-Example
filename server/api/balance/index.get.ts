import { H3Event, getQuery } from 'h3';
import UnbApi from 'unb-api';

const { Client } = UnbApi as unknown as { Client: new (...args: any[]) => any };

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig() as unknown as {
    UNBELIEVABOAT_TOKEN?: string;
    GUILD_ID?: string;
  };

  const { userId: qUserId, guildId: qGuildId } = getQuery(event) as { userId?: string; guildId?: string };
  const userId = qUserId;
  const guildId = qGuildId || config.GUILD_ID;

  if (!config.UNBELIEVABOAT_TOKEN) {
    throw createError({ statusCode: 500, statusMessage: 'Server token is not configured' });
  }

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing userId' });
  }
  if (!guildId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing guildId (and no default GUILD_ID configured)' });
  }

  const client = new Client(config.UNBELIEVABOAT_TOKEN);
  try {
    const balance = await client.getUserBalance(guildId, userId);
    return { balance };
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Failed to fetch balance' });
  }
});
