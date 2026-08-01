export const envelopePrintCSS = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Amiri:wght@400;700&display=swap');

    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Tajawal', 'Amiri', sans-serif;
      direction: rtl;
      text-align: right;
      color: #1e293b;
      font-size: 11pt;
      line-height: 1.6;
      background: #fff;
      padding: 0;
    }

    .envelope-page {
      width: 100%;
      min-height: 100vh;
      position: relative;
      page-break-after: always;
    }

    /* ========== HEADER ========== */
    .env-header {
      display: flex;
      align-items: center;
      gap: 15px;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }

    .env-logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .env-logo-placeholder {
      width: 70px;
      height: 70px;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      flex-shrink: 0;
      background: #f8fafc;
    }

    .env-office-info {
      flex: 1;
    }

    .env-office-name {
      font-weight: 900;
      font-size: 13pt;
      color: #0f172a;
    }

    .env-office-details {
      font-size: 8.5pt;
      color: #475569;
      margin-top: 2px;
      line-height: 1.5;
    }

    /* ========== BADGE ========== */
    .env-type-badge {
      display: inline-block;
      background: #1e293b;
      color: #fff;
      font-weight: 700;
      font-size: 9pt;
      padding: 4px 14px;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    /* ========== ADDRESS BOX ========== */
    .env-address-box {
      border: 1.5px solid #1e293b;
      padding: 18px 20px;
      margin-bottom: 20px;
      border-radius: 6px;
      background: #f8fafc;
    }

    .env-address-label {
      font-weight: 700;
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 4px;
    }

    .env-address-text {
      font-weight: 700;
      font-size: 12pt;
      color: #0f172a;
    }

    /* ========== INFO TABLE ========== */
    .env-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .env-info-table td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      font-size: 10pt;
    }

    .env-info-table td:first-child {
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      width: 30%;
    }

    .env-info-table td:last-child {
      font-weight: 500;
      color: #0f172a;
    }

    /* ========== QR + STAMP ========== */
    .env-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
    }

    .env-qr-area {
      text-align: center;
    }

    .env-qr-label {
      font-size: 7.5pt;
      color: #94a3b8;
      margin-top: 4px;
    }

    .env-stamp-area {
      text-align: center;
    }

    .env-stamp-image {
      width: 90px;
      height: 90px;
      object-fit: contain;
    }

    .env-stamp-placeholder {
      width: 90px;
      height: 90px;
      border: 2px dashed #dc2626;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #dc2626;
      font-weight: bold;
      transform: rotate(-10deg);
      margin: 0 auto;
    }

    .env-signature-line {
      font-size: 8pt;
      color: #64748b;
      margin-top: 5px;
    }

    /* ========== PRINT ========== */
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; }
    }
  </style>
`;
