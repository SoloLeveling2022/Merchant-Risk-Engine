export type UserRole = 'ROLE_INVESTOR' | 'ROLE_UNDERWRITER' | 'ROLE_CLAIMS_ANALYST' | 'ROLE_COMPLIANCE' | 'ROLE_COMPLIANCE_OFFICER' | 'ROLE_ADMIN';

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'SUBMITTED';

export interface UserDTO {
  id: string;
  userId?: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: UserRole;
  kycStatus: KycStatus;
  isActive?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
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
