/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
;
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  Users, 
  Briefcase, 
  FileText, 
  AlertCircle, 
  ShieldAlert, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { Case, Client, LawDocument } from '../types';
import { findMatchSnippet } from '../utils/searchHelper';
import { useConfirm } from '../contexts/ConfirmContext';

interface ArchivePanelProps {
  cases: Case[];
  clients: Client[];
  documents: LawDocument[];
  onRestoreCase: (id: string) => void;
  onRestoreClient: (id: string) => void;
  onRestoreDocument: (id: string) => void;
  onDeleteCase: (id: string) => void;
  onDeleteClient: (id: string) => void;
  onDeleteDocument: (id: string) => void;
}

const ArchivePanel = React.memo(function ArchivePanel({
  cases,
  clients,
  documents,
  onRestoreCase,
  onRestoreClient,
  onRestoreDocument,
  onDeleteCase,
  onDeleteClient,
  onDeleteDocument
}: ArchivePanelProps) {
  const confirm = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState<'cases' | 'clients' | 'documents'>('cases');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract only archived items
  const archivedCases = cases.filter(c => c.isArchived === true);
  const archivedClients = clients.filter(c => c.isArchived === true);
  const archivedDocuments = documents.filter(d => d.isArchived === true);

  // Filter with query
  const filteredCases = archivedCases.filter(c => 
    c.caseNumber.includes(searchQuery) || 
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.court.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClients = archivedClients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery) ||
    c.nationalId.includes(searchQuery)
  );

  const filteredDocs = archivedDocuments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.caseNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-6 dir-rtl" style={{ direction: 'rtl' }}>
      
      {/* Header section matching clean system design theme with an elegant custom border frame */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                الأرشيف المغلق
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center justify-start gap-2.5">
              <Archive className="w-6 h-6 text-indigo-500" />
              الأرشيف القضائي والإداري المغلق
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              خزنة أرشفة ملفات الموكلين، صحف الدعاوى والمستندات منتهية العمل لضمان حماية وسرية البيانات التاريخية وتخفيف حمولة الأقسام النشطة بالمكتب.
            </p>
          </div>
          
          <div className="flex gap-2.5 self-start md:self-auto shrink-0 z-10">
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-2xl text-center shrink-0 min-w-[100px] shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold">القضايا المؤرشفة</span>
              <strong className="text-sm font-mono text-indigo-400">{archivedCases.length}</strong>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-2xl text-center shrink-0 min-w-[100px] shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold">الموكلين</span>
              <strong className="text-sm font-mono text-indigo-400">{archivedClients.length}</strong>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-2xl text-center shrink-0 min-w-[100px] shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold">المستندات</span>
              <strong className="text-sm font-mono text-indigo-400">{archivedDocuments.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Selection & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Buttons selection */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'cases', label: 'القضايا والدعاوى المؤرشفة', icon: Briefcase, count: archivedCases.length },
            { id: 'clients', label: 'دليل الموكلين المؤرشفين', icon: Users, count: archivedClients.length },
            { id: 'documents', label: 'خزنة المستندات المؤرشفة', icon: FileText, count: archivedDocuments.length }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isSelected = activeSubTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  setSearchQuery('');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                id={`archive-subtab-${tab.id}`}
              >
                <TabIcon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Query Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="بحث سريع بمكونات الأرشيف المغلق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pe-10 ps-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-indigo-600 focus:bg-white text-end"
            id="archive-search-box"
          />
          <Search className="absolute end-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>

      </div>

      {/* Main Tab Details Layout */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
        
        {/* TAB 1: ARCHIVED CASES */}
        {activeSubTab === 'cases' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between text-end">
              <h3 className="font-extrabold text-sm text-slate-800">سجل القضايا والطعون المبعدة مؤقتاً</h3>
              <p className="text-[10px] text-slate-450">استعرض سجل المذكرات أو استرجع القضية لبدء المتابعة</p>
            </div>

            {filteredCases.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">لا توجد أي قضايا مؤرشفة تطابق استعلامك الحالي.</p>
                <p className="text-[10px] text-slate-400 mt-1">تستطيع أرشفة القضايا المتداولة بالنظام لتقليل حمولة الأقسام.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCases.map(c => (
                  <div key={c.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition relative overflow-hidden text-end space-y-3">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-indigo-500/40" />
                    
                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <span className="text-[8px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold font-mono">
                          رقم الدعوى: {c.caseNumber}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">{c.clientName}</h4>
                        <p className="text-[10px] text-slate-400 leading-tight">{c.court}</p>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-100 font-bold shrink-0">مؤرشفة</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-150 text-[11px] text-slate-600 leading-relaxed line-clamp-2 h-11">
                      {c.claimSubject || 'لم يحرر ملخص لهذه القضية.'}
                    </div>

                    <div className="text-[10px] text-slate-450 flex items-center justify-between border-t border-slate-150 pt-2 font-bold">
                      <span className="font-mono text-[9px]">تاريخ الأرشفة: {c.archivedAt || 'صيف ٢٠٢٦'}</span>
                      <span className="text-slate-500">درجة التقاضي: {c.litigationLevel}</span>
                    </div>

                    {searchQuery && (() => {
                      const match = findMatchSnippet({
                        clientName: c.clientName,
                        caseNumber: c.caseNumber,
                        court: c.court,
                        claimSubject: c.claimSubject
                      }, searchQuery, {
                        clientName: 'اسم الموكل',
                        caseNumber: 'رقم القضية',
                        court: 'المحكمة',
                        claimSubject: 'موضوع الدعوى'
                      });
                      if (match) {
                        return (
                          <div className="text-[10px] text-slate-600 bg-indigo-50/50 border border-indigo-100 p-2 rounded-md font-sans">
                            <span className="text-indigo-800 font-extrabold block mb-0.5">مطابقة في {match.fieldName}:</span>
                            <span>{match.before}</span>
                            <mark className="bg-indigo-200 text-indigo-950 font-bold px-0.5 rounded">{match.match}</mark>
                            <span>{match.after}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onRestoreCase(c.id);
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        استرجاع للقضايا النشطة
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirm('تحذير نهائي: هل تريد حقاً حذف السجل التاريخي لهذه القضية نهائياً وبلا رجعɿ سيتم حجبها تماماً.')) {
                            onDeleteCase(c.id);
                          }
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg p-2 transition cursor-pointer"
                        title="حذف نهائي وقاطع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: ARCHIVED CLIENTS */}
        {activeSubTab === 'clients' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between text-end">
              <h3 className="font-extrabold text-sm text-slate-800">دليل الموكلين وأصحاب الحسابات المعطلة والأوراق المؤرشفة</h3>
              <p className="text-[10px] text-slate-450">إخفاء المعاملات التي لا تتم متابعتها بشكل دوري بالمكتب</p>
            </div>

            {filteredClients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">لا يوجد أي موكل مؤرشف يطابق استعلامك حالياً.</p>
                <p className="text-[10px] text-slate-400 mt-1">أرشفة الموكلين تريح الأجهزة وتخفي التوكيلات القديمة من شريط الإنشاء.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(cl => {
                  const clSnippet = searchQuery ? findMatchSnippet(
                    {
                      'الاسم': cl.name,
                      'الهاتف': cl.phone,
                      'الرقم القومي': cl.nationalId,
                      'العنوان': cl.address,
                    },
                    searchQuery,
                    {
                      'الاسم': 'الاسم',
                      'الهاتف': 'الهاتف',
                      'الرقم القومي': 'الرقم القومي',
                      'العنوان': 'العنوان',
                    }
                  ) : null;
                  return (
                  <div key={cl.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition relative overflow-hidden text-end space-y-3">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500/40" />
                    
                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{cl.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">الهاتف الأرشيفي: {cl.phone}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-100 font-bold shrink-0">عميل مؤرشف</span>
                    </div>
                    {clSnippet && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-[10px] text-indigo-800 leading-relaxed">
                        <span className="font-bold text-indigo-600">{clSnippet.fieldName}: </span>
                        {clSnippet.before}
                        <mark className="bg-indigo-300 text-indigo-900 px-0.5 rounded font-bold">{clSnippet.match}</mark>
                        {clSnippet.after}
                      </div>
                    )}

                    <div className="bg-white p-2.5 rounded-lg border border-slate-150 text-[10px] text-slate-500 space-y-1">
                      <div>الرقم القومي: <strong className="text-slate-800 font-mono">{cl.nationalId}</strong></div>
                      <div>محل الإقامة: <strong className="text-slate-700">{cl.address}</strong></div>
                      <div>عدد التوكيلات المسجلة: <strong className="text-slate-700 font-mono">{cl.poas.length} توكيل رسمي</strong></div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onRestoreClient(cl.id);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        استعادة للدليل النشط
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirm('تنبيه هام ومشدد: حذف الموكل بشكل قاطع سيزيل كافة بياناته ومعلوماته من قاعدة البيانات دون استرجاع. هل أنت متأكϿ')) {
                            onDeleteClient(cl.id);
                          }
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg p-2 transition cursor-pointer"
                        title="حذف نهائي وقاطع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ARCHIVED DOCUMENTS */}
        {activeSubTab === 'documents' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between text-end">
              <h3 className="font-extrabold text-sm text-slate-800">خزنة الأوراق والمذكرات والمستندات المدفونة إدارياً</h3>
              <p className="text-[10px] text-slate-450">استعراض وحفظ صور التوكيلات ومستندات الملكية التي تم الانتهاء من فحص دفاعها</p>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">لا توجد أي مستندات مؤرشفة قيد الحفظ حالياً.</p>
                <p className="text-[10px] text-slate-400 mt-1">يقوم الأرشيف بحوافر المستندات وحفظ المساحات التشغيلية بمجلدات القضية.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map(d => {
                  const docSnippet = searchQuery ? findMatchSnippet(
                    {
                      'الاسم': d.name,
                      'الملف': d.fileName,
                      'رقم القضية': d.caseNumber,
                      'ملاحظات': d.notes || '',
                      'نص OCR': d.scannedTextByAI || '',
                    },
                    searchQuery,
                    {
                      'الاسم': 'الاسم',
                      'الملف': 'الملف',
                      'رقم القضية': 'رقم القضية',
                      'ملاحظات': 'ملاحظات',
                      'نص OCR': 'نص OCR',
                    }
                  ) : null;
                  return (
                  <div key={d.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition relative overflow-hidden text-end space-y-3">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-indigo-500/40" />
                    
                    <div className="flex justify-between items-start pt-1">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]" title={d.name}>{d.name}</h4>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{d.fileName} ({d.fileSize})</p>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold shrink-0">{d.type}</span>
                    </div>
                    {docSnippet && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-[10px] text-indigo-800 leading-relaxed">
                        <span className="font-bold text-indigo-600">{docSnippet.fieldName}: </span>
                        {docSnippet.before}
                        <mark className="bg-indigo-300 text-indigo-900 px-0.5 rounded font-bold">{docSnippet.match}</mark>
                        {docSnippet.after}
                      </div>
                    )}

                    <div className="bg-white p-2.5 rounded-lg border border-slate-150 text-[10px] text-slate-500 space-y-1">
                      <div>رقم القضية التابعة: <strong className="text-slate-800 font-mono">{d.caseNumber}</strong></div>
                      <div>ملاحظات الأرشيف: <span className="text-slate-600 italic font-medium">{d.notes || 'لا يوجد ملحوظة'}</span></div>
                    </div>

                    {d.scannedTextByAI && (
                      <div className="bg-indigo-50/30 p-2 rounded border border-indigo-100 text-[9px] text-slate-600 leading-normal line-clamp-2">
                        💡 نصوص OCR المستخلصة: {d.scannedTextByAI}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onRestoreDocument(d.id);
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        إخراج من الخزينة المغلقة
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirm('تنبيه هام ومشدد: حذف المستند بشكل مباشر من الأرشيف سيزيله بالكامل من خادم الملفات نهائياً. هل أنت متأكϿ')) {
                            onDeleteDocument(d.id);
                          }
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg p-2 transition cursor-pointer"
                        title="حذف نهائي وقاطع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
});

export default ArchivePanel;
