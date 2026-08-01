/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Scale, 
  Plus, 
  Trash2, 
  Calculator, 
  BookOpen, 
  Award, 
  FileCheck, 
  Printer, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { showPrintJob } from '../utils/printHelper';

interface HeirOption {
  key: string;
  label: string;
  genderRestriction?: 'male' | 'female';
  hasCount: boolean;
  maxCount?: number;
}

const HEIR_OPTIONS: HeirOption[] = [
  { key: 'husband_wife', label: 'الزوج / الزوجة', hasCount: true, maxCount: 4 }, // If deceased is woman -> Husband (max 1), if man -> Wife (max 4)
  { key: 'father', label: 'الأب', hasCount: false },
  { key: 'mother', label: 'الأم', hasCount: false },
  { key: 'sons', label: 'الأبناء الذكور', hasCount: true },
  { key: 'daughters', label: 'البنات الإناث', hasCount: true },
  { key: 'grandfather', label: 'الجد الصحيح (أب الأب)', hasCount: false },
  { key: 'grandmother', label: 'الجدة الصحيحة', hasCount: false },
  { key: 'full_brothers', label: 'الإخوة الأشقاء', hasCount: true },
  { key: 'full_sisters', label: 'الأخوات الشقيقات', hasCount: true }
];

const InheritanceCalculator = React.memo(function InheritanceCalculator() {
  const [deceasedGender, setDeceasedGender] = useState<'male' | 'female'>('male');
  const [estateValue, setEstateValue] = useState<string>('500000');
  const [debtsAndWills, setDebtsAndWills] = useState<string>('20000');
  
  // Heir counts state
  const [heirs, setHeirs] = useState<Record<string, { present: boolean; count: number }>>({
    husband_wife: { present: false, count: 1 },
    father: { present: false, count: 1 },
    mother: { present: false, count: 1 },
    sons: { present: false, count: 0 },
    daughters: { present: false, count: 0 },
    grandfather: { present: false, count: 1 },
    grandmother: { present: false, count: 1 },
    full_brothers: { present: false, count: 0 },
    full_sisters: { present: false, count: 0 }
  });

  const [activeTab, setActiveTab] = useState<'calc' | 'rules'>('calc');

  const updateHeirPresence = (key: string, present: boolean) => {
    setHeirs(prev => ({
      ...prev,
      [key]: { ...prev[key], present, count: present && prev[key].count === 0 ? 1 : prev[key].count }
    }));
  };

  const updateHeirCount = (key: string, count: number) => {
    const val = isNaN(count) ? 0 : Math.max(0, count);
    setHeirs(prev => ({
      ...prev,
      [key]: { ...prev[key], count: val, present: val > 0 ? true : prev[key].present }
    }));
  };

  const resetAll = () => {
    setEstateValue('250000');
    setDebtsAndWills('10000');
    setHeirs({
      husband_wife: { present: false, count: 1 },
      father: { present: false, count: 1 },
      mother: { present: false, count: 1 },
      sons: { present: false, count: 0 },
      daughters: { present: false, count: 0 },
      grandfather: { present: false, count: 1 },
      grandmother: { present: false, count: 1 },
      full_brothers: { present: false, count: 0 },
      full_sisters: { present: false, count: 0 }
    });
  };

  // Perform division logic according to Sunni Islamic rules
  const calculateDivision = () => {
    const parsedEstate = parseInt(estateValue) || 0;
    const parsedDebts = parseInt(debtsAndWills) || 0;
    const netEstate = Math.max(0, parsedEstate - parsedDebts);
    const results: {
      heir: string;
      fraction: string;
      percentage: number;
      amount: number;
      reason: string;
      blocked: boolean;
    }[] = [];

    // Local presence variables for simpler calculation
    const hasHusband = deceasedGender === 'female' && heirs['husband_wife'].present;
    const husbandCount = hasHusband ? 1 : 0;
    const wivesCount = deceasedGender === 'male' && heirs['husband_wife'].present ? heirs['husband_wife'].count : 0;
    const hasWife = wivesCount > 0;

    const sonsCount = heirs['sons'].present ? heirs['sons'].count : 0;
    const daughtersCount = heirs['daughters'].present ? heirs['daughters'].count : 0;
    const hasDescendants = (sonsCount + daughtersCount) > 0;
    const hasMaleDescendant = sonsCount > 0;

    // Ancestors
    const hasFather = heirs['father'].present;
    const hasMother = heirs['mother'].present;
    
    // Grandparents (Blocked by Father/Mother)
    const fatherBlocksGrandfather = hasFather;
    const motherBlocksGrandmother = hasMother;
    
    const hasGrandfather = heirs['grandfather'].present && !fatherBlocksGrandfather;
    const hasGrandmother = heirs['grandmother'].present && !motherBlocksGrandmother;

    // Siblings (Partially or fully blocked by Father, Son, or Grandfather in some schools)
    const siblingsAreBlocked = hasFather || hasMaleDescendant; // simple blocking rule
    const fullBrothersCount = (!siblingsAreBlocked && heirs['full_brothers'].present) ? heirs['full_brothers'].count : 0;
    const fullSistersCount = (!siblingsAreBlocked && heirs['full_sisters'].present) ? heirs['full_sisters'].count : 0;

    // Define initial fixed shares (الأصحاب الفروض)
    let totalAssignedShares = 0; // sum of denominators/shares

    // 1. Spouses
    let husbandShare = 0; // fraction
    let wivesShare = 0; 
    let spouseText = '';

    if (hasHusband) {
      husbandShare = hasDescendants ? 0.25 : 0.5; // الربع مع الفرع الوارˡ النصف بدونه
      totalAssignedShares += husbandShare;
      spouseText = hasDescendants ? 'الربع (١/٤) لوجود فرع وارث' : 'النصف (١/٢) لعدم وجود فرع وارث';
    } else if (hasWife) {
      wivesShare = hasDescendants ? 0.125 : 0.25; // الثمن مع الفرع الوارˡ الربع بدونه
      totalAssignedShares += wivesShare;
      spouseText = hasDescendants ? `الثمن (١/٨) يقسم بالتساوي لوجود فرع وارث` : `الربع (١/٤) يقسم بالتساوي لعدم وجود فرع وارث`;
    }

    // 2. Mother
    let motherShare = 0;
    let motherText = '';
    if (hasMother) {
      const siblingCount = fullBrothersCount + fullSistersCount;
      if (hasDescendants || siblingCount >= 2) {
        motherShare = 1 / 6; // السدس مع الفرع الوارث أو جمع من الإخوة
        motherText = 'السدس (١/٦) لوجود فرع وارث أو جمع من الإخوة';
      } else {
        motherShare = 1 / 3; // الثلث عند الانفراد
        motherText = 'الثلث (١/٣) لعدم الفرع الوارث أو جمع من الإخوة';
      }
      totalAssignedShares += motherShare;
    }

    // 3. Father
    let fatherShare = 0;
    let fatherText = '';
    let fatherIsResiduary = false;
    if (hasFather) {
      if (hasMaleDescendant) {
        fatherShare = 1 / 6; // السدس فرضاً فقط لوجود ابن ذكر
        fatherText = 'السدس (١/٦) فرضاً لوجود فرع وارث ذكر';
      } else if (daughtersCount > 0) {
        fatherShare = 1 / 6; // السدس فرضاً + عصبة
        fatherIsResiduary = true;
        fatherText = 'السدس فرضاً (١/٦) + الباقي تعصيباً لوجود فرع وارث أنثى';
      } else {
        // عصبة بالكامل
        fatherShare = 0;
        fatherIsResiduary = true;
        fatherText = 'الباقي تعصيباً (عصبة بنفسه) لعدم وجود فرع وارث كلياً';
      }
      totalAssignedShares += fatherShare;
    }

    // 4. Grandparents (If not blocked)
    let grandfatherShare = 0;
    let grandfatherText = '';
    let grandfatherIsResiduary = false;
    if (hasGrandfather) {
      if (hasMaleDescendant) {
        grandfatherShare = 1 / 6;
        grandfatherText = 'السدس (١/٦) لعدم الأب ووجود فرع وارث';
      } else if (daughtersCount > 0) {
        grandfatherShare = 1 / 6;
        grandfatherIsResiduary = true;
        grandfatherText = 'السدس فرضاً (١/٦) + الباقي تعصيباً لعدم الأب';
      } else {
        grandfatherIsResiduary = true;
        grandfatherText = 'الباقي تعصيباً بدلاً من الأب المفقود';
      }
      totalAssignedShares += grandfatherShare;
    }

    let grandmotherShare = 0;
    let grandmotherText = '';
    if (hasGrandmother) {
      grandmotherShare = 1 / 6;
      grandmotherText = 'السدس (١/٦) فرضاً لعدم وجود الأم';
      totalAssignedShares += grandmotherShare;
    }

    // 5. Daughters (Fixed share if there is no Son)
    let daughtersShare = 0;
    let daughtersText = '';
    let daughtersAreResiduary = false;
    if (daughtersCount > 0) {
      if (sonsCount === 0) {
        if (daughtersCount === 1) {
          daughtersShare = 0.5; // النصف للبنت المنفردة
          daughtersText = 'النصف (١/٢) فرضاً لانفرادها عن المعصب والزوج والابن';
        } else {
          daughtersShare = 2 / 3; // الثلثان للبنتين فأكثر
          daughtersText = `الثلثان (٢/٣) فرضاً لجمعهن بالتساوي (نصيب البنت الواحدة ${(2 / (3 * daughtersCount) * 100).toFixed(1)}%)`;
        }
        totalAssignedShares += daughtersShare;
      } else {
        // عصبة بالغير مع الابن للذكر مثل حظ الأنثيين
        daughtersAreResiduary = true;
        daughtersText = 'عصبة بالغير مع الابن (للذكر مثل حظ الأنثيين)';
      }
    }

    // Handle blocking of siblings output to explain to user
    if (heirs['full_brothers'].present && siblingsAreBlocked) {
      results.push({
        heir: 'الإخوة الأشقاء',
        fraction: '٠',
        percentage: 0,
        amount: 0,
        reason: 'محجوبون حجب حرمان تام لوجود الأب أو الابن الذكر',
        blocked: true
      });
    }
    if (heirs['full_sisters'].present && siblingsAreBlocked) {
      results.push({
        heir: 'الأخوات الشقيقات',
        fraction: '٠',
        percentage: 0,
        amount: 0,
        reason: 'محجوبون حجب حرمان تام لوجود الأب أو الابن الذكر',
        blocked: true
      });
    }

    if (heirs['grandfather'].present && fatherBlocksGrandfather) {
      results.push({
        heir: 'الجد الصحيح',
        fraction: '٠',
        percentage: 0,
        amount: 0,
        reason: 'محجوب بالأب من التوزيع كلياً',
        blocked: true
      });
    }

    if (heirs['grandmother'].present && motherBlocksGrandmother) {
      results.push({
        heir: 'الجدة الصحيحة',
        fraction: '٠',
        percentage: 0,
        amount: 0,
        reason: 'محجوبة بالأم من الميراث كلياً',
        blocked: true
      });
    }

    // Calculate Residuary (العصابات)
    let remainingPercentage = 1 - totalAssignedShares;
    if (remainingPercentage < 0) {
      // Over-assignment issue ("العول" - Al-Awwl)
      // Adjustment in Islamic law: reduce everyone's shares proportionally
      const scaleFactor = 1 / totalAssignedShares;
      
      // We will adjust the assigned shares
      if (hasHusband) results.push({ heir: 'الزوج', fraction: 'معدلة بالعول', percentage: husbandShare * scaleFactor, amount: netEstate * (husbandShare * scaleFactor), reason: `تم تخفيض النصيب بالعول: ${spouseText}`, blocked: false });
      if (hasWife) results.push({ heir: 'الزوجات', fraction: 'معدلة بالعول', percentage: wivesShare * scaleFactor, amount: netEstate * (wivesShare * scaleFactor), reason: `تم تخفيض النصيب بالتساوي بالعول: ${spouseText}`, blocked: false });
      if (hasMother) results.push({ heir: 'الأم', fraction: 'معدلة بالعول', percentage: motherShare * scaleFactor, amount: netEstate * (motherShare * scaleFactor), reason: `تم تخفيض النصيب بالعول: ${motherText}`, blocked: false });
      if (hasFather) results.push({ heir: 'الأب', fraction: 'معدلة بالعول', percentage: fatherShare * scaleFactor, amount: netEstate * (fatherShare * scaleFactor), reason: `تخفيض فرض السدس بالعول لامتلاء الفروض`, blocked: false });
      if (hasGrandfather) results.push({ heir: 'الجد', fraction: 'معدلة بالعول', percentage: grandfatherShare * scaleFactor, amount: netEstate * (grandfatherShare * scaleFactor), reason: `تخفيض بالعول للجد`, blocked: false });
      if (hasGrandmother) results.push({ heir: 'الجدة', fraction: 'معدلة بالعول', percentage: grandmotherShare * scaleFactor, amount: netEstate * (grandmotherShare * scaleFactor), reason: `تخفيض بالعول للجدة`, blocked: false });
      if (daughtersCount > 0 && sonsCount === 0) {
        results.push({ heir: 'البنات الإناث', fraction: 'معدلة بالعول', percentage: daughtersShare * scaleFactor, amount: netEstate * (daughtersShare * scaleFactor), reason: `تخفيض النصيب بالعول: ${daughtersText}`, blocked: false });
      }

      // Descendants that are residuaries only get zero in this case
      if (sonsCount > 0) {
        results.push({ heir: 'الأبناء والبنات عصبة', fraction: '٠', percentage: 0, amount: 0, reason: 'لم يتبقَ برأس المال نصيب من الفروض بسبب العول الشديد للورثة الفرضين', blocked: false });
      }
    } else {
      // Normal case / Surplus ("الرد" - Ar-Radd) or standard division
      // Push fixed shares first
      if (hasHusband) results.push({ heir: 'الزوج', fraction: hasDescendants ? '١/٤' : '١/٢', percentage: husbandShare, amount: netEstate * husbandShare, reason: spouseText, blocked: false });
      if (hasWife) results.push({ heir: 'الزوجات', fraction: hasDescendants ? '١/٨' : '١/٤', percentage: wivesShare, amount: netEstate * wivesShare, reason: spouseText, blocked: false });
      if (hasMother) results.push({ heir: 'الأم', fraction: motherShare === 1/3 ? '١/٣' : '١/٦', percentage: motherShare, amount: netEstate * motherShare, reason: motherText, blocked: false });
      if (hasGrandmother) results.push({ heir: 'الجدة الصحيحة', fraction: '١/٦', percentage: grandmotherShare, amount: netEstate * grandmotherShare, reason: grandmotherText, blocked: false });

      // Handle father/grandfather standard share
      if (hasFather && !fatherIsResiduary) {
        results.push({ heir: 'الأب', fraction: '١/٦', percentage: fatherShare, amount: netEstate * fatherShare, reason: fatherText, blocked: false });
      }
      if (hasGrandfather && !grandfatherIsResiduary) {
        results.push({ heir: 'الجد', fraction: '١/٦', percentage: grandfatherShare, amount: netEstate * grandfatherShare, reason: grandfatherText, blocked: false });
      }

      // Daughters if they are fixed
      if (daughtersCount > 0 && !daughtersAreResiduary) {
        results.push({ heir: 'البنات الإناث', fraction: daughtersCount === 1 ? '١/٢' : '٢/٣', percentage: daughtersShare, amount: netEstate * daughtersShare, reason: daughtersText, blocked: false });
      }

      // Now determine residuary amount (التعصيب)
      let residuaryAmount = remainingPercentage;
      
      if (sonsCount > 0 || (daughtersCount > 0 && daughtersAreResiduary)) {
        // Residuary goes to descendants (Sons and Daughters): male twice female
        const totalUnits = (sonsCount * 2) + daughtersCount;
        const sonUnitShare = totalUnits > 0 ? (residuaryAmount / totalUnits) * 2 : 0;
        const daughterUnitShare = totalUnits > 0 ? (residuaryAmount / totalUnits) : 0;

        if (sonsCount > 0) {
          results.push({
            heir: `الأبناء الذكور (${sonsCount})`,
            fraction: 'عصبة بالنفس',
            percentage: sonUnitShare * sonsCount,
            amount: netEstate * (sonUnitShare * sonsCount),
            reason: `يقتسمون عصبة النفس - نصيب الابن الواحد المالي: ${(netEstate * sonUnitShare).toFixed(1)} ([للذكر مثل حظ الأنثيين])`,
            blocked: false
          });
        }
        if (daughtersCount > 0 && daughtersAreResiduary) {
          results.push({
            heir: `البنات الإناث (${daughtersCount})`,
            fraction: 'عصبة بالغير',
            percentage: daughterUnitShare * daughtersCount,
            amount: netEstate * (daughterUnitShare * daughtersCount),
            reason: `عصبة بالغير مع إخوتهن الذكور - نصيب البنت الواحدة: ${(netEstate * daughterUnitShare).toFixed(1)}`,
            blocked: false
          });
        }
      } else if (hasFather && fatherIsResiduary) {
        // Father gets the residue
        const totalFatherShare = fatherShare + residuaryAmount;
        results.push({
          heir: 'الأب',
          fraction: `فرض + عصبة`,
          percentage: totalFatherShare,
          amount: netEstate * totalFatherShare,
          reason: fatherText + ` (مجموع الفرض والتعصيب)`,
          blocked: false
        });
      } else if (hasGrandfather && grandfatherIsResiduary) {
        // Grandfather gets residue
        const totalGfShare = grandfatherShare + residuaryAmount;
        results.push({
          heir: 'الجد الصحيح',
          fraction: `فرض + عصبة`,
          percentage: totalGfShare,
          amount: netEstate * totalGfShare,
          reason: grandfatherText + ` (مجموع الفرض مع التعصيب)`,
          blocked: false
        });
      } else if (fullBrothersCount > 0 || fullSistersCount > 0) {
        // Siblings as residuaries
        const totalUnits = (fullBrothersCount * 2) + fullSistersCount;
        const brotherUnitShare = totalUnits > 0 ? (residuaryAmount / totalUnits) * 2 : 0;
        const sisterUnitShare = totalUnits > 0 ? (residuaryAmount / totalUnits) : 0;

        if (fullBrothersCount > 0) {
          results.push({
            heir: `الإخوة الأشقاء (${fullBrothersCount})`,
            fraction: 'عصبة بالنفس',
            percentage: brotherUnitShare * fullBrothersCount,
            amount: netEstate * (brotherUnitShare * fullBrothersCount),
            reason: `عصبة بالنفس لعدم وجود فرع أو أب عاصم - نصيب الأخ الواحد: ${(netEstate * brotherUnitShare).toFixed(1)}`,
            blocked: false
          });
        }
        if (fullSistersCount > 0) {
          results.push({
            heir: `الأخوات الشقيقات (${fullSistersCount})`,
            fraction: 'عصبة بالغير',
            percentage: sisterUnitShare * fullSistersCount,
            amount: netEstate * (sisterUnitShare * fullSistersCount),
            reason: `عصبة بالغير لتكافؤ الأنثى للذكر الأشقاء - نصيب الأخت الواحدة: ${(netEstate * sisterUnitShare).toFixed(1)}`,
            blocked: false
          });
        }
      } else {
        // No residuaries, what happens to the remaining cash?
        // In Islamic law, it is returned on other heirs proportional to their shares, except Spouses (حكم الرد - Ar-Radd)
        // For simplicity we will note the surplus or return it
        if (residuaryAmount > 0.001) {
          const spouseShareRemovedTotal = results
            .filter(r => r.heir !== 'الزوج' && r.heir !== 'الزوجات')
            .reduce((s, r) => s + r.percentage, 0);

          if (spouseShareRemovedTotal > 0) {
            // Re-apply surplus to heirs proportionally (Ar-Radd)
            results.forEach(r => {
              if (r.heir !== 'الزوج' && r.heir !== 'الزوجات' && !r.blocked) {
                const ratio = r.percentage / spouseShareRemovedTotal;
                const bonus = residuaryAmount * ratio;
                r.percentage += bonus;
                r.amount += netEstate * bonus;
                r.reason += ` + [أضيف فائض ردّ شرعي بقيمة ${(netEstate * bonus).toFixed(1)}]`;
              }
            });
          } else {
            // Excess money with only spouse and no other descendants goes to Islamic Treasury (بيت مال المسلمين) or charitable channels
            results.push({
              heir: 'بيت مال المسلمين / فائض الخزينة الدينية',
              fraction: 'باقي مستحق',
              percentage: residuaryAmount,
              amount: netEstate * residuaryAmount,
              reason: 'فائض الحساب بدون عصبة أو أصحاب ممتلكات نسب متبقين للرد',
              blocked: false
            });
          }
        }
      }
    }

    return results;
  };

  const results = calculateDivision();
  const parsedEstate = parseInt(estateValue) || 0;
  const parsedDebts = parseInt(debtsAndWills) || 0;
  const netEstate = Math.max(0, parsedEstate - parsedDebts);

  const handlePrintInheritanceReport = () => {
    const tableRows = results.map(r => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 12px; text-align: right; font-weight: bold; color: ${r.blocked ? '#94a3b8' : '#1e293b'}">${r.heir}</td>
        <td style="padding: 12px; text-align: center; color: #475569; font-weight: 600;">${r.fraction}</td>
        <td style="padding: 12px; text-align: center; font-weight: 600; color: ${r.blocked ? '#94a3b8' : '#1e293b'}">${(r.percentage * 100).toFixed(1)}%</td>
        <td style="padding: 12px; text-align: center; font-family: 'Cairo', sans-serif; font-weight: bold; color: ${r.blocked ? '#cbd5e1' : '#b45309'}">${r.blocked ? '٠' : r.amount.toLocaleString('ar-EG', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
        <td style="padding: 12px; text-align: right; font-size: 11px; color: #475569;">${r.reason}</td>
      </tr>
    `).join('');

    const htmlReport = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>حساب تقسيم التركة الشرعية</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap');
          body {
            font-family: 'Amiri', 'Cairo', serif;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            color: #1e293b;
            direction: rlt;
            line-height: 1.8;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #b45309;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .header h2 {
            font-family: 'Cairo', sans-serif;
            color: #b45309;
            margin: 0;
            font-size: 19px;
            font-weight: 950;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            font-family: 'Cairo', sans-serif;
          }
          .stat-card {
            border: 1px solid #cbd5e1;
            padding: 15px;
            border-radius: 8px;
            background-color: #fafaf9;
            text-align: center;
          }
          .stat-card h4 {
            margin: 0 0 5px 0;
            color: #64748b;
            font-size: 11px;
          }
          .stat-card p {
            margin: 0;
            font-size: 15px;
            font-weight: bold;
            color: #1e293b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-family: 'Cairo', sans-serif;
            font-size: 12px;
          }
          th {
            background-color: #fef3c7;
            color: #b45309;
            font-weight: bold;
            padding: 12px;
            border-bottom: 2px solid #f59e0b;
          }
          .note-section {
            margin-top: 40px;
            padding: 15px;
            border-right: 4px solid #b45309;
            background-color: #fffbeb;
            font-size: 11.5px;
            border-radius: 4px;
          }
          .signature-box {
            margin-top: 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            font-family: 'Cairo', sans-serif;
          }
          .sig-card {
            border: 1px dashed #e2e8f0;
            padding: 15px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>تقسيم المواريث والتركات الشرعية</h2>
          <p style="font-size: 11px; color:#475569; font-family:'Cairo'; margin:4px 0 0 0;">صادر عن منصة المحامي الذكي وفق أحكام الفقه الإسلامي الحنيف</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h4>إجمالي التركة الأساسية</h4>
            <p>${parsedEstate.toLocaleString('ar-EG')} وحدة نقدية</p>
          </div>
          <div class="stat-card" style="border-color:#fca5a5;">
            <h4>الديون والوصايا الجانبية</h4>
            <p style="color:#ef4444;">${parsedDebts.toLocaleString('ar-EG')} وحدة نقدية</p>
          </div>
          <div class="stat-card" style="border-color:#fcd34d; background-color:#fffbeb;">
            <h4>التركة الصافية المعدة للورثة</h4>
            <p style="color:#d97706;">${netEstate.toLocaleString('ar-EG')} وحدة نقدية</p>
          </div>
        </div>

        <h3 style="font-family:'Cairo'; font-size:13px; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">كشف أنصبة المستحقين بالتفصيل:</h3>
        
        <table>
          <thead>
            <tr>
              <th style="text-align: right;">الـوارث المفترض</th>
              <th>الفرض الشرعي</th>
              <th>النسبة المئوية (%)</th>
              <th>القيمة المالية المقدرة</th>
              <th style="text-align: right;">البرهان والتعليل الفقهي</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="note-section">
          <strong>تنبيه فقهي وقانوني هام:</strong><br>
          تم احتساب هذه الأنصبة والتقسيم على المذهب المعمول به في القوانين العربية والمشتق من الراجح بالقرآن الكريم والسنة النبوية الشريفة. ويرجى مراعاة أن أي مبررات للحرمان من الميراث (كالقتل العمدي أو اختلاف الدين) تنفي هذا التوزيڡ ولذلك يوصى بوجود مراجعة وإمضاء المستشار الشرعي للمكتب.
        </div>

        <div class="signature-box">
          <div class="sig-card">
            <p style="font-weight:bold; font-size:11px; color:#475569; margin:0 0 40px 0;">توقيع الخبير الشرعي / المحاسب القانوني للمكتب</p>
            <p style="border-top:1px solid #94a3b8; width:70%; margin:0 auto; padding-top:4px; font-size:9x; color:#94a3b8;">توقيع معتمد</p>
          </div>
          <div class="sig-card">
            <p style="font-weight:bold; font-size:11px; color:#475569; margin:0 0 40px 0;">توقيع واعتماد الشركاء / الورثة المشرفين</p>
            <p style="border-top:1px solid #94a3b8; width:70%; margin:0 auto; padding-top:4px; font-size:9x; color:#94a3b8;">بإمضاء الورثة</p>
          </div>
        </div>
      </body>
      </html>
    `;
    showPrintJob('كشف_تقسيم_التركة_الشرعية', htmlReport);
  };

  return (
    <div className="space-y-6 text-end" dir="rtl" id="inheritance-calculator-module">
      {/* Unified Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-3 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-3 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse" />
                حاسبة المواريث والتركات
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Calculator className="h-6 w-6 text-indigo-500" />
              تقسيم المواريث والتركات الشرعية
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تقسيم التركات والمواريث وتبيان الأنصبة الشرعية وحجب الورثة الفقهي وفق أصح المذاهب المعمول بها بمحاكم الأحوال الشخصية المصرية.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mb-8 select-none">
        {/* Parameters Controls */}
        <div className="w-full xl:w-5/12 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-5 text-end font-sans" dir="rtl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">حاسبة المواريث والتركات الشرعية</h3>
                <p className="text-[11px] text-slate-400 mt-1">قسمة المواريث والأنصبة وقواعد الحجب الشرعية بدقة علمية متناهية</p>
              </div>
            </div>
            <div className="h-px bg-slate-100 mt-4"></div>
          </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-50 p-1 rounded-lg gap-1 border border-slate-100/80">
          <button
            onClick={() => setActiveTab('calc')}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition cursor-pointer ${
              activeTab === 'calc' ? 'bg-indigo-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            إدخال وحساب التركة
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-md transition cursor-pointer ${
              activeTab === 'rules' ? 'bg-indigo-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            نظريات وحقائق الإرث شرعاً
          </button>
        </div>

        {activeTab === 'calc' ? (
          <>
            {/* Input Variables */}
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>القيم المالية للتركة المتروكة</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">جنس المتوفى</label>
                  <select
                    value={deceasedGender}
                    onChange={(e) => setDeceasedGender(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:bg-white"
                  >
                    <option value="male">ذكر (متوفى وله زوجة/ات)</option>
                    <option value="female">أنثى (متوفاة ولها زوج)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">إجمالي المال المتروك (التركة)</label>
                  <input
                    type="number"
                    value={estateValue}
                    onChange={(e) => setEstateValue(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-slate-50 focus:bg-white"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span className="text-rose-500 font-bold">*</span>الديون، الأقساط والوصايا المخرجة قبل القمة
                </label>
                <input
                  type="number"
                  value={debtsAndWills}
                  onChange={(e) => setDebtsAndWills(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-rose-50/20 text-rose-800"
                  min="0"
                />
                <p className="text-[9.2px] text-slate-400">تُخصم المبالغ كأول أولوية شرعية بموافقة الإجماع (تجهيز الميʡ قضاء دينه، والوصايا).</p>
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Heirs Checklist selections */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>الورثة الموجودين قيد الحياة والعدد</span>
              </p>

              <div className="grid grid-cols-1 select-none space-y-2 max-h-[300px] overflow-y-auto pe-1">
                {HEIR_OPTIONS.map(h => {
                  // Determine title check onspouse
                  let label = h.label;
                  if (h.key === 'husband_wife') {
                    label = deceasedGender === 'male' ? 'زوجة قيد الحياة' : 'زوج قيد الحياة';
                  }

                  const item = heirs[h.key];

                  return (
                    <div 
                      key={h.key} 
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition ${
                        item.present ? 'bg-indigo-50/15 border-indigo-200' : 'bg-slate-50/30 border-slate-100'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.present}
                          onChange={(e) => updateHeirPresence(h.key, e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        <span className="text-xs font-bold text-slate-700">{label}</span>
                      </label>

                      {h.hasCount && item.present && (
                        <div className="flex items-center gap-2 leading-none shrink-0">
                          <span className="text-[10px] font-bold text-slate-400">العدد:</span>
                          <input
                            type="number"
                            value={item.count}
                            onChange={(e) => updateHeirCount(h.key, parseInt(e.target.value) || 0)}
                            className="w-12 border border-indigo-300 bg-indigo-50/10 text-indigo-900 rounded font-bold text-xs text-center p-1"
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            <button
              onClick={resetAll}
              className="w-full text-slate-400 hover:text-slate-600 text-[11px] font-bold flex items-center justify-center gap-2 cursor-pointer py-2 transition"
            >
              <RotateCcw className="w-3 h-3" />
              تصفير المدخلات وإعادة تعيين التركة الافتراضية
            </button>
          </>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pe-1 text-xs text-slate-600 leading-relaxed text-justify">
            <h4 className="font-bold text-slate-800 text-sm border-e-2 border-indigo-500 pe-2">١. الديون أولاً قبل التركة</h4>
            <p>قبل أن يُقتسم فلس واحد من التركɡ تنص الشريعة الإسلامية على ضرورة إيفاء الحقوق التالية بالتسلسل: مصاريف غسل وتكفين ودفن الميʡ سداد ديونه كلياً (ديون الله مثل الزكاة أو الحج وديون العباد)، وثم أداء وصيته في حدود ثلث ما تبقى من ماله فقط ولا وصية لوارث.</p>

            <h4 className="font-bold text-slate-800 text-sm border-e-2 border-indigo-500 pe-2">٢. أصحاب الفروض الكبرى</h4>
            <p>وهم اثنا عشر وارثاً تم تحديد نصيبهم صراحة بالقرآن والسنة الكريمة (النصݡ الربڡ الثمن، الثلثين، الثلˡ السدس). ومن أمثلتهم الزوجاʡ الأȡ الأم، البنات المباشرات.</p>

            <h4 className="font-bold text-slate-800 text-sm border-e-2 border-indigo-500 pe-2">٣. العصابات والتعصيب (العصبة)</h4>
            <p>وهم الورثة الذين لا يملكون فرضاً محدداً، بل يرثون كل ما تبقى من التركة بعد توزيع أنصبة أصحاب الفروض بالكامل. فإذا لم يتبق شيء فلا حظ لهم، وإذا انفردوا أخذوا التركة كاملة. ومثالهم الأول هو الابن الذكر المباشر والقاعد الأساسية لديهم "[للذكر مثل حظ الأنثيين]".</p>

            <h4 className="font-bold text-slate-800 text-sm border-e-2 border-indigo-500 pe-2">٤. علم ومصطلح الحجب</h4>
            <p>الحجب معناه حرمان وارث من الميراث جزئياً (حجب نقصان كتحول الزوج من النصف للربع) أو كلياً (حجب حرمان كحرمان الإخوة بوجود الأب أو الذكر الملاصق). هذا النظام يضمن استقرار الحقوق والحفاظ على النواة الأسرية الأقرب للمتوفى.</p>
          </div>
        )}
      </div>

      {/* Styled division results output panel */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between" id="inheritance-results-card-wrapper">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3 text-end" dir="rtl">
          <div>
            <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 text-[10px] px-2 py-1 rounded-full font-bold">الحساب الشرعي المعتمد</span>
            <h4 className="text-sm font-black text-slate-100 mt-1">جدول تقسيم التركة وقسمة الأنصبة</h4>
          </div>

          <button
            onClick={handlePrintInheritanceReport}
            className="bg-indigo-500 hover:bg-indigo-600 text-slate-950 text-xs font-black py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition shrink-0"
            id="print-inheritance-pdf-btn"
          >
            <Printer className="w-3 h-3" />
            <span>طباعة وتصدير تقرير التوزيع الشرعي</span>
          </button>
        </div>

        {/* Dynamic Division Table */}
        <div className="flex-1 overflow-x-auto text-end" dir="rtl">
          {/* Top Info Bar */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 block">نوع المتوفى الرئيسي</span>
              <span className="text-xs font-bold text-slate-300">
                {deceasedGender === 'male' ? 'متوفى (رجل)' : 'متوفاة (امرأة)'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 block">مجموع التركة الإجمالية</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{parsedEstate.toLocaleString('ar-EG')} صاع/عملة</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-550 text-rose-400 block">الديون والوصايا</span>
              <span className="text-xs font-bold text-rose-400 font-mono">{parsedDebts.toLocaleString('ar-EG')} صاع/عملة</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-550 text-indigo-500 block">التركة الصافية المعدة للتوزيع</span>
              <span className="text-xs font-bold text-indigo-400 font-mono">{netEstate.toLocaleString('ar-EG')} صاع/عملة</span>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-end border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3 text-end">المستحق / الوارث</th>
                  <th className="p-3 text-center">الفرض</th>
                  <th className="p-3 text-center">النسبة (%)</th>
                  <th className="p-3 text-center">القيمة المالية</th>
                  <th className="p-3 text-end">السبب والتأصيل الشرعي</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr 
                    key={i} 
                    className={`border-b border-slate-850/60 last:border-0 hover:bg-slate-850/20 transition ${
                      r.blocked ? 'text-slate-550 bg-slate-900/40 opacity-55' : 'text-slate-300'
                    }`}
                  >
                    <td className="p-3 font-bold">{r.heir}</td>
                    <td className="p-3 text-center font-mono text-indigo-400">{r.blocked ? '-' : r.fraction}</td>
                    <td className="p-3 text-center font-mono">{r.blocked ? '٠%' : `${(r.percentage * 100).toFixed(1)}%`}</td>
                    <td className="p-3 text-center font-mono font-bold text-indigo-500">
                      {r.blocked ? '٠' : r.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                    <td className="p-3 text-[11px] text-slate-450 leading-relaxed">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Warning & Disclaimer */}
        <div className="bg-indigo-950/20 border border-indigo-900/45 p-4 rounded-xl mt-6 text-end" dir="rtl">
          <div className="flex gap-2 text-rose-200">
            <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-1" />
            <div className="text-[10px] space-y-1 text-indigo-200">
              <strong className="block text-indigo-400">تنويه المراجعة الشرعية المعمول بها:</strong>
              <p>
                يتم احتساب هذا التوزيع وفق الفقه السني والوصايا العامة. يراعى دائماً التحقق من موانع الميراث الشرعية (مثل: اختلاف الدين، الرޡ أو ثبوت القتل العمد) من خلال زيارة دار الإفتاء الرسمية أو توثيقها بمحاضر مجمع البحوث الإسلامية.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
});

export default InheritanceCalculator;
