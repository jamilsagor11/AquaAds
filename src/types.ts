export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  companyName?: string;
  createdAt: string;
}

export type CampaignStatus = 'pending' | 'approved' | 'rejected';

export interface Campaign {
  id: string;
  userId: string;
  campaignName: string;
  companyName: string;
  area: string;
  bottles: number;
  sides: number;
  designUrl: string;
  targetAudience: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: CampaignStatus;
  createdAt: string;
}

export interface Area {
  id: string;
  name: string;
  basePrice: number;
}

export interface SupportRequest {
  id: string;
  userId?: string;
  userEmail: string;
  message: string;
  adminReply?: string;
  repliedAt?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
