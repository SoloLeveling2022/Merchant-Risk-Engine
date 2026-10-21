export interface SchemeRatioReportDTO {
  merchantId: string;
  visaVampRatioBps: number;
  visaVampTier: 'COMPLIANT' | 'EARLY_WARNING' | 'EXCESSIVE';
  visaTotalCountMtd: number;
  visaDisputeCountMtd: number;
  visaEnumerationRatioBps: number;
  visaEnumerationTier: 'COMPLIANT' | 'EXCESSIVE';
  mastercardLaggedCtrBps: number;
  mastercardEcpTier: 'COMPLIANT' | 'ECM' | 'HECM';
  mastercardChargebacksMtd: number;
  mastercardSalesPrevMonth: number;
  gmvSpikeDetected: boolean;
  aovAnomalyDetected: boolean;
  fulfillmentDipDetected: boolean;
  refundSurgeDetected: boolean;
  evaluatedAt: string;
}

export interface ReservePolicyDTO {
  id: string;
  merchantId: string;
  reserveType: 'ROLLING' | 'CAPPED' | 'FIXED' | 'ADYEN_DEPOSIT';
  calculationBase: 'GROSS' | 'NET_AFTER_FEES';
  holdRate: number;
  maturityDays: number;
  capAmount?: number;
  active: boolean;
  effectiveFrom: string;
}

export interface ReserveTrancheDTO {
  trancheId: string;
  merchantId: string;
  policyId: string;
  captureBatchRef: string;
  captureDate: string;
  maturityDate: string;
  initialAmount: number;
  remainingAmount: number;
  status: 'LOCKED' | 'MATURED_UNRELEASED' | 'MATURED_RELEASED' | 'DEPLETED';
}

export interface DisputeCaseDTO {
  disputeId: string;
  networkDisputeRef: string;
  merchantId: string;
  originalTxId: string;
  cardNetwork: string;
  recordCode: 'VISA_TC40' | 'VISA_TC15' | 'MC_FIRST_PRES' | 'RDR_PRE_DISPUTE';
  reasonCode: string;
  disputeAmount: number;
  disputeFee: number;
  ce30Eligible: boolean;
  within24hFirstPayout: boolean;
  bustOutRiskScore: number;
  status: 'OPEN' | 'RDR_REFUNDED' | 'REPRESENTMENT_SUBMITTED' | 'WON' | 'LOST';
  filedAt: string;
}

export interface TrialBalanceReportDTO {
  merchantId: string;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  assetBalance: number;
  liabilityBalance: number;
  revenueBalance: number;
  accountBalances: Record<string, number>;
  generatedAt: string;
}

export interface ControlTowerAlertDTO {
  alertId: string;
  category: string;
  region: string;
  merchantId: string;
  severity: string;
  headline: string;
  detail: string;
  metricValue: number;
  timestamp: string;
}
