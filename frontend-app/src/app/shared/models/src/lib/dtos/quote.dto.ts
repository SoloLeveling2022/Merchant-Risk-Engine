export interface RiskTierDTO {
  tierName: string;
  minScore: number;
  maxScore: number;
  min?: number;
  max?: number;
  annualPremiumPercentage: number;
  premium?: number;
  maxCoverageCapPercentage: number;
  coverage?: number;
  deductiblePercentage: number;
  description: string;
}

export const RISK_MATRIX: RiskTierDTO[] = [
  {
    tierName: 'LOW_RISK',
    minScore: 0,
    maxScore: 200,
    min: 0,
    max: 200,
    annualPremiumPercentage: 1.5,
    premium: 1.5,
    maxCoverageCapPercentage: 80,
    coverage: 80,
    deductiblePercentage: 5,
    description: 'Highly diversified portfolio with low beta & blue-chip equity allocation.'
  },
  {
    tierName: 'MODERATE_RISK',
    minScore: 201,
    maxScore: 400,
    min: 201,
    max: 400,
    annualPremiumPercentage: 2.0,
    premium: 2.0,
    maxCoverageCapPercentage: 70,
    coverage: 70,
    deductiblePercentage: 10,
    description: 'Balanced equity portfolio with moderate sector concentration.'
  },
  {
    tierName: 'HIGH_RISK',
    minScore: 401,
    maxScore: 600,
    min: 401,
    max: 600,
    annualPremiumPercentage: 3.0,
    premium: 3.0,
    maxCoverageCapPercentage: 60,
    coverage: 60,
    deductiblePercentage: 15,
    description: 'Concentrated growth or mid-cap heavy portfolio.'
  },
  {
    tierName: 'VERY_HIGH_RISK',
    minScore: 601,
    maxScore: 800,
    min: 601,
    max: 800,
    annualPremiumPercentage: 5.0,
    premium: 5.0,
    maxCoverageCapPercentage: 50,
    coverage: 50,
    deductiblePercentage: 20,
    description: 'High volatility equity portfolio with elevated drawdown risk.'
  },
  {
    tierName: 'CRITICAL_RISK',
    minScore: 801,
    maxScore: 1000,
    min: 801,
    max: 1000,
    annualPremiumPercentage: 8.0,
    premium: 8.0,
    maxCoverageCapPercentage: 40,
    coverage: 40,
    deductiblePercentage: 25,
    description: 'Extremely volatile asset distribution requiring maximum risk premium.'
  }
];

export interface QuoteRequestDTO {
  userId?: string;
  portfolioId: string;
  coverageCapPercentage?: number;
  policyDurationYears?: number;
  coverageType?: string;
}

export interface TrancheDefinitionDTO {
  trancheNumber: number;
  vestingYear: number;
  coveragePercentage: number;
  description: string;
}

export interface QuoteDTO {
  id?: string;
  quoteId?: string;
  portfolioId: string;
  userId: string;
  portfolioValue?: number;
  riskScore?: number;
  riskTier?: string;
  coverageCapPercentage?: number;
  coveragePercentage?: number;
  premiumPercentage?: number;
  insuredValue?: number;
  coverageAmount?: number;
  coverageLimit?: number;
  annualPremium?: number;
  premiumAmount?: number;
  totalFiveYearPremium?: number;
  deductiblePercentage?: number;
  deductibleAmount?: number;
  deductible?: number;
  tenureYears?: number;
  waitingPeriodYears?: number;
  tranches?: TrancheDefinitionDTO[];
  createdAt?: string;
  expiresAt?: string;
}
