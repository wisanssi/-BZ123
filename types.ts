
export interface Part {
  id: string;
  width: number;
  length: number;
  quantity: number;
  thickness: number;
  grade: string;
  projectName: string;
}

export interface UserParameters {
  maxSheetLength: number;
  kerf: number;
  candidateCoilWidths: string; // Comma-separated string
  rollWeightRange: {
    min: number;
    max: number;
  };
  algorithm: string;
}

export interface PartError {
    width?: string;
    length?: string;
    quantity?: string;
    thickness?: string;
    grade?: string;
    projectName?: string;
}

// Types for data sent to Gemini
export interface MaterialGroup {
  materialKey: string;
  thickness: number;
  grade: string;
  parts: (Part & { area: number, exceedsSheetLength: boolean })[];
}

// Types for data received from Gemini
export interface NestedPart {
    partId: string;
    x: number;
    y: number;
    width: number;
    length: number;
    rotated: boolean;
}

export interface SheetLayout {
    sheetNumber: number;
    width: number;
    length: number;
    nestedParts: NestedPart[];
    wastePercentage: number;
}

export interface OptimizationGroupResult {
    materialKey: string;
    thickness: number;
    grade: string;
    totalPartsNested: number;
    totalSheetsUsed: number;
    averageWastePercentage: number;
    layouts: SheetLayout[];
}

export interface OptimizationResult {
    summary: {
        totalParts: number;
        totalPartsNested: number;
        numberOfGroups: number;
        overallWastePercentage: number;
    };
    resultsByGroup: OptimizationGroupResult[];
}
