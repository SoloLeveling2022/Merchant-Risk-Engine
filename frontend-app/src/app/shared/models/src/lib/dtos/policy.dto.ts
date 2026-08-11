export type PolicyStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'IN_WAITING_PERIOD' | 'MATURED' | 'CLAIMED' | 'CANCELLED' | 'EXPIRED' | 'COVERAGE_ACTIVE' | 'PROTECTION_ACTIVE' | 'CLAIM_ELIGIBLE' | 'ENDORSEMENT_PENDING';

export interface PolicyTrancheProgressDTO {
  trancheId?: string;
  policyId?: string;
  trancheNumber: number;
  trancheType?: string;
  vestingYear?: number;
  effectiveDate?: string;
  waitingPeriodYears?: number;
  eligibilityDate?: string;
  vestingDate?: string;
  riskScore?: number;
  coveragePercentage?: number;
  premiumPercentage?: number;
  insuredValue?: number;
  trancheStatus?: string;
  coveredSymbols?: string;
  isUnlocked?: boolean;
  unlockedAmount?: number;
}

export interface PolicyDTO {
  id?: string;
  policyId?: string;
  policyNumber?: string;
  userId?: string;
  portfolioId?: string;
  quoteId?: string;
  insuredValue?: number;
  totalInsuredValue?: number;
  coverageAmount?: number;
  coverageLimit?: number;
  portfolioValue?: number;
  annualPremium?: number;
  premiumAmount?: number;
  deductiblePercentage?: number;
  coveragePercentage?: number;
  premiumPercentage?: number;
  riskScore?: number;
  status?: PolicyStatus;
  policyStatus?: PolicyStatus;
  premiumStatus?: string;
  nextPremiumDueDate?: string;
  startDate?: string;
  policyStartDate?: string;
  policyEndDate?: string;
  coverageStartDate?: string;
  waitingPeriodEndDate?: string;
  protectionStartDate?: string;
  waitingPeriodYears?: number;
  eligibilityDate?: string;
  daysRemainingInWaitingPeriod?: number;
  tranches?: PolicyTrancheProgressDTO[];
  tenureYears?: number;
  remainingClaimableAmount?: number;
  currentVestedCoveragePercentage?: number;
  currentVestedCoverageAmount?: number;
  unrealizedGainLoss?: number;
  createdAt?: string;
}
