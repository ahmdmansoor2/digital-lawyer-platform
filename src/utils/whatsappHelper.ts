/**
 * Normalizes a phone number to international format (specifically handling Egyptian numbers starting with 01...).
 * @param phone Raw phone number string.
 * @returns Cleaned international phone number.
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with Egyptian mobile prefix (e.g. 010, 011, 012, 015)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '2' + cleaned; // prepend Egypt country code '2' to result in '201...'
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '20' + cleaned;
  }

  // Ensure it has at least some country prefix or keep it as is if already formatted
  return cleaned;
}

/**
 * Opens a WhatsApp chat with the client, prefilled with a template message.
 * @param phone Raw phone number of the client.
 * @param text The template message.
 */
export function sendWhatsAppMessage(phone: string, text: string) {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
}

/**
 * Returns a session reminder template.
 */
export function getSessionReminderText(clientName: string, caseNumber: string, date: string, court: string, circuit: string, objective: string): string {
  return `السلام عليكم ورحمة الله وبركاته أستاذ(ة) ${clientName}،

نود تذكيركم بموعد جلستكم القضائية القادمة:
- رقم القضية: ${caseNumber}
- التاريخ: ${date}
- المحكمة: ${court}
- الدائرة: ${circuit}
- المطلوب بالجلسة: ${objective}

شاكرين لكم تعاونكم وثقتكم بنا.
مكتب المستشار للمحاماة والاستشارات القانونية.`;
}

/**
 * Returns a legal deadline reminder template.
 */
export function getDeadlineReminderText(clientName: string, title: string, deadlineDate: string, caseNumber: string, lawReference: string): string {
  return `عاجل وهام جداً.. أستاذ(ة) ${clientName}،

نود إخطاركم بوجود موعد قانوني حاسم يجب مراعاته وسرعة تقديمه:
- الإجراء المطلـوب: ${title}
- رقم القضية المرتبطة: ${caseNumber}
- الموعد النهائي الأخير: ${deadlineDate}
- السند القانوني: ${lawReference}

برجاء التواصل معنا عاجلاً للتنسيق وتجهيز الدفوع والأوراق اللازمة.
مكتب المستشار للمحاماة والاستشارات القانونية.`;
}

/**
 * Returns a general greeting / update template.
 */
export function getGeneralUpdateText(clientName: string): string {
  return `السلام عليكم أستاذ(ة) ${clientName}،

أتمنى أن تكونوا بخير. نود التواصل معكم بشأن مستجدات الملفات القانونية الخاصة بكم. يرجى إعلامنا بالموعد الأنسب لكم للتحدث أو زيارة المكتب.

دمتم بخير.
مكتب المستشار للمحاماة والاستشارات القانونية.`;
}
