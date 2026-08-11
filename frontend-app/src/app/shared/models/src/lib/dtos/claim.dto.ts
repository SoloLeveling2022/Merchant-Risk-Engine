export type ClaimStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'DOCUMENTATION_REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAYOUT_INITIATED' | 'PAID' | 'PROCESSING' | 'SETTLED';

export interface ClaimDTO {
  id?: string;
  claimId?: string;
  claimNumber?: string;
  policyId?: string;
  userId?: string;
  initialPortfolioValue?: number;
  currentPortfolioValue?: number;
  baselineValue?: number;
  currentValue?: number;
  policyLimit?: number;
  actualLossAmount?: number;
  portfolioLoss?: number;
  grossLoss?: number;
  grossLossPct?: number;
  eligibleLoss?: number;
  claimableAmount?: number;
  coveragePercentage?: number;
  payoutAmount?: number;
  status?: ClaimStatus;
  claimStatus?: ClaimStatus;
  rejectionReason?: string;
  reviewerNotes?: string;
  submittedAt?: string;
  updatedAt?: string;
}

export interface ClaimSubmissionDTO {
  policyId?: string;
  userId?: string;
  currentPortfolioValue?: number;
  portfolioLoss?: number;
  proofDocumentUrl?: string;
  claimAmount?: number;
  claimReason?: string;
  notes?: string;
}
