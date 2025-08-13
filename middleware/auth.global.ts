import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app';

export default defineNuxtRouteMiddleware((to) => {
  // Autoriser uniquement l'accès à / et /auth/* sans être connecté
  const publicPages = ['/'];
  const isPublic = publicPages.includes(to.path) || to.path.startsWith('/auth');
  const { loggedIn } = useAuth();

  if (!loggedIn && !isPublic) {
    return navigateTo('/');
  }
  return undefined;
});
