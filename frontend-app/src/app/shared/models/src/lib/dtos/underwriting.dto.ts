export type UnderwritingAppStatus = 'PENDING_REVIEW' | 'APPROVED_PENDING_PAYMENT' | 'APPROVED' | 'REJECTED';

export interface UnderwritingApplicationDTO {
  applicationId: string;
  quoteId: string;
  portfolioId: string;
  portfolioName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  riskScore: number;
  riskTier: string;
  portfolioValue: number;
  insuredValue: number;
  coverageAmount: number;
  coveragePercentage: number;
  annualPremium: number;
  premiumPercentage: number;
  deductible: number;
  status: UnderwritingAppStatus;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  policyId?: string;
  policyNumber?: string;
  beta?: number;
  volatilityScore?: number;
  concentrationScore?: number;
  maxDrawdownScore?: number;
  liquidityScore?: number;
  marketStressScore?: number;
  tenureYears?: number;
  waitingPeriodYears?: number;
}
