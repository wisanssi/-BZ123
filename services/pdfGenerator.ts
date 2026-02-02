
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OptimizationResult, UserParameters } from '../types';

// Use Google Fonts URL for Sarabun to ensure we get a valid, complete font file
const SARABUN_FONT_URL = 'https://fonts.gstatic.com/s/sarabun/v13/DtVjJx26TKEr37c9aAFJn2QN.ttf';

const loadFontBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font from ${url}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const exportToPdf = async (result: OptimizationResult, parameters: UserParameters) => {
    const doc = new jsPDF();

    try {
        // 1. Fetch and Add Thai Font
        const fontBase64 = await loadFontBase64(SARABUN_FONT_URL);
        
        doc.addFileToVFS('Sarabun-Regular.ttf', fontBase64);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        // Register the same font for bold to ensure Thai chars don't break in headers
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'bold');
        
        // Set global font
        doc.setFont('Sarabun');

        // 2. Add Content
        // Title
        doc.setFontSize(18);
        doc.text('รายงานผลการคำนวณ Steel Coil Nesting', 14, 22);

        // Date
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 30);

        // Summary Table
        doc.setFont('Sarabun');
        autoTable(doc, {
            startY: 35,
            head: [['หัวข้อสรุป (Summary)', 'ค่า (Value)']],
            body: [
                ['อัลกอริทึมที่ใช้ (Algorithm Used)', parameters.algorithm],
                ['จำนวนชิ้นงานทั้งหมด (Total Parts Input)', result.summary.totalParts],
                ['จำนวนชิ้นงานที่ตัดได้ (Parts Nested)', result.summary.totalPartsNested],
                ['จำนวนกลุ่มวัสดุ (Material Groups)', result.summary.numberOfGroups],
                ['เปอร์เซ็นต์ของเสียโดยรวม (Overall Waste)', `${result.summary.overallWastePercentage.toFixed(2)}%`],
            ],
            theme: 'grid',
            styles: { font: 'Sarabun' }, 
            headStyles: { font: 'Sarabun', fontStyle: 'bold', fillColor: '#172B4D' },
            bodyStyles: { font: 'Sarabun' },
            alternateRowStyles: { fillColor: '#F4F5F7' }
        });

        let lastY = (doc as any).lastAutoTable.finalY;

        // Results by Group
        result.resultsByGroup.forEach((group, index) => {
            let startY = lastY + 15;
            
            // Add a page break before a new group if there isn't enough space
            if (startY > 270) {
                doc.addPage();
                startY = 22; // Reset Y for new page
                doc.setFont('Sarabun'); // Ensure font is set for new page
            }

            doc.setFont('Sarabun');
            doc.setFontSize(16);
            doc.setTextColor('#172B4D');
            doc.text(`กลุ่มวัสดุ: ${group.grade} - ${group.thickness}mm`, 14, startY);

            // Group Details Table
            doc.setFont('Sarabun');
            autoTable(doc, {
                startY: startY + 6,
                body: [
                    ['จำนวนชิ้นงานที่ตัดได้:', `${group.totalPartsNested} ชิ้น`],
                    ['จำนวนแผ่นที่ใช้:', `${group.totalSheetsUsed} แผ่น`],
                    ['เปอร์เซ็นต์ของเสียเฉลี่ย:', `${group.averageWastePercentage.toFixed(2)}%`],
                ],
                theme: 'plain',
                styles: { font: 'Sarabun' },
                bodyStyles: { font: 'Sarabun', fontSize: 11 },
            });

            // Layouts Table
            const layoutsData = group.layouts.map(layout => {
                const steelDensityKgPerM3 = 7850;
                const weightKg = (layout.width / 1000) * (layout.length / 1000) * (group.thickness / 1000) * steelDensityKgPerM3;
                return [
                    layout.sheetNumber,
                    `${layout.width} x ${layout.length}`,
                    layout.nestedParts.length,
                    `${weightKg.toFixed(2)} kg`,
                    `${layout.wastePercentage.toFixed(2)}%`
                ];
            });

            doc.setFont('Sarabun');
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 2,
                head: [['# แผ่น', 'ขนาด (mm)', 'จำนวนชิ้นงาน', 'น้ำหนัก', 'ของเสีย']],
                body: layoutsData,
                theme: 'striped',
                styles: { font: 'Sarabun' },
                headStyles: { font: 'Sarabun', fontStyle: 'bold', fillColor: '#A5ADBA', textColor: '#172B4D' },
                bodyStyles: { font: 'Sarabun', fontSize: 10 },
            });
            lastY = (doc as any).lastAutoTable.finalY;
        });

        // 3. Save the PDF
        doc.save('optimization-report.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF. Please check your internet connection (needed for font) or try again.");
    }
};
