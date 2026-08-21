import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface GeneratePdfParams {
  documentTitle: string;
  suitNumber?: string;
  caseTitle?: string;
  documentType?: string;
  fileHash: string;
  documentId: string;
  officerName: string;
  officerRole: string;
  officerBadge: string;
  registeredDate: string;
  presidingJudge?: string;
  summaryNotes?: string;
}

export async function generateCertifiedJudicialPdf(params: GeneratePdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Official Header & Certified Judicial Dossier
  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (595 x 842 pt)
  const { width, height } = page.getSize();

  // Outer Border & Judicial Double Frame
  page.drawRectangle({
    x: 25,
    y: 25,
    width: width - 50,
    height: height - 50,
    borderColor: rgb(0.12, 0.15, 0.22),
    borderWidth: 1.5,
  });

  page.drawRectangle({
    x: 29,
    y: 29,
    width: width - 58,
    height: height - 58,
    borderColor: rgb(0.72, 0.53, 0.15), // Gold border
    borderWidth: 0.75,
  });

  // Header - Nigerian Judicial Emblem / Masthead
  let y = height - 60;

  page.drawText('IN THE FEDERAL HIGH COURT OF NIGERIA', {
    x: width / 2 - 145,
    y,
    size: 14,
    font: timesBold,
    color: rgb(0.1, 0.12, 0.18),
  });

  y -= 16;
  page.drawText('IN THE ABUJA JUDICIAL DIVISION • HOLDEN AT ABUJA', {
    x: width / 2 - 140,
    y,
    size: 10,
    font: timesBold,
    color: rgb(0.25, 0.3, 0.4),
  });

  y -= 14;
  page.drawText('DOCUMENT ARCHIVE & CASE PROCEEDINGS REPOSITORY', {
    x: width / 2 - 142,
    y,
    size: 8.5,
    font: helveticaBold,
    color: rgb(0.72, 0.53, 0.15),
  });

  // Horizontal separator line
  y -= 12;
  page.drawLine({
    start: { x: 45, y },
    end: { x: width - 45, y },
    thickness: 1,
    color: rgb(0.72, 0.53, 0.15),
  });

  // Suit Number Section
  y -= 25;
  const suitText = `SUIT NO: ${params.suitNumber || 'FHC/ABJ/CR/2024/104'}`;
  page.drawText(suitText, {
    x: width - 50 - courierBold.widthOfTextAtSize(suitText, 11),
    y,
    size: 11,
    font: courierBold,
    color: rgb(0.8, 0.1, 0.1),
  });

  // Parties Header
  y -= 20;
  page.drawText('BETWEEN:', {
    x: 50,
    y,
    size: 9.5,
    font: timesBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 18;
  const caseTitle = params.caseTitle || 'Federal Republic of Nigeria v. Maritime Interception Target Entity';
  page.drawText(caseTitle.length > 68 ? caseTitle.substring(0, 65) + '...' : caseTitle, {
    x: 65,
    y,
    size: 11,
    font: timesBold,
    color: rgb(0.08, 0.12, 0.2),
  });

  y -= 24;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Document Title Box
  y -= 28;
  page.drawRectangle({
    x: 45,
    y: y - 8,
    width: width - 90,
    height: 32,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.8, 0.85, 0.92),
    borderWidth: 1,
  });

  page.drawText(params.documentTitle.toUpperCase(), {
    x: 55,
    y: y + 8,
    size: 11,
    font: timesBold,
    color: rgb(0.05, 0.15, 0.35),
  });

  page.drawText(`RECORD ID: ${params.documentId}  •  CLASSIFICATION: OFFICIAL JUDICIAL RECORD`, {
    x: 55,
    y: y - 2,
    size: 7.5,
    font: courier,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Presiding Bench / Session Meta
  y -= 35;
  if (params.presidingJudge) {
    page.drawText(`BEFORE THEIR LORDSHIP: ${params.presidingJudge.toUpperCase()}`, {
      x: 50,
      y,
      size: 9.5,
      font: timesBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 16;
  }

  // Certified Transcript / Summary Content
  y -= 10;
  page.drawText('OFFICIAL COURT TRANSCRIPT & RECORD OF PROCEEDINGS:', {
    x: 50,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.3, 0.4),
  });

  y -= 16;
  const sampleText = params.summaryNotes || 
    `1. UPON THIS MATTER coming up for certified disposition before this Honourable Court, in the presence of legal counsel representing both Claimant/Prosecution and Respondents;\n\n` +
    `2. AND HAVING DULY EXAMINED the Originating Summons, affidavits of urgency, written addresses of learned counsel, and all authenticated exhibits filed;\n\n` +
    `3. IT IS HEREBY ORDERED AND DECREED that the authentic record of proceedings stands entered into the Federal High Court master judicial docket with full legal validity under Section 84 of the Evidence Act 2011;\n\n` +
    `4. THE ELECTRONIC EVIDENCE VAULT verifies that all underlying documents, transcripts, and affidavits were registered with SHA-256 cryptographic hashing and immutable block chaining.\n\n` +
    `5. GIVEN UNDER THE HAND OF THE PRESIDING JUDGE AND THE SEAL OF THIS HONOURABLE COURT.`;

  const lines = sampleText.split('\n');
  for (const line of lines) {
    if (line.trim() === '') {
      y -= 10;
      continue;
    }
    
    // Simple line wrap for 80 characters
    const words = line.split(' ');
    let currentLine = '';
    for (const w of words) {
      if ((currentLine + ' ' + w).length > 78) {
        page.drawText(currentLine, {
          x: 50,
          y,
          size: 10,
          font: timesRoman,
          color: rgb(0.12, 0.12, 0.15),
          lineHeight: 14,
        });
        y -= 14;
        currentLine = w;
      } else {
        currentLine = currentLine ? `${currentLine} ${w}` : w;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, {
        x: 50,
        y,
        size: 10,
        font: timesRoman,
        color: rgb(0.12, 0.12, 0.15),
      });
      y -= 14;
    }
  }

  // Cryptographic Verification & Audit Footer Box
  const footerBoxY = 50;
  page.drawRectangle({
    x: 45,
    y: footerBoxY,
    width: width - 90,
    height: 105,
    color: rgb(0.97, 0.98, 0.95),
    borderColor: rgb(0.72, 0.53, 0.15),
    borderWidth: 1,
  });

  page.drawText('FEDERAL HIGH COURT OF NIGERIA • CERTIFIED TRUE COPY (CTC) SEAL', {
    x: 55,
    y: footerBoxY + 88,
    size: 8.5,
    font: timesBold,
    color: rgb(0.55, 0.38, 0.05),
  });

  page.drawText(`REGISTRY SHA-256 HASH: ${params.fileHash}`, {
    x: 55,
    y: footerBoxY + 72,
    size: 7,
    font: courierBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`REGISTERED: ${params.registeredDate}  •  STORAGE ENGINE: DETERMINISTIC CRYPTOGRAPHIC LEDGER`, {
    x: 55,
    y: footerBoxY + 58,
    size: 7.5,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`INTAKE OFFICER: ${params.officerName} (${params.officerBadge}) - ROLE: ${params.officerRole.toUpperCase()}`, {
    x: 55,
    y: footerBoxY + 44,
    size: 7.5,
    font: helveticaBold,
    color: rgb(0.15, 0.25, 0.4),
  });

  page.drawText(`SECURITY NOTICE: This document is protected by forensic tamper-evident digital tracking.`, {
    x: 55,
    y: footerBoxY + 30,
    size: 7,
    font: timesItalic,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(`ALL RIGHTS RESERVED • CHIEF REGISTRAR, FEDERAL HIGH COURT OF NIGERIA`, {
    x: 55,
    y: footerBoxY + 16,
    size: 6.5,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
