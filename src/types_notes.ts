/**
 * نوع بيانات الملاحظات (Notes) — شبيه Google Keep.
 *
 * يدعم 3 أنواع: نص عادي، قائمة مهام (checklist)، وقائمة مهام مكتملة جزئياً.
 * مع إمكانية التثبيت (pinned) والأرشفة والتصنيف بالملصقات.
 */

export type NoteColor =
  | 'default'  // أبيض (افتراضي)
  | 'red'      // أحمر
  | 'orange'   // برتقالي
  | 'yellow'   // أصفر
  | 'green'    // أخضر
  | 'teal'     // أخضر مزرق
  | 'blue'     // أزرق
  | 'purple'   // بنفسجي
  | 'pink';    // وردي

export interface ChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
  /** معرف فرعي للترتيب */
  order: number;
}

export interface NoteAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** صورة مصغرة (data URL) — اختيارية */
  thumbnail?: string;
}

export interface Note {
  id: string;
  /** نوع الملاحظة */
  type: 'text' | 'checklist';
  /** عنوان الملاحظة (اختياري) */
  title?: string;
  /** نص الملاحظة (للمذكرات النصية) */
  content?: string;
  /** عناصر القائمة (للقوائم) */
  checklist?: ChecklistItem[];
  /** لون الملاحظة (افتراضي: أبيض) */
  color: NoteColor;
  /** مثبت في الأعلى */
  isPinned: boolean;
  /** مؤرشف */
  isArchived: boolean;
  /** تاريخ الأرشفة */
  archivedAt?: string;
  /** ملصقات (Labels) للتصنيف */
  labels?: string[];
  /** مرفقات (صوѡ ملفات) */
  attachments?: NoteAttachment[];
  /** تذكير (تاريخ + وقت) — اختياري */
  reminderAt?: string;
  /** هل تم استلام التذكير */
  reminderDone?: boolean;
  /** مرجع قضية (اختياري) — ربط بسيط */
  caseId?: string;
  caseNumber?: string;
  /** مرجع عميل (اختياري) */
  clientId?: string;
  /** ملاحظات إضافية (وصف طويل لو محتاج) */
  background?: string;
  /** مصدر الملاحظة */
  source: 'mock' | 'manual' | 'imported';
  /** تاريخ الإنشاء */
  createdAt: string;
  /** تاريخ آخر تعديل */
  updatedAt: string;
  customFieldValues?: Record<string, any>;
}