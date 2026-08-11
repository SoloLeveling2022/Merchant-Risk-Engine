export interface PortfolioHoldingDTO {
  id?: string;
  holdingId?: string;
  tickerSymbol: string;
  symbol?: string;
  assetName: string;
  quantity: number;
  averageBuyPrice: number;
  averagePrice?: number;
  currentMarketPrice?: number;
  totalCost?: number;
  currentValue?: number;
  unrealizedGainLoss?: number;
  unrealizedGainLossPercentage?: number;
  sector?: string;
  volatilityScore?: number;
  betaScore?: number;
}

export interface PortfolioDTO {
  id?: string;
  portfolioId?: string;
  userId: string;
  portfolioName: string;
  holdings?: PortfolioHoldingDTO[];
  totalInvestmentValue?: number;
  totalValue?: number;
  currentMarketValue?: number;
  totalGainLoss?: number;
  riskScore?: number; // 1-100
  portfolioStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManualHoldingItemDTO {
  tickerSymbol?: string;
  symbol?: string;
  assetName?: string;
  quantity: number;
  averageBuyPrice?: number;
  averagePrice?: number;
  sector?: string;
}

export interface ManualPortfolioRequestDTO {
  userId?: string;
  portfolioName: string;
  holdings: ManualHoldingItemDTO[];
}
