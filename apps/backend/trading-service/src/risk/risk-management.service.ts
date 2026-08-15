import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OrderSide, OrderType, AssetClass } from '@wertbot/shared-types';

export interface RiskCheckParams {
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  side: OrderSide;
  orderType: OrderType;
  quantityMinor: number;
  limitPrice?: string;
  stopPrice?: string;
}

@Injectable()
export class RiskManagementService {
  private readonly logger = new Logger(RiskManagementService.name);

  // Maximum allowed minor units per order ($1,000,000 equivalent)
  private readonly MAX_QUANTITY_MINOR = 100_000_000;

  /**
   * Evaluates an order against risk rules before routing to exchanges.
   * Throws BadRequestException if any pre-trade risk policy is violated.
   */
  validateOrder(params: RiskCheckParams): boolean {
    if (!params.symbol || params.symbol.trim() === '') {
      throw new BadRequestException('Order rejected: Symbol cannot be empty.');
    }

    if (params.quantityMinor <= 0) {
      throw new BadRequestException('Order rejected: Quantity must be greater than zero.');
    }

    if (params.quantityMinor > this.MAX_QUANTITY_MINOR) {
      this.logger.warn(`Risk Breach: User ${params.userId} attempted order size ${params.quantityMinor}`);
      throw new BadRequestException(`Order rejected: Exceeds maximum risk limit of ${this.MAX_QUANTITY_MINOR} units.`);
    }

    if (params.orderType === OrderType.LIMIT && (!params.limitPrice || parseFloat(params.limitPrice) <= 0)) {
      throw new BadRequestException('Order rejected: Limit price is required for LIMIT orders.');
    }

    if (params.orderType === OrderType.STOP_LOSS && (!params.stopPrice || parseFloat(params.stopPrice) <= 0)) {
      throw new BadRequestException('Order rejected: Stop price is required for STOP_LOSS orders.');
    }

    this.logger.log(`✅ Risk check passed for ${params.userId}: ${params.side} ${params.symbol}`);
    return true;
  }
}
