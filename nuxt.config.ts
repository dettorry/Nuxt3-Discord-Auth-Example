// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt-alt/auth',
    '@pinia/nuxt',
  ],
  runtimeConfig: {
    // Server-only runtime secrets
    UNBELIEVABOAT_TOKEN: process.env.UNBELIEVABOAT_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    GUILD_ID: process.env.GUILD_ID,
    public: {
      // Put client-exposed vars here if ever needed
    },
  },
  auth: {
    redirect: {
      login: '/auth/login',
      logout: '/auth/logout',
      home: '/',
      callback: '/auth/callback',
    },
    strategies: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        scope: ['identify', 'guilds', 'guilds.join'],
      },
    },
  },
});
