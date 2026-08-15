import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditCard, CardRecommendation } from '@wertbot/shared-types';

// =============================================================================
// Card Intelligence Matrix Service
// 
// Implements real-time credit card optimization:
// Given a transaction (merchant + MCC code + amount), returns the optimal card
// to swipe to maximize rewards, cashback, or points.
// =============================================================================

interface CardScore {
  card: CreditCard;
  multiplier: number;
  rewardCategory: string;
  estimatedRewardMinor: number;
}

@Injectable()
export class CardMatrixService {
  private readonly logger = new Logger(CardMatrixService.name);

  // MCC range mappings for broad category matching
  private readonly MCC_RANGE_MAPPINGS = [
    { min: 3000, max: 3299, category: 'airline' },
    { min: 3300, max: 3499, category: 'car_rental' },
    { min: 3500, max: 3999, category: 'hotel' },
    { min: 5310, max: 5399, category: 'discount_stores' },
    { min: 5400, max: 5499, category: 'groceries' },
    { min: 5900, max: 5999, category: 'shopping' },
    { min: 7011, max: 7011, category: 'hotel' },
    { min: 8000, max: 8099, category: 'health' },
  ];

  constructor(private readonly configService: ConfigService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Core: Get the best card to use for a transaction
  // ─────────────────────────────────────────────────────────────────────────

  getRecommendation(
    userCards: CreditCard[],
    merchantMcc: string,
    merchantName: string,
    amountMinor: number,
  ): CardRecommendation {
    const fallback: CardRecommendation = {
      cardId: '',
      cardName: 'Cash/Fallback',
      issuer: 'none',
      rewardRate: 1,
      rewardType: 'cashback',
      rewardProgram: 'none',
      estimatedReward: 0,
      reasoning: 'Use cash or fallback card (1x rewards).',
    };

    if (!userCards || userCards.length === 0) {
      return fallback;
    }

    const activeCards = userCards.filter((c) => c.isActive);
    if (activeCards.length === 0) {
      return fallback;
    }

    const scores: CardScore[] = activeCards.map((card) =>
      this.scoreCard(card, merchantMcc, amountMinor),
    );

    // Sort by estimated reward descending
    scores.sort((a, b) => b.estimatedRewardMinor - a.estimatedRewardMinor);

    const best = scores[0];

    return {
      cardId: best.card.id,
      cardName: best.card.cardName,
      issuer: best.card.issuer || 'unknown',
      rewardRate: best.multiplier,
      rewardType: 'points',
      rewardProgram: 'rewards',
      estimatedReward: best.estimatedRewardMinor,
      reasoning: this.buildReasonString(best, amountMinor),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Score a single card against a merchant MCC
  // ─────────────────────────────────────────────────────────────────────────

  private scoreCard(card: CreditCard, merchantMcc: string, amountMinor: number): CardScore {
    // 1. Check exact MCC match first
    if (card.mccMultipliers && card.mccMultipliers[merchantMcc]) {
      const multiplier = card.mccMultipliers[merchantMcc];
      return {
        card,
        multiplier,
        rewardCategory: this.getMccCategory(merchantMcc),
        estimatedRewardMinor: Math.floor(amountMinor * (multiplier / 100)),
      };
    }

    // 2. Check MCC range matches
    const mccNum = parseInt(merchantMcc, 10);
    if (!isNaN(mccNum)) {
      for (const range of this.MCC_RANGE_MAPPINGS) {
        if (mccNum >= range.min && mccNum <= range.max) {
          const categoryKey = range.category;
          if (card.rewardCategories && card.rewardCategories[categoryKey]) {
            const multiplier = card.rewardCategories[categoryKey];
            return {
              card,
              multiplier,
              rewardCategory: categoryKey,
              estimatedRewardMinor: Math.floor(amountMinor * (multiplier / 100)),
            };
          }
        }
      }
    }

    // 3. Fall back to base reward rate
    const baseMultiplier = card.rewardCategories ? (card.rewardCategories['other'] ?? 1) : 1;
    return {
      card,
      multiplier: baseMultiplier,
      rewardCategory: 'base',
      estimatedRewardMinor: Math.floor(amountMinor * (baseMultiplier / 100)),
    };
  }

  private getMccCategory(mcc: string): string {
    const mccMap: Record<string, string> = {
      '5411': 'groceries',
      '5812': 'dining',
      '5813': 'dining',
      '5814': 'dining',
      '4511': 'airline',
      '7011': 'hotel',
      '5541': 'gas',
      '4111': 'transit',
      '5912': 'pharmacy',
    };
    return mccMap[mcc] ?? 'general';
  }

  private buildReasonString(score: CardScore, amountMinor: number): string {
    const rewardValue = (score.estimatedRewardMinor / 100).toFixed(2);
    const category = score.rewardCategory === 'base' ? 'all purchases' : score.rewardCategory;

    if (score.multiplier <= 1) {
      return `Earns ${score.multiplier}x points on ${category} (~$${rewardValue} value)`;
    }

    return `Earns ${score.multiplier}x points on ${category} — ~$${rewardValue} reward value`;
  }
}
