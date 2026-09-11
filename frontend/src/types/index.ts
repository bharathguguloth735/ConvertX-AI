// DocuFlow AI — TypeScript Type Definitions

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  plan: 'free' | 'student' | 'pro' | 'business' | 'enterprise';
  is_active: boolean;
  is_email_verified: boolean;
  storage_used_bytes: number;
  ai_requests_used: number;
  conversions_used: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface FileRecord {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  status: 'uploaded' | 'processing' | 'completed' | 'failed' | 'deleted';
  category?: string;
  tool_type?: string;
  is_output: boolean;
  download_url?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface Job {
  id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: Record<string, unknown>;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
  completed_at?: string;
  output_file_id?: string;
}

export interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ToolCategory;
  acceptedFormats: string[];
  route: string;
  isPremium?: boolean;
  isNew?: boolean;
}

export type ToolCategory = 'pdf' | 'document' | 'image' | 'audio' | 'video' | 'ai' | 'ocr' | 'text' | 'social';

export interface SocialMediaOption {
  id: string;
  label: string;
  format: string;
  quality: string;
  media_type: 'image' | 'video' | 'audio';
  file_size_approx?: number;
  downloadable: boolean;
}

export interface SocialMediaMetadata {
  id: string;
  platform: string;
  source_url: string;
  media_type: string;
  status: string;
  title?: string;
  author?: string;
  thumbnail_url?: string;
  video_preview_url?: string;
  duration?: number;
  is_public: boolean;
  options: SocialMediaOption[];
  message?: string;
}

export interface SocialMediaDownloadRecord {
  id: string;
  platform: string;
  source_url: string;
  media_type: string;
  status: string;
  title?: string;
  author?: string;
  filename?: string;
  file_size?: number;
  download_url?: string;
  created_at: string;
  expires_at?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  per_page: number;
  items: T[];
}

export interface ApiError {
  detail: string;
  status?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface ProcessingResult {
  status: 'completed' | 'processing';
  job_id?: string;
  output_file_id?: string;
  download_url?: string;
  filename?: string;
  size?: number;
  [key: string]: unknown;
}

// Invoice types
export interface InvoiceData {
  invoice_id: string;
  file_id: string;
  extracted: {
    invoice_number?: string;
    vendor_name?: string;
    vendor_address?: string;
    vendor_gstin?: string;
    customer_name?: string;
    customer_address?: string;
    invoice_date?: string;
    due_date?: string;
    currency?: string;
    subtotal?: number;
    tax_amount?: number;
    discount_amount?: number;
    total_amount?: number;
    payment_terms?: string;
    line_items?: LineItem[];
  };
  validation: {
    flags: ValidationFlag[];
    flag_count: number;
  };
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax?: number;
  amount: number;
}

export interface ValidationFlag {
  type: string;
  field?: string;
  message: string;
}

// Resume types
export interface ResumeData {
  candidate_name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  projects?: ProjectEntry[];
  ai_summary?: string;
  job_match_score?: number;
  missing_skills?: string[];
}

export interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  description?: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  year: string;
}

export interface ProjectEntry {
  name: string;
  description?: string;
  technologies?: string[];
}

// AI types
export interface AISummary {
  summary: string;
  style: string;
  ai_request_id: string;
}

export interface AskDocumentResponse {
  answer: string;
  sources: { page?: number }[];
  question: string;
}

// Analytics (Admin)
export interface AnalyticsData {
  users: { total: number; active: number };
  files: { total: number; total_storage_bytes: number };
  jobs: { total: number; completed: number; failed: number };
  top_tools: { tool: string; count: number }[];
  files_by_category: { category: string; count: number }[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  features: PlanFeature[];
  limits: PlanLimits;
}

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PlanLimits {
  conversions_per_month: number;
  storage_gb: number;
  ai_requests_per_month: number;
  max_file_size_mb: number;
  batch_processing: boolean;
  api_access: boolean;
}
