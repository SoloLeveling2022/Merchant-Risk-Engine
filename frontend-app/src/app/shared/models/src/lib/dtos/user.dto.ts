export type UserRole = 
  | 'ROLE_MERCHANT_OWNER' 
  | 'ROLE_MERCHANT_FINANCE' 
  | 'ROLE_RISK_ANALYST' 
  | 'ROLE_RISK_ADMIN' 
  | 'ROLE_INVESTOR' 
  | 'ROLE_UNDERWRITER' 
  | 'ROLE_CLAIMS_ANALYST' 
  | 'ROLE_COMPLIANCE' 
  | 'ROLE_ADMIN';

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'RESTRICTED';

export interface UserDTO {
  id: string;
  merchantId?: string;
  userId?: string;
  email: string;
  fullName: string;
  mid?: string;
  mcc?: string;
  billingDescriptorPrefix?: string;
  role: UserRole;
  kycStatus: KycStatus;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponseDTO {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  id?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  roles?: string[];
  kycStatus?: KycStatus;
}

export interface LoginRequestDTO {
  email?: string;
  password?: string;
}

export interface RegisterRequestDTO {
  email?: string;
  password?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface KycSubmissionDTO {
  userId?: string;
  panNumber: string;
}
