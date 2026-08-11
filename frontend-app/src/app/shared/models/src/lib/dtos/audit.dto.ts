import { UserRole } from './user.dto';

export interface AuditLogDTO {
  id: string;
  action: string;
  service: string;
  performedBy: string;
  role: UserRole;
  details: string;
  ipAddress?: string;
  timestamp: string;
}
