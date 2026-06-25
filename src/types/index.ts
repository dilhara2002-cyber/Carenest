export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalMothers: number;
  activePregnancies: number;
  totalChildren: number;
  upcomingVisits: number;
  pendingVaccinations: number;
  completedVisitsThisMonth: number;
}

export interface MotherWithRelations {
  id: string;
  userId: string;
  dateOfBirth: Date | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  emergencyName: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  needsSpecialAttention: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    profileImage: string | null;
  };
  assignedMidwife?: {
    id: string;
    user: {
      name: string;
      email: string;
      phone: string | null;
    };
  } | null;
  pregnancies: PregnancyData[];
  children: ChildData[];
}

export interface PregnancyData {
  id: string;
  expectedDeliveryDate: Date | null;
  lastMenstrualPeriod: Date | null;
  currentWeek: number | null;
  status: string;
  medicalNotes: string | null;
  highRisk: boolean;
  highRiskReasons: string | null;
  createdAt: Date;
}

export interface ChildData {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: Date;
  birthWeight: number | null;
  birthHeight: number | null;
  birthTime: string | null;
  birthPlace: string | null;
  healthNotes: string | null;
  image: string | null;
}

export interface VisitData {
  id: string;
  motherId: string;
  midwifeId: string;
  visitType: 'ANTENATAL' | 'POSTNATAL';
  visitDate: Date;
  notes: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  bloodPressure: string | null;
  weight: number | null;
  temperature: number | null;
  fetalHeartRate: number | null;
  symptoms: string | null;
  recommendations: string | null;
  postnatalVisitNumber?: number | null;
  postnatalWindowStart?: Date | string | null;
  postnatalWindowEnd?: Date | string | null;
  isPostnatalMandatory?: boolean;
  isMohVisitRequired?: boolean;
  childId?: string | null;
  child?: ChildData | null;
  mother?: {
    user: {
      name: string;
      email: string;
    };
  };
  midwife?: {
    user: {
      name: string;
    };
  };
}

export interface VaccinationData {
  id: string;
  motherId: string | null;
  childId: string | null;
  vaccineName: string;
  scheduledDate: Date;
  administeredDate: Date | null;
  status: 'PENDING' | 'COMPLETED' | 'MISSED';
  batchNumber: string | null;
  administeredBy: string | null;
  notes: string | null;
}

export interface ChatMessageData {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  sender: {
    name: string;
    profileImage: string | null;
    role: string;
  };
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  status: 'UNREAD' | 'READ';
  link: string | null;
  createdAt: Date;
}

export interface AICareResponse {
  foodSuggestions: string[];
  exerciseSuggestions: string[];
  firstAidInfo: string[];
  disclaimer: string;
}

// ============================================================
// DOCUMENT MANAGEMENT TYPES
// ============================================================

export interface DocumentType {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    documents: number;
  };
}

export interface Document {
  id: string;
  fileUrl: string;
  fileName: string;
  documentTypeId: string;
  motherId: string;
  uploadedAt: Date;
  documentType: DocumentType;
  mother?: MotherWithRelations;
}

export interface BulkUploadRequest {
  documentTypeId: string;
  files: File[];
}

export interface BulkUploadFailure {
  fileName: string;
  error: string;
}

export interface BulkUploadResult {
  successCount: number;
  failureCount: number;
  failures: BulkUploadFailure[];
  hasFailures: boolean;
  message?: string;
  errorReport?: string;
}

export interface DocumentUploadResponse extends ApiResponse<Document> {
  message?: string;
}

export interface DocumentListResponse extends ApiResponse<Document[]> {
  data: Document[];
}

export interface DocumentTypeResponse extends ApiResponse<DocumentType> {
  data: DocumentType;
}

export interface DocumentTypeListResponse extends ApiResponse<DocumentType[]> {
  data: DocumentType[];
}
