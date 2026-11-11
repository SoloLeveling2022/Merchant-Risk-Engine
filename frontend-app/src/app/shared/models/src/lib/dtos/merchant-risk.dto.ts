export interface SchemeRatioReportDTO {
  merchantId: string;
  visaVampRatioBps?: number;
  vampRatio?: string;
  visaVampTier?: 'COMPLIANT' | 'EARLY_WARNING' | 'EXCESSIVE';
  visaTotalCountMtd?: number;
  visaDisputeCountMtd?: number;
  visaEnumerationRatioBps?: number;
  visaEnumerationTier?: 'COMPLIANT' | 'EXCESSIVE';
  mastercardLaggedCtrBps?: number;
  ctrBps?: string;
  mastercardEcpTier?: 'COMPLIANT' | 'ECM' | 'HECM';
  mastercardChargebacksMtd?: number;
  mastercardSalesPrevMonth?: number;
  gmvSpikeDetected?: boolean;
  aovAnomalyDetected?: boolean;
  fulfillmentDipDetected?: boolean;
  refundSurgeDetected?: boolean;
  evaluatedAt?: string;
}

export interface ReservePolicyDTO {
  id?: string;
  merchantId: string;
  reserveType?: 'ROLLING' | 'CAPPED' | 'FIXED' | 'ADYEN_DEPOSIT';
  calculationBase?: 'GROSS' | 'NET_AFTER_FEES';
  withholdingBasis?: 'GROSS' | 'NET_AFTER_FEES';
  holdRate?: string | number;
  maturityDays?: number;
  capAmount?: number;
  active?: boolean;
  effectiveFrom?: string;
}

export interface ReserveTrancheDTO {
  id?: string;
  trancheId?: string;
  merchantId: string;
  policyId?: string;
  captureBatchRef?: string;
  captureDate?: string;
  maturityDate?: string;
  eligibleVolume?: string | number;
  holdRate?: string | number;
  initialAmount?: string | number;
  remainingAmount?: string | number;
  status: 'LOCKED' | 'MATURED_UNRELEASED' | 'MATURED_RELEASED' | 'DEPLETED' | 'DRAWN_DOWN';
}

export interface DisputeCaseDTO {
  id?: string;
  disputeId?: string;
  disputeRef?: string;
  networkDisputeRef?: string;
  merchantId: string;
  originalTxId?: string;
  scheme?: string;
  cardNetwork?: string;
  recordCode?: 'VISA_TC40' | 'VISA_TC15' | 'MC_FIRST_PRES' | 'RDR_PRE_DISPUTE' | string;
  reasonCode?: string;
  amount?: string | number;
  disputeAmount?: number;
  currency?: string;
  disputeFee?: number;
  ce30Eligible?: boolean;
  rdrResolved?: boolean;
  within24hFirstPayout?: boolean;
  bustOutRiskScore?: number;
  status: string;
  createdAt?: string;
  filedAt?: string;
}

export interface TrialBalanceReportDTO {
  merchantId: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  assetBalance?: number;
  liabilityBalance?: number;
  revenueBalance?: number;
  accountBalances?: Record<string, number>;
  generatedAt?: string;
}

export interface ControlTowerAlertDTO {
  id?: string;
  alertId?: string;
  type?: string;
  category?: string;
  region?: string;
  merchantId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  headline?: string;
  message?: string;
  detail?: string;
  metricValue?: number;
  timestamp: string;
}
