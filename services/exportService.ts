
import type { OptimizationResult } from '../types';

export const exportToCsv = (result: OptimizationResult) => {
  try {
    const header = [
        "Material Group", "Thickness (mm)", "Grade", 
        "Sheet Number", "Sheet Width (mm)", "Sheet Length (mm)", 
        "Part ID", "Part Width (mm)", "Part Length (mm)", 
        "X", "Y", "Rotated", "Sheet Waste %"
    ];

    const rows: string[] = [];
    rows.push(header.join(","));

    result.resultsByGroup.forEach(group => {
        group.layouts.forEach(layout => {
            layout.nestedParts.forEach(part => {
                const row = [
                    `"${group.materialKey}"`,
                    group.thickness,
                    `"${group.grade}"`,
                    layout.sheetNumber,
                    layout.width,
                    layout.length,
                    `"${part.partId}"`,
                    part.width || 0,
                    part.length || 0,
                    part.x,
                    part.y,
                    part.rotated ? "TRUE" : "FALSE",
                    layout.wastePercentage.toFixed(2)
                ];
                rows.push(row.join(","));
            });
        });
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "nesting_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export CSV:", error);
    alert("Error exporting CSV data.");
  }
};

export const exportToDxf = (result: OptimizationResult) => {
  try {
    // Minimal DXF Header
    let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";
    
    const drawRect = (x: number, y: number, w: number, h: number, layer: string, color: number) => {
        // DXF Rect: 4 vertices + closed flag (70, 1)
        return `0\nLWPOLYLINE\n8\n${layer}\n62\n${color}\n90\n4\n70\n1\n10\n${x}\n20\n${y}\n10\n${x+w}\n20\n${y}\n10\n${x+w}\n20\n${y+h}\n10\n${x}\n20\n${y+h}\n`;
    };

    const drawText = (x: number, y: number, text: string, layer: string, height: number, color: number) => {
         // Sanitize text: remove control characters but keep Unicode (for Thai) and basic punctuation
         const safeText = (text || "").replace(/[\x00-\x1F]/g, ''); 
         return `0\nTEXT\n8\n${layer}\n62\n${color}\n10\n${x}\n20\n${y}\n40\n${height}\n1\n${safeText}\n`;
    }

    let globalYOffset = 0;

    result.resultsByGroup.forEach(group => {
        // Group Header
        dxf += drawText(0, globalYOffset - 200, `Group ${group.materialKey} T${group.thickness}`, "TEXT", 150, 7);

        group.layouts.forEach(layout => {
            // Sheet Boundary
            dxf += drawRect(0, globalYOffset, layout.width, layout.length, "SHEETS", 7);
            
            // Sheet Label
            dxf += drawText(10, globalYOffset + 10, `Sheet ${layout.sheetNumber} - Waste ${layout.wastePercentage.toFixed(2)}%`, "TEXT", 50, 7);

            layout.nestedParts.forEach(part => {
                const w = part.width || 0;
                const l = part.length || 0;
                const drawW = part.rotated ? l : w;
                const drawH = part.rotated ? w : l;
                
                // Part Boundary
                dxf += drawRect(part.x, globalYOffset + part.y, drawW, drawH, "PARTS", 5);
                
                // Part Label with ID and Dimensions
                const labelSize = Math.min(drawW, drawH) / 6; // Dynamic font size
                if (labelSize > 5) {
                    const labelText = `${part.partId} (${drawW}x${drawH})`;
                    dxf += drawText(part.x + 5, globalYOffset + part.y + 5, labelText, "TEXT", labelSize, 1);
                }
            });

            globalYOffset += layout.length + 500; // Spacing between sheets
        });
        
        globalYOffset += 1000; // Spacing between groups
    });

    dxf += "0\nENDSEC\n0\nEOF\n";
    
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "nesting_layout.dxf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export DXF:", error);
    alert("Error exporting DXF file.");
  }
};
