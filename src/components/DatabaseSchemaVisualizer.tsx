/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
;
import { 
  Database, 
  TableProperties, 
  ArrowRightLeft, 
  ShieldCheck, 
  Eye, 
  BookOpen, 
  Check, 
  Layout, 
  Fingerprint, 
  Layers, 
  Calendar, 
  FileText, 
  Users 
} from 'lucide-react';
import { Client, Case, Session, LawDocument } from '../types';

interface DatabaseSchemaVisualizerProps {
  clients: Client[];
  cases: Case[];
  sessions: Session[];
  documents: LawDocument[];
}

const DatabaseSchemaVisualizer = React.memo(function DatabaseSchemaVisualizer({
  clients,
  cases,
  sessions,
  documents
}: DatabaseSchemaVisualizerProps) {
  const [selectedTable, setSelectedTable] = useState<'clients' | 'cases' | 'appointments' | 'documents'>('clients');
  const [viewMode, setViewMode] = useState<'erd' | 'schema' | 'rows'>('erd');

  // Schema specifications
  const schemaDefinitions = {
    clients: {
      tableName: 'tbl_clients (الموكلين والشركات)',
      description: 'جدول الموكلين بمصѡ يثبت الهويات الفردية والسجلات التجارية للشركات مع ربط بأرقام التوكيلات الصادرة من مكاتب الشهر العقاري والتوثيق.',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NOT NULL', arabicDesc: 'المعرف الفريد للموكل' },
        { name: 'name', type: 'VARCHAR(255)', key: '', nullable: 'NOT NULL', arabicDesc: 'الاسم الرباعي الكامل للموكل' },
        { name: 'phone', type: 'VARCHAR(20)', key: '', nullable: 'NOT NULL', arabicDesc: 'رقم الهاتف للتواصل المباشر' },
        { name: 'national_id', type: 'VARCHAR(14)', key: 'UNIQUE', nullable: 'NOT NULL', arabicDesc: 'الرقم القومي المصري (14 رقماً)' },
        { name: 'address', type: 'TEXT', key: '', nullable: 'NOT NULL', arabicDesc: 'محل الإقامة المختار والموطن القانوني' },
        { name: 'email', type: 'VARCHAR(100)', key: '', nullable: 'NULL', arabicDesc: 'عنوان البريد الإلكتروني للموكل' },
        { name: 'poas_json', type: 'JSONB', key: '', nullable: 'NULL', arabicDesc: 'بيانات التوكيلات وتوثيقات الشهر العقاري' },
        { name: 'notes', type: 'TEXT', key: '', nullable: 'NULL', arabicDesc: 'ملاحظات إرشادية حول الموكل' },
        { name: 'created_at', type: 'TIMESTAMP', key: '', nullable: 'DEFAULT NOW()', arabicDesc: 'تاريخ إثبات قيد الموكل بالدفتر' }
      ],
      relations: [
        { from: 'tbl_clients.id', to: 'tbl_cases.client_id', type: '1:N (واحد لمتعدد)', description: 'يمكن للموكل الواحد إقامة أو تمثيله في عدة قضايا بالمكتب.' }
      ]
    },
    cases: {
      tableName: 'tbl_cases (القضايا والدعاوى القضائية)',
      description: 'جدول القضايا الجنائية والمدنية والأحوال الشخصيɡ يخزن تفاصيل رقم القضيɡ المحكمة الابتدائية أو الاستئنافيɡ الدائرة والرسوم والأتعاب القضائية.',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NOT NULL', arabicDesc: 'المعرف الفريد للقضية' },
        { name: 'case_number', type: 'VARCHAR(50)', key: 'UNIQUE', nullable: 'NOT NULL', arabicDesc: 'رقم القضية الرسمي (مثال: ١٤٢ لسنة ٢٠٢٦)' },
        { name: 'year', type: 'VARCHAR(10)', key: '', nullable: 'NOT NULL', arabicDesc: 'السنة القضائية التي قيدت بها الدعوى' },
        { name: 'court', type: 'VARCHAR(150)', key: '', nullable: 'NOT NULL', arabicDesc: 'اسم وموقع مجمع المحاكم بمصر' },
        { name: 'circuit', type: 'VARCHAR(100)', key: '', nullable: 'NOT NULL', arabicDesc: 'الدائرة القانونية المختصة بنظر الدعوى' },
        { name: 'type', type: 'VARCHAR(50)', key: '', nullable: 'NOT NULL', arabicDesc: 'تصنيف الدعوى (مدني، جنائي، أسرɡ إلخ)' },
        { name: 'litigation_level', type: 'VARCHAR(50)', key: '', nullable: 'NOT NULL', arabicDesc: 'درجة التقاضي المتداولة بها القضية في مصر' },
        { name: 'client_id', type: 'UUID', key: 'FK', nullable: 'NOT NULL', arabicDesc: 'مفتاح أجنبي يرتد لجدول الموكلين' },
        { name: 'client_role', type: 'VARCHAR(55)', key: '', nullable: 'NOT NULL', arabicDesc: 'صفة الموكل بالدعوى (مدعي أو مدعى عليه)' },
        { name: 'opponent_name', type: 'VARCHAR(255)', key: '', nullable: 'NOT NULL', arabicDesc: 'الاسم الكامل للخصم المدعي/عليه' },
        { name: 'status', type: 'VARCHAR(50)', key: '', nullable: 'NOT NULL', arabicDesc: 'الحالة القضائية الحالية للدعوى بالشطب أو الحكم' },
        { name: 'total_fees', type: 'DECIMAL(10,2)', key: '', nullable: 'DEFAULT 0.0', arabicDesc: 'إجمالي الأتعاب المتفق عليها بالجنيه EGP' },
        { name: 'paid_fees', type: 'DECIMAL(10,2)', key: '', nullable: 'DEFAULT 0.0', arabicDesc: 'المسدد من أتعاب الوكالة بالخزينة' },
        { name: 'created_at', type: 'TIMESTAMP', key: '', nullable: 'DEFAULT NOW()', arabicDesc: 'تاريخ إدخال القضية بالنظام الرقمي' }
      ],
      relations: [
        { from: 'tbl_cases.id', to: 'tbl_appointments.case_id', type: '1:N (واحد لمتعدد)', description: 'تحتوي القضية على جدول من الجلسات والآجال المتعاقبة.' },
        { from: 'tbl_cases.id', to: 'tbl_documents.case_id', type: '1:N (واحد لمتعدد)', description: 'ترتبط المستندات والعرائض والأحكام بقضيتها المرجعية.' }
      ]
    },
    appointments: {
      tableName: 'tbl_appointments (جدول الجلسات والمواعيد)',
      description: 'جدول الجلسات والقرارات المنبثقة عنها وإثبات الآجال ومواعيد استئناف أحكام المحاماة المقررة بقانون المرافعات المصري.',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NOT NULL', arabicDesc: 'المعرف الفريد للموعد/الجلسة' },
        { name: 'case_id', type: 'UUID', key: 'FK', nullable: 'NOT NULL', arabicDesc: 'القضية المرتبطة بالمفتاح الأجنبي' },
        { name: 'date', type: 'DATE', key: '', nullable: 'NOT NULL', arabicDesc: 'تاريخ انعقاد الجلسة أو انتهاء الميعاد' },
        { name: 'court_branch', type: 'VARCHAR(150)', key: '', nullable: 'NULL', arabicDesc: 'المحكمة التي ينعقد أمامها الإجراء' },
        { name: 'objective', type: 'TEXT', key: '', nullable: 'NOT NULL', arabicDesc: 'المطلوب بالجلسة أو الإجراء القانوني' },
        { name: 'decision_text', type: 'TEXT', key: '', nullable: 'NULL', arabicDesc: 'قرار محكمة مصر الجديد أو ما تم بالجلسة' },
        { name: 'status', type: 'VARCHAR(40)', key: '', nullable: 'NOT NULL', arabicDesc: 'حالة الموعد (قادمة أو منتهية ومقيدة)' }
      ],
      relations: [
        { from: 'tbl_appointments.case_id', to: 'tbl_cases.id', type: 'N:1 (متعدد لواحد)', description: 'تتبع كافة الجلسات قضاياها الأصلية المسجلة.' }
      ]
    },
    documents: {
      tableName: 'tbl_documents (خزينة المستندات الرقمية)',
      description: 'جدول تخزين وأرشفة عرائض الدعاوى والأحكام والأوراق التوثيقية المرفوعة بنظام الماسح الضوئي (OCR).',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', nullable: 'NOT NULL', arabicDesc: 'المعرف الفريد للمستند' },
        { name: 'name', type: 'VARCHAR(255)', key: '', nullable: 'NOT NULL', arabicDesc: 'الاسم التوثيقي المعبر للملف' },
        { name: 'type', type: 'VARCHAR(50)', key: '', nullable: 'NOT NULL', arabicDesc: 'تصنيف المستند (توكيل، حكم قضائي، عريضة)' },
        { name: 'file_name', type: 'VARCHAR(255)', key: '', nullable: 'NOT NULL', arabicDesc: 'الاسم الحقيقي للملف وصيغته الكودية' },
        { name: 'file_size', type: 'VARCHAR(25)', key: '', nullable: 'NOT NULL', arabicDesc: 'حجم الملف الرقمي' },
        { name: 'case_id', type: 'UUID', key: 'FK', nullable: 'NOT NULL', arabicDesc: 'المفتاح الأجنبي لربطه بملف القضية الكبرى' },
        { name: 'scanned_ocr_text', type: 'TEXT', key: '', nullable: 'NULL', arabicDesc: 'نص المستند المقروء بالماسح الضوئي الذكي' },
        { name: 'uploaded_at', type: 'DATE', key: '', nullable: 'DEFAULT NOW()', arabicDesc: 'تاريخ رفع وحفظ المستند بالخزينة الكامنة' }
      ],
      relations: [
        { from: 'tbl_documents.case_id', to: 'tbl_cases.id', type: 'N:1 (متعدد لواحد)', description: 'يرتبط كل ملف بأمر طبيعي في الدعوى المرجعية.' }
      ]
    }
  };

  return (
    <div className="space-y-4 font-sans text-end" id="db-visualizer-module-root" dir="rtl">
      
      {/* CARD MAIN HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                POSTGRESQL RELATIONAL ENGINE
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                قاعدة بيانات المحاماة
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              هندسة وبناء قاعدة بيانات شركات المحاماة
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">مخطط تفصيلي تفاعلي مصمم وفق قانون المرافعات والتوثيقات بمصر لعلاقات جداول الموكلين، القضايǡ الجلسات والمستندات.</p>
          </div>

          {/* View Mode Choice */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 gap-0.5 text-xs font-semibold">
            <button 
              onClick={() => setViewMode('erd')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                viewMode === 'erd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              مخطط العلاقات (ERD)
            </button>
            <button 
              onClick={() => setViewMode('schema')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                viewMode === 'schema' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              قواميس الجداول والأعمدة
            </button>
            <button 
              onClick={() => setViewMode('rows')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                viewMode === 'rows' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              متصفح البيانات الحي
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: THE ERD GRAPHICAL DIAGRAM */}
      {viewMode === 'erd' && (
        <div className="bg-slate-900 text-white border border-slate-800 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-indigo-400">مخطط الكيانات وعلاقات قاعدة البيانات (Entity-Relationship Diagram)</h3>
              <p className="text-[10px] text-slate-400">هيكل الترابط الأوتوماتيكي ومفاتيح الربط لحفظ اتساق البيانات المدنية بمكتب المحاماة.</p>
            </div>
            <div className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded border border-slate-700">
              ⚡ يدعم لغة الاستعلامات PostgreSQL 16
            </div>
          </div>

          {/* Graphical nodes grid representing database tables and lines */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            
            {/* Table 1 Node: MOKALIN */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded p-3 text-xs space-y-2 hover:border-indigo-500/50 transition">
              <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded -mx-1 -mt-1 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-500" /> tbl_clients</span>
                <span className="text-[9px] text-slate-500 font-mono">1:N ➜</span>
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                <li className="text-indigo-400 flex justify-between"><span className="font-bold">🔑 id (PK)</span> <span>UUID</span></li>
                <li>name <span>VARCHAR</span></li>
                <li>phone <span>VARCHAR</span></li>
                <li className="text-indigo-400">national_id (U) <span>VARCHAR</span></li>
                <li>address <span>TEXT</span></li>
                <li>poas_json <span>JSONB</span></li>
              </ul>
              <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-1 flex justify-between">
                <span>تخزين توثيق الموكلين</span>
                <span>٤١ سجلاً</span>
              </div>
            </div>

            {/* Relation visual arrow column 1 */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded p-3 text-xs space-y-2 hover:border-sky-500/50 transition">
              <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded -mx-1 -mt-1 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5"><TableProperties className="w-3.5 h-3.5 text-sky-500" /> tbl_cases</span>
                <span className="text-[9px] text-slate-400">N:1 & 1:N</span>
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                <li className="text-indigo-400 flex justify-between"><span className="font-bold">🔑 id (PK)</span> <span>UUID</span></li>
                <li className="text-sky-400">client_id (FK) <span>UUID</span></li>
                <li className="text-indigo-400">case_number (U) <span>VARCHAR</span></li>
                <li>court <span>VARCHAR</span></li>
                <li>litigation_level <span>VARCHAR</span></li>
                <li>total_fees <span>DECIMAL</span></li>
              </ul>
              <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-1 flex justify-between">
                <span>صحف محاكم مصر</span>
                <span>٣٢ دعوى</span>
              </div>
            </div>

            {/* Table 3 Node: MEETINGS */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded p-3 text-xs space-y-2 hover:border-red-500/50 transition">
              <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded -mx-1 -mt-1 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-red-500" /> tbl_appointments</span>
                <span className="text-[9px] text-slate-500">➜ FK</span>
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                <li className="text-indigo-400 flex justify-between"><span className="font-bold">🔑 id (PK)</span> <span>UUID</span></li>
                <li className="text-sky-400">case_id (FK) <span>UUID</span></li>
                <li>date <span>DATE</span></li>
                <li>objective <span>TEXT</span></li>
                <li>decision_text <span>TEXT</span></li>
                <li>status <span>VARCHAR</span></li>
              </ul>
              <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-1 flex justify-between">
                <span>مواعيد الجلسات والآجال</span>
                <span>١٢ موعداً</span>
              </div>
            </div>

            {/* Table 4 Node: DOCUMENTS */}
            <div className="bg-slate-950 border-2 border-slate-800 rounded p-3 text-xs space-y-2 hover:border-indigo-500/50 transition">
              <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded -mx-1 -mt-1 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-indigo-500" /> tbl_documents</span>
                <span className="text-[9px] text-slate-500">➜ FK</span>
              </div>
              <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                <li className="text-indigo-400 flex justify-between"><span className="font-bold">🔑 id (PK)</span> <span>UUID</span></li>
                <li className="text-sky-400">case_id (FK) <span>UUID</span></li>
                <li>name <span>VARCHAR</span></li>
                <li>type <span>VARCHAR</span></li>
                <li>file_name <span>VARCHAR</span></li>
                <li>scanned_ocr_text <span>TEXT</span></li>
              </ul>
              <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-1 flex justify-between">
                <span>أرشيف المستندات والملفات</span>
                <span>٢٤ مستنداً</span>
              </div>
            </div>

          </div>

          {/* Integrity Rules and Relations Description panel */}
          <div className="bg-slate-950 rounded p-3 border border-slate-850 space-y-2 text-xs">
            <h4 className="font-bold text-indigo-500 flex items-center gap-1">
              <ArrowRightLeft className="w-4 h-4" /> قواعد الحفاظ على التكامل المرجعي وحماية العقود بمصر:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-350 leading-relaxed">
              <div className="space-y-1">
                <p>• <span className="text-white font-bold">حماية حذف המול (ON DELETE CASCADE)</span>: عند إزالة موكل المكتبي لسبب تصفية قانونيɡ يطبق حذف متسلسل على القضايا الكامنة منعاً ليتامى القيود.</p>
                <p>• <span className="text-white font-bold">ربط التوكيل الرسمي المباشر</span>: يتم تخزين التوكيلات بنظام السجل المتشابك وتوثيق مكاتب الشهر العقاري لتقديمه كبرهان ساطع بالدفاع.</p>
              </div>
              <div className="space-y-1">
                <p>• <span className="text-white font-bold">الآجال القضائية الصارمة</span>: ترتبط الجلسات بمخطط المواعيد الإجرائية بهدف إطلاق التنبيه والإنذار المبكر بموجب مواعيد الاستئناف والطعن المصرية.</p>
                <p>• <span className="text-white font-bold">سجل الأرشيف والمستندات</span>: ترتبط المستندات برقم القضية الكامن ليتيسر للمستشارين الفحص والتدقيق الفوري ونصوص الماسح الضوئي (OCR).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SCHEMA CODES AND COLUMNS (قاموس البيانات المعرف للبناء) */}
      {viewMode === 'schema' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Table Selectors list */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block mb-2 px-1">الجداول المتاحة بقاعدة البيانات</span>
            {Object.keys(schemaDefinitions).map((tblKey) => (
              <button
                key={tblKey}
                onClick={() => setSelectedTable(tblKey as any)}
                className={`w-full text-end p-2 rounded text-xs flex items-center justify-between transition ${
                  selectedTable === tblKey 
                    ? 'bg-indigo-50 text-indigo-900 font-bold border-e-2 border-indigo-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 opacity-60" />
                  {schemaDefinitions[tblKey as keyof typeof schemaDefinitions].tableName}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 rounded px-1">
                  {schemaDefinitions[tblKey as keyof typeof schemaDefinitions].columns.length} أعمدة
                </span>
              </button>
            ))}
          </div>

          {/* Table Columns and descriptions */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                جدول: <span className="font-mono text-indigo-600">{schemaDefinitions[selectedTable].tableName}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{schemaDefinitions[selectedTable].description}</p>
            </div>

            {/* List columns */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-end border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2 text-end">عنوان العمود (Column)</th>
                    <th className="p-2 text-end">نوع البيانات (Type)</th>
                    <th className="p-2 text-end">مفتاح/شرط (Key)</th>
                    <th className="p-2 text-end">قبول الفراغ</th>
                    <th className="p-2 text-end font-sans">الشرح والغرض باللغة العربية وقانون مصر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {schemaDefinitions[selectedTable].columns.map((col, index) => (
                    <tr key={index} className="hover:bg-slate-55/40">
                      <td className="p-2 font-bold text-slate-800">{col.name}</td>
                      <td className="p-2 text-slate-600">{col.type}</td>
                      <td className="p-2">
                        {col.key === 'PK' && (
                          <span className="bg-indigo-100 font-sans text-indigo-800 text-[9px] px-1 rounded font-bold">مفتاح رئيسي</span>
                        )}
                        {col.key === 'FK' && (
                          <span className="bg-sky-100 font-sans text-sky-800 text-[9px] px-1 rounded font-bold">مفتاح أجنبي</span>
                        )}
                        {col.key === 'UNIQUE' && (
                          <span className="bg-indigo-100 font-sans text-indigo-800 text-[9px] px-1 rounded font-bold">فريد</span>
                        )}
                      </td>
                      <td className="p-2 font-sans text-slate-450">{col.nullable}</td>
                      <td className="p-2 font-sans text-slate-700 font-medium">{col.arabicDesc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Render relationships */}
            <div className="bg-slate-50 p-3 rounded border border-slate-150 space-y-1.5 text-xs">
              <h4 className="font-bold text-slate-800">الروابط المتشابكة مع الجداول الأخرى:</h4>
              <ul className="space-y-1 text-slate-600">
                {schemaDefinitions[selectedTable].relations.map((rel, index) => (
                  <li key={index} className="flex items-center gap-1 flex-wrap">
                    • الربط من <strong className="font-mono text-slate-800 bg-slate-200 px-1 rounded">{rel.from}</strong> 
                    إلى <strong className="font-mono text-slate-800 bg-slate-200 px-1 rounded">{rel.to}</strong> 
                    بنسبة <strong className="text-indigo-700 bg-indigo-50 px-1">{rel.type}</strong> : {rel.description}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* VIEW MODE 3: LIVE GRID ROWS BROWSER (تحميل المتصفح التفاعلي الفوري) */}
      {viewMode === 'rows' && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100 flex-wrap">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-800">قائمة السجلات الحية المخزنة بقاعدة الفولاذية</h3>
              <p className="text-[11px] text-slate-500">متصفح يعرض القيم الفعلية للجداول المترابطة المستمدة من الذاكرة لربط الموكلين، القضايا والملفات.</p>
            </div>

            {/* Table Choice bar */}
            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 gap-0.5 text-xs font-semibold">
              <button 
                onClick={() => setSelectedTable('clients')}
                className={`px-3 py-1 rounded transition ${selectedTable === 'clients' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                الموكلين ({clients.length})
              </button>
              <button 
                onClick={() => setSelectedTable('cases')}
                className={`px-3 py-1 rounded transition ${selectedTable === 'cases' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                القضايا ({cases.length})
              </button>
              <button 
                onClick={() => setSelectedTable('appointments')}
                className={`px-3 py-1 rounded transition ${selectedTable === 'appointments' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                المواعيد/الجلسات ({sessions.length})
              </button>
              <button 
                onClick={() => setSelectedTable('documents')}
                className={`px-3 py-1 rounded transition ${selectedTable === 'documents' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                المستندات ({documents.length})
              </button>
            </div>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto">
            {selectedTable === 'clients' && (
              <table className="w-full text-xs text-end border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2 text-end">رقم الموكل (ID)</th>
                    <th className="p-2 text-end">الاسم الرباعي للموكل</th>
                    <th className="p-2 text-end">الرقم القومي</th>
                    <th className="p-2 text-end">المحمول</th>
                    <th className="p-2 text-end">الموطن المختار بالقاهرة</th>
                    <th className="p-2 text-end">التوكيلات الرسمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map(cl => (
                    <tr key={cl.id} className="hover:bg-slate-50/70">
                      <td className="p-2 font-mono text-slate-400 font-bold">{cl.id}</td>
                      <td className="p-2 font-bold text-slate-800">{cl.name}</td>
                      <td className="p-2 font-mono text-slate-600">{cl.nationalId}</td>
                      <td className="p-2 font-mono text-slate-600">{cl.phone}</td>
                      <td className="p-2 text-slate-700">{cl.address}</td>
                      <td className="p-2">
                        {cl.poas.length > 0 ? (
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                            توكيل: {cl.poas[0].poaNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">لا توكيل رسمي</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedTable === 'cases' && (
              <table className="w-full text-xs text-end border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2 text-end">معرف الدعوى</th>
                    <th className="p-2 text-end">رقم القضية الرسمي بمصر</th>
                    <th className="p-2 text-end">المحكمة المختصة والدائرة</th>
                    <th className="p-2 text-end">تصنيف الدعوى</th>
                    <th className="p-2 text-end">الموكل الخاضع</th>
                    <th className="p-2 text-end">الخصم العنيد</th>
                    <th className="p-2 text-end">الحالة القضائية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map(cs => (
                    <tr key={cs.id} className="hover:bg-slate-50/70">
                      <td className="p-2 font-mono text-slate-400 font-bold">{cs.id}</td>
                      <td className="p-2 font-serif font-bold text-indigo-750">{cs.caseNumber}</td>
                      <td className="p-2 text-slate-700">{cs.court} - {cs.circuit}</td>
                      <td className="p-2 text-slate-600 font-semibold">{cs.type} ({cs.litigationLevel})</td>
                      <td className="p-2 font-bold text-slate-800">{cs.clientName}</td>
                      <td className="p-2 text-slate-600">{cs.opponentName}</td>
                      <td className="p-2">
                        <span className="status-tag status-active">{cs.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedTable === 'appointments' && (
              <table className="w-full text-xs text-end border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2 text-end">رقم الجلسة</th>
                    <th className="p-2 text-end">تاريخ الانعقاد</th>
                    <th className="p-2 text-end">القضية المرتبطة</th>
                    <th className="p-2 text-end">المحكمة والدائرة</th>
                    <th className="p-2 text-end">مطلوب الجلسة وإثباتها</th>
                    <th className="p-2 text-end">القرار الحادث</th>
                    <th className="p-2 text-end">نوع الجدولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map(ss => (
                    <tr key={ss.id} className="hover:bg-slate-50/70">
                      <td className="p-2 font-mono text-slate-400 font-bold">{ss.id}</td>
                      <td className="p-2 font-mono font-bold text-red-650">{ss.date}</td>
                      <td className="p-2 font-serif font-bold text-slate-800">{ss.caseNumber}</td>
                      <td className="p-2 text-slate-600">{ss.court} - {ss.circuit}</td>
                      <td className="p-2 text-slate-800 font-semibold">{ss.objective}</td>
                      <td className="p-2 text-slate-500">{ss.decision || 'بانتظار القرار أو تم التأجيل'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ss.status === 'منتهية' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {ss.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedTable === 'documents' && (
              <table className="w-full text-xs text-end border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2 text-end">رقم المستند</th>
                    <th className="p-2 text-end">الاسم المعرّف بالخزينة</th>
                    <th className="p-2 text-end">نوع المستند</th>
                    <th className="p-2 text-end">اسم الملف الفعلي والحجم</th>
                    <th className="p-2 text-end">رقم القضية المرتبطة</th>
                    <th className="p-2 text-end">تاريخ الرفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map(dc => (
                    <tr key={dc.id} className="hover:bg-slate-50/70">
                      <td className="p-2 font-mono text-slate-400 font-bold">{dc.id}</td>
                      <td className="p-2 font-bold text-slate-850">{dc.name}</td>
                      <td className="p-2 text-indigo-700 font-semibold">{dc.type}</td>
                      <td className="p-2 font-mono text-slate-500">{dc.fileName} ({dc.fileSize})</td>
                      <td className="p-2 font-serif font-bold text-slate-800">{dc.caseNumber}</td>
                      <td className="p-2 font-mono text-slate-650">{dc.uploadedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
});

export default DatabaseSchemaVisualizer;
