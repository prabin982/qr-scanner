import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveBlob } from '../api';

// Printable A4 sheet: 3 columns x 4 rows of QR cards with cut lines.
export function downloadPdf(companyName, invitations) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cols = 3;
  const rows = 4;
  const cardW = 60;
  const cardH = 62;
  const startX = (210 - cols * cardW) / 2;
  const startY = 22;
  const perPage = cols * rows;
  const pages = Math.ceil(invitations.length / perPage);

  invitations.forEach((inv, idx) => {
    const pos = idx % perPage;
    if (idx > 0 && pos === 0) doc.addPage();
    if (pos === 0) {
      const page = Math.floor(idx / perPage) + 1;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`${companyName} - Invitation QR codes`, startX, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${page} of ${pages}`, 210 - startX, 14, { align: 'right' });
    }
    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const x = startX + col * cardW;
    const y = startY + row * cardH;

    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(x, y, cardW, cardH);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const name = companyName.length > 30 ? `${companyName.slice(0, 29)}...` : companyName;
    doc.text(name, x + cardW / 2, y + 7, { align: 'center' });

    doc.addImage(inv.qr_code_data, 'PNG', x + 8, y + 10, 44, 44);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(inv.invitation_code, x + cardW / 2, y + 59, { align: 'center' });
  });

  doc.save(`${safeName(companyName)}-qr-sheet.pdf`);
}

export async function downloadZip(companyName, invitations) {
  const zip = new JSZip();
  invitations.forEach((inv) => {
    zip.file(`${inv.invitation_code}.png`, inv.qr_code_data.split(',')[1], { base64: true });
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  saveBlob(blob, `${safeName(companyName)}-qr-codes.zip`);
}

export function downloadPng(inv) {
  const a = document.createElement('a');
  a.href = inv.qr_code_data;
  a.download = `${inv.invitation_code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const safeName = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'company';
