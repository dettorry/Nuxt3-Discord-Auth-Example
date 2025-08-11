export function useUnbBalance() {
  const balance = useState<any>('unb-balance', () => null);
  const loading = useState<boolean>('unb-balance-loading', () => false);
  const error = useState<string | null>('unb-balance-error', () => null);
  const timerId = useState<number | null>('unb-balance-timer', () => null);

  async function refresh(userId?: string, guildId?: string) {
    if (!userId) {
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await $fetch<{ balance: any }>('/api/balance', {
        params: { userId, guildId },
      });
      balance.value = data?.balance ?? null;
    } catch (e: any) {
      error.value = e?.message || 'Erreur lors du rafraîchissement du solde';
    } finally {
      loading.value = false;
    }
  }

  function start(userId?: string, guildId?: string, intervalMs = 15000) {
    stop();
    if (process.client) {
      // Kick-off immediately, then poll
      refresh(userId, guildId);
      timerId.value = window.setInterval(() => refresh(userId, guildId), intervalMs) as unknown as number;
    }
  }

  function stop() {
    if (process.client && timerId.value != null) {
      window.clearInterval(timerId.value as number);
      timerId.value = null;
    }
  }

  // Optimistic local update of balance to make UI feel instant
  function applyDelta(delta: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current: any = balance.value || { bank: 0, cash: 0, total: 0 };
    const bank = Number(current.bank ?? 0) + delta;
    const cash = Number(current.cash ?? 0);
    const total = Number(current.total ?? bank + cash) + delta;
    balance.value = {
      ...current,
      bank,
      cash,
      total,
    };
  }

  // Set entire balance object from server
  function setBalance(newBalance: any) {
    balance.value = newBalance;
  }

  return {
    balance,
    loading,
    error,
    refresh,
    start,
    stop,
    applyDelta,
    setBalance,
  };
}
