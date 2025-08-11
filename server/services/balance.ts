/**
 * Logique métier du solde utilisateur.
 * - Récupérer le solde
 * - Mettre à jour le solde (définir / incrémenter)
 *
 * Branchez votre persistance (Prisma, SQL, KV, etc.) via BalanceRepository.
 *
 * Note: Représentez l'argent en "centimes" (integer) si possible pour éviter les erreurs de flottants.
 */

export type UserId = string;
export type Money = number; // Recommandé: centimes

export interface BalanceRepository {
  /** Retourne le solde ou null s'il n'existe pas encore. */
  get(userId: UserId): Promise<Money | null>;
  /** Définit le solde à une valeur exacte. */
  set(userId: UserId, amount: Money): Promise<void>;
  /** Incrémente/décrémente le solde et retourne la nouvelle valeur. */
  increment?(userId: UserId, delta: Money): Promise<Money>;
}

export interface BalanceService {
  /** Retourne le solde courant. Peut lever une erreur si non trouvé. */
  getBalance(userId: UserId): Promise<Money>;
  /** Définit le solde à une valeur exacte. */
  setBalance(userId: UserId, amount: Money): Promise<void>;
  /** Ajoute (ou soustrait si négatif) un montant et retourne le nouveau solde. */
  addToBalance(userId: UserId, delta: Money): Promise<Money>;
}

/**
 * Fabrique un service de gestion de solde à partir d'un repository.
 * Implémentez la logique interne selon vos besoins (validation, limites, etc.).
 */
export function createBalanceService(_repo: BalanceRepository): BalanceService {
  return {
    getBalance(_userId: UserId): Promise<Money> {
      // TODO: implémentez la récupération; gérez le cas null => erreur ou valeur par défaut
      return Promise.reject<Money>(new Error('Not implemented'));
    },

    setBalance(_userId: UserId, _amount: Money): Promise<void> {
      // TODO: implémentez la mise à jour; pensez validation (>= 0 ?) et journalisation
      return Promise.reject<void>(new Error('Not implemented'));
    },

    addToBalance(_userId: UserId, _delta: Money): Promise<Money> {
      // TODO: implémentez l'incrément; utilisez repo.increment si dispo sinon lisez + écrivez
      return Promise.reject<Money>(new Error('Not implemented'));
    },
  };
}

/*
Exemple d'utilisation côté API (server route):

import { createBalanceService } from '~/server/services/balance';

// const repo: BalanceRepository = ... (Prisma, etc.)
// const balance = createBalanceService(repo);
// const current = await balance.getBalance(userId);
// const updated = await balance.addToBalance(userId, 500); // +5.00€ si en centimes
*/
