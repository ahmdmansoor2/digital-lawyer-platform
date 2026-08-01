/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CaseType {
  CIVIL = 'مدني',
  CRIMINAL = 'جنائي',
  PERSONAL_STATUS = 'أسرة وأحوال شخصية',
  ADMINISTRATIVE = 'مجلس الدولة (إداري)',
  COMMERCIAL = 'تجاري وضريبي',
  LABOR = 'عمالي',
}

export enum LitigationLevel {
  FIRST_INSTANCE = 'ابتدائي (جزئي/كلي)',
  APPEAL = 'استئناف عالي',
  CASSATION = 'نقض',
}

export enum CaseStatus {
  ACTIVE = 'متداولة',
  PLEADING = 'محجوزة للحكم',
  DISMISSED = 'مشطوبة',
  CLOSED = 'منتهية ومحفوظة',
}

export enum ClientRole {
  PLAINTIFF = 'مدعي / طالب',
  DEFENDANT = 'مدعى عليه / مطلوب',
  ACCUSED = 'متهم',
  VICTIM = 'مجني عليه',
}

export interface PowerOfAttorney {
  id: string;
  poaNumber: string; // رقم التوكيل (مثال: 1245 {أ} لسنة 2024)
  office: string; // مكتب التوثيق (مثال: مكتب توثيق الأهرام)
  type: 'عام قضايا' | 'خاص قضايا' | 'توكيل شامل';
  date: string; // تاريخ الصدور
}

export interface ClientAttachment {
  id: string;
  name: string;
  fileType: string; // e.g. "image/png", "application/pdf"
  size: number;
  dataUrl: string; // base64 representation or standard URL
  uploadedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  nationalId: string; // الرقم القومي (14 رقم)
  address: string;
  email?: string;
  poas: PowerOfAttorney[];
  notes?: string;
  createdAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  attachments?: ClientAttachment[];
  fileNumber?: string; // رقم الملف الورقي للترتيب والتنظيم
  qrData?: string; // بيانات QR للملف (إن وجد)
  customFieldValues?: Record<string, any>;
}

export interface Case {
  id: string;
  caseNumber: string; // رقم القضية (مثال: 5674 لسنة 2024)
  year: string; // السنة القضائية
  court: string; // المحكمة والفرع (مثال: شمال القاهرة الكلية)
  circuit: string; // الدائرة (مثال: 12 مدني كلي)
  type: CaseType;
  litigationLevel: LitigationLevel;
  clientId: string;
  clientName: string;
  clientRole: ClientRole;
  opponentId?: string; // رابط للخصم المسجل في قسم الخصوم
  opponentName: string; // اسم الخصم
  opponentLawyer?: string; // محامي الخصم
  status: CaseStatus;
  claimSubject: string; // موضوع الدعوى
  notes?: string;
  totalFees: number; // إجمالي الأتعاب المتفق عليها
  paidFees: number; // المسدد من الأتعاب
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  attachments?: ClientAttachment[];
  fileNumber?: string;
  qrData?: string;
  legalReferences?: LegalReference[];
  customFieldValues?: Record<string, any>;
}

export interface Session {
  id: string;
  caseId: string;
  caseNumber: string;
  clientName: string;
  date: string; // تاريخ الجلسة YYYY-MM-DD
  court: string;
  circuit: string;
  objective: string; // المطلوب بالجلسة / القرار السابق لتهيئة الدعوى
  decision?: string; // ما تم بالجلسة وقرار المحكمة الجديد
  status: 'قادمة' | 'منتهية';
  judgeName?: string;
  notes?: string;
  googleEventId?: string; // معرف الحدث في تقويم جوجل بعد المزامنة
  time?: string; // وقت الجلسة (مثال: 10:00)
  customFieldValues?: Record<string, any>;
}

export interface Transaction {
  id: string;
  caseId?: string;
  caseNumber?: string;
  clientName: string;
  type: 'أتعاب' | 'مصروفات دعوى' | 'مصاريف مكتب تشغيلية' | 'متفرقات' | string;
  ioType: 'وارد' | 'صادر' | 'وارد (income)' | 'صادر (expense)';
  amount: number; // المبلغ بالجنيه المصري EGP
  date: string;
  description: string;
  paymentMethod?: 'نقدي' | 'فودافون كاش / محفظة' | 'تحويل بنكي' | 'شيك';
  customFieldValues?: Record<string, any>;
}

export interface LegalTemplatePlaceholder {
  key: string;
  label: string;
  type: 'text' | 'date';
  defaultValue?: string;
}

export interface LegalTemplate {
  id: string;
  title: string;
  category: 'صحف دعاوى' | 'عقود واتفاقيات' | 'إنذارات وطلبات' | 'مذكرات دفاعية';
  description: string;
  body: string; // النص الأصلي ويحتوي على علامات مثل {{اسم_الموكل}}
  placeholders: LegalTemplatePlaceholder[];
}

export interface LegalDeadline {
  id: string;
  caseId: string;
  caseNumber: string;
  clientName: string;
  title: string; // ميعاد الاستئناݡ ميعاد الطعن بالنق֡ الطعن بالإلغاء
  startDate: string; // تاريخ استلام الحكم أو الإعلان YYYY-MM-DD
  deadlineDate: string; // تاريخ انتهاء الميعاد الفعلي YYYY-MM-DD
  lawReference: string; // السند القانوني (المادة بموجب القانون المصري)
  isCompleted: boolean;
  notes?: string;
  googleEventId?: string; // معرف الحدث في تقويم جوجل بعد المزامنة
}

export interface LawTask {
  id: string;
  title: string;
  description: string;
  caseId: string;
  caseNumber: string;
  assignedTo: string; // المستشار أو المحامي المسؤول
  dueDate: string; // تاريخ الاستحقاق YYYY-MM-DD
  status: 'pending' | 'completed';
  createdAt: string;
  time?: string; // وقت إتمام أو تسليم المهمة (مثال: 14:00)
  customFieldValues?: Record<string, any>;
}

export interface LawDocument {
  id: string;
  name: string; // اسم المستند
  type: 'عريضة دعوى' | 'حكم قضائي' | 'مذكرة دفاع' | 'توكيل رسمي' | 'تقرير خبراء' | 'مستندات ملكية' | 'أخرى';
  fileName: string;
  fileSize: string;
  caseId?: string;
  caseNumber?: string;
  clientId?: string;
  clientName?: string;
  bailiffPaperId?: string;
  bailiffPaperNumber?: string;
  uploadedAt: string; // تاريخ الرفع YYYY-MM-DD
  notes?: string;
  scannedTextByAI?: string; // OCR text simulation
  dataUrl?: string; // محتوى الملف الفعلي بصيغة base64 لعرضه في المعاينة
  isArchived?: boolean;
  archivedAt?: string;
}

export interface HourLog {
  id: string;
  caseId: string;
  caseNumber: string;
  clientName: string;
  lawyerName: string;
  date: string; // YYYY-MM-DD
  hours: number; // الساعات المبذولة
  hourlyRate: number; // سعر الساعة بالجنيه المصري
  description: string; // عمل ومطالعة ومرافعات موضوعية
  isBilled: boolean;
  invoiceId?: string;
}

export interface Invoice {
  id: string; // الرقم الضريبي التسلسلي للفاتورة INV-2026-0001
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientNationalId: string;
  clientAddress: string;
  date: string; // تاريخ التحرير
  dueDate: string; // تاريخ الاستحقاق
  hourLogs: HourLog[];
  subtotal: number;
  taxRate: number; // نسبة الضريبة المضافة (مثل 14%)
  taxAmount: number;
  discount: number; // الخصومات بالجنيه المصري
  additionalFees: number; // رسوم إضافية تابعة (دمغاʡ انتقال، الخ)
  additionalFeesDescription?: string;
  grandTotal: number;
  status: 'غير مدفوعة' | 'مدفوعة بالكامل' | 'ملغاة';
  notes?: string;
}

export interface LegalCategory {
  id: string;
  name: string; // e.g. "القانون المدني", "القانون الجنائي"
  icon?: string;
  color?: string;
  subCategories?: LegalCategory[];
}

export interface LawArticle {
  id: string;
  lawName: string;
  articleNumber: string;
  content: string;
  chapterName?: string;
  tags?: string[];
  bookId?: string; // ربط بالكتاب القانوني
  linkedCases?: string[]; // معرفات القضايا المرتبطة
  notes?: string;
}

export interface CourtPrecedent {
  id: string;
  category: 'جنائي' | 'مدني' | 'أحوال شخصية' | 'مجلس دولة';
  principle: string;
  courtName: string;
  rulingNumber: string;
  rulingDate: string;
  detailedDecision: string;
  tags?: string[];
  linkedCases?: string[];
  notes?: string;
}

export interface LegalBook {
  id: string;
  title: string;
  author?: string;
  description: string;
  category: string;
  tags: string[];
  chapters: LegalChapter[];
  createdAt: string;
  updatedAt: string;
  fileDataUrl?: string; // محتوى الكتاب كاملاً (PDF/Word) للاستيراد
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  source?: 'mock' | 'custom' | 'imported';
  extractedText?: string; // النص المستخرج بالكامل لتسهيل البحث المتقدم والـ OCR
  folderId?: string;
}

export interface BookFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface LegalChapter {
  id: string;
  title: string;
  articles: LawArticle[];
}

export interface LegalReference {
  type: 'law' | 'precedent' | 'book';
  id: string;
  label: string; // e.g. "المادة ١ مدني", "الطعن رقم ١٥٢٥٨ لسنة ٨٢ ق"
  articleNumber?: string;
}

export interface OfficeProfile {
  officeName: string;
  managingPartner: string;
  barId: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  courtJurisdiction: string;
  logoDataUrl?: string; // شعار المكتب (Base64 PNG)
  officeStampImage?: string; // صورة الخاتم الرسمي (Base64)
}

/**
 * v2.9.10: LawyerProfile — بيانات المحامي الفردية (multi-tenant)
 * محفوظة في Firestore: users/{userId}/profile/data
 * كل محامي له profile منفصل عن بيانات المكتب.
 */
export interface LawyerProfile {
  uid: string;
  displayName: string;        // الاسم الظاهر
  fullName: string;            // الاسم الكامل (الرباعي)
  email: string;               // الإيميل (من Firebase Auth)
  phone: string;               // رقم التليفون
  nationalId: string;          // الرقم القومي
  barRegistrationNumber: string; // رقم القيد بنقابة المحامين
  syndicate: string;           // النقابة الفرعية (مثال: "نقابة محامي جنوب القاهرة")
  specialty: string[];         // التخصصات (مثال: ["مدني", "تجاري", "عمالي"])
  yearsOfExperience: number;   // سنوات الخبرة
  bio: string;                 // نبذة شخصية
  officeAddress: string;       // عنوان المكتب
  photoURL?: string;           // رابط الصورة (Firebase Storage)
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

export interface TypographySettings {
  fontFamily: string;
  fontSizeMultiplier: number;
  textColor: string;
}

/**
 * نوع بيانات الخصم (المدعى عليه / الخصم في الدعوى).
 * منفصل عن العميل لأن الخصم له دورة حياة مختلفة —
 * يتم تسجيله عند بدء القضية وتُربط به كل القضايا اللاحقة.
 */
export type OpponentType =
  | 'فرد'                // شخص طبيعي
  | 'شركة'              // شركة / مؤسسة
  | 'جهة حكومية'        // وزارة / محافظة / هيئة
  | 'منظمة غير هادفة'   // جمعية / نقابة / حزب
  | 'شراكة'             // شركة أشخاص
  | 'صندوق';            // صندوق استئماني / تقاعد

export type OpponentRiskLevel = 'منخفض' | 'متوسط' | 'مرتفع' | 'حرج';

export interface OpponentContact {
  id: string;
  name: string;            // اسم جهة الاتصال (المحامي، المديѡ إلخ)
  role: string;            // صفته (مديѡ محامي، مفوض)
  phone?: string;
  email?: string;
}

export interface Opponent {
  id: string;
  /** الاسم الكامل بالعربية */
  fullName: string;
  /** نوع الخصم (فرد / شركة / إلخ) */
  type: OpponentType;
  /** الرقم القومي للأفراد */
  nationalId?: string;
  /** السجل التجاري للشركات */
  commercialRecord?: string;
  /** رقم التسجيل الضريبي */
  taxId?: string;
  /** عنوان المقر الرئيسي */
  address: string;
  /** المدينة / المحافظة */
  city: string;
  /** هاتف رئيسي */
  phone: string;
  /** هاتف بديل */
  altPhone?: string;
  /** بريد إلكتروني */
  email?: string;
  /** فاكس (للجهات الحكومية والشركات) */
  fax?: string;
  /** الموقع الإلكتروني */
  website?: string;
  /** محامي الخصم (إن وُجد) */
  opponentLawyer?: string;
  /** هاتف محامي الخصم */
  opponentLawyerPhone?: string;
  /** مكتب محامي الخصم */
  opponentLawyerOffice?: string;
  /** جهات اتصال إضافية */
  contacts?: OpponentContact[];
  /** مستوى الخطورة / السمعة القانونية */
  riskLevel: OpponentRiskLevel;
  /** ملاحظات عامة */
  notes?: string;
  /** مصدر البيانات */
  source: 'mock' | 'manual' | 'imported';
  /** تاريخ التسجيل */
  createdAt: string;
  /** آخر تحديث */
  updatedAt: string;
  /** هل مؤرشف */
  isArchived?: boolean;
  /** تاريخ الأرشفة */
  archivedAt?: string;
  /** مرفقات (صور وثائق هويɡ سجل تجاري، إلخ) */
  attachments?: ClientAttachment[];
  customFieldValues?: Record<string, any>;
}

export type ExecutionType = 'judgment' | 'appeal' | 'cassation' | 'enforcement' | 'settlement' | 'objection' | 'primary_judgment' | 'executive_order' | 'payment_order';

export type ExecutionStatus = 'pending' | 'in_progress' | 'appeal_filed' | 'suspended' | 'completed' | 'cancelled' | 'challenged' | 'executed';

export interface ExecutionStep {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'cancelled';
  dueDate?: string;
  completedAt?: string;
}

export interface Execution {
  id: string;
  caseId: string;
  caseNumber: string;
  clientName: string;
  type: ExecutionType;
  status: ExecutionStatus;
  court: string;
  circuit?: string;
  judgmentNumber?: string;
  judgmentDate?: string;
  judgmentText?: string;
  judgeName?: string;
  amount?: number;
  fees?: number;
  totalAmount?: number;
  currency?: string;
  appealDeadline?: string;
  executionDeadline?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  enforceabilityStatus?: string;
  steps?: ExecutionStep[];
  customFieldValues?: Record<string, any>;
}

export interface BailiffPaper {
  id: string;
  title: string; // موضوع وعنوان الإعلان ورقة المحضُرين
  paperNumber: string; // رقم الإعلان / المحضرين
  submissionDate: string; // تاريخ تقديم للمحضرين
  receiptDate: string; // تاريخ الاستلام
  courtName: string; // المحكمة التابع لها المحضرين
  courtLocation: string; // مكان المحكمة
  status: 'تم الاستلام والتسليم' | 'قيد الإعلان والتسليم' | 'مرتد لعدم الاستدلال' | 'مؤجل للإعادة';
  opponentName?: string; // اسم الخصم المعلن إليه
  opponentAddress?: string; // عنوان المعلن إليه (لطباعة الظرف)
  envelopeType?: 'إعلان قضائي' | 'إنذار' | 'تكليف بالحضور' | 'خطاب رسمي'; // نوع الظرف
  deliveryMethod?: 'محضرين' | 'بريد مصري' | 'يد بيد'; // طريقة التسليم
  qrData?: string; // نص الترميز في QR للتتبع
  caseId?: string; // ربط اختياري بقضية معينة
  caseNumber?: string; // رقم القضية المرتبطة
  notes?: string; // ملاحظات قانونية
  announcementImage?: ClientAttachment; // صورة الإعلان التي تدعم كل الامتدادات والصيغ
  customFieldValues?: Record<string, any>;
}

// ── الحقول المخصصة (Custom Fields) ──
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

export interface CustomFieldOption {
  label: string;
  value: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  options?: CustomFieldOption[];
  required?: boolean;
  defaultValue?: string;
  entity: 'case' | 'client' | 'session' | 'transaction' | 'deadline' | 'task' | 'bailiff' | 'execution' | 'note' | 'opponent';
  sortOrder: number;
  createdAt: string;
}

export interface CustomFieldsConfig {
  fields: CustomField[];
}
