
import { GoogleGenAI, Type } from "@google/genai";
import type { Part, UserParameters, MaterialGroup, OptimizationResult } from '../types';

function preprocessData(parts: Part[], maxSheetLength: number): MaterialGroup[] {
  // 1. Group parts by material and thickness
  const groups = parts.reduce((acc, part) => {
    const key = `${part.grade}_${part.thickness}mm`;
    if (!acc[key]) {
      acc[key] = {
        materialKey: key,
        thickness: part.thickness,
        grade: part.grade,
        parts: [],
      };
    }
    const area = part.width * part.length;
    acc[key].parts.push({ ...part, area, exceedsSheetLength: part.length > maxSheetLength });
    return acc;
  }, {} as Record<string, MaterialGroup>);

  // 2. Sort within each group
  Object.values(groups).forEach(group => {
    group.parts.sort((a, b) => {
      if (b.width !== a.width) return b.width - a.width; // Width DESC
      if (b.area !== a.area) return b.area - a.area; // Area DESC
      return b.length - a.length; // Length DESC
    });
  });

  return Object.values(groups);
}

const responseSchema: any = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.OBJECT,
            properties: {
                totalParts: { type: Type.INTEGER },
                totalPartsNested: { type: Type.INTEGER },
                numberOfGroups: { type: Type.INTEGER },
                overallWastePercentage: { type: Type.NUMBER },
            },
            required: ['totalParts', 'totalPartsNested', 'numberOfGroups', 'overallWastePercentage']
        },
        resultsByGroup: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    materialKey: { type: Type.STRING },
                    thickness: { type: Type.NUMBER },
                    grade: { type: Type.STRING },
                    totalPartsNested: { type: Type.INTEGER },
                    totalSheetsUsed: { type: Type.INTEGER },
                    averageWastePercentage: { type: Type.NUMBER },
                    layouts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                sheetNumber: { type: Type.INTEGER },
                                width: { type: Type.NUMBER },
                                length: { type: Type.NUMBER },
                                nestedParts: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            partId: { type: Type.STRING },
                                            x: { type: Type.NUMBER },
                                            y: { type: Type.NUMBER },
                                            width: { type: Type.NUMBER },
                                            length: { type: Type.NUMBER },
                                            rotated: { type: Type.BOOLEAN },
                                        },
                                        required: ['partId', 'x', 'y', 'width', 'length', 'rotated']
                                    }
                                },
                                wastePercentage: { type: Type.NUMBER },
                            },
                            required: ['sheetNumber', 'width', 'length', 'nestedParts', 'wastePercentage']
                        }
                    },
                },
                required: ['materialKey', 'thickness', 'grade', 'totalPartsNested', 'totalSheetsUsed', 'averageWastePercentage', 'layouts']
            }
        },
    },
    required: ['summary', 'resultsByGroup']
};


export const runOptimization = async (
  parts: Part[],
  parameters: UserParameters
): Promise<OptimizationResult> => {
  // Initialize AI client inside the function to avoid top-level process.env access issues
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const materialGroups = preprocessData(parts, parameters.maxSheetLength);

  let algorithmInstruction = '';
  switch (parameters.algorithm) {
      case 'Genetic Algorithm':
          algorithmInstruction = "Simulate the process using a conceptual Genetic Algorithm (GA). The goal is to evolve a population of solutions over generations to find an optimal layout. Prioritize minimizing waste by exploring different combinations through simulated crossover and mutation.";
          break;
      case 'Simulated Annealing':
          algorithmInstruction = "Simulate the process using a conceptual Simulated Annealing (SA) approach. The goal is to start with a random solution and iteratively improve it, occasionally accepting worse moves to escape local optima (controlled by a conceptual 'temperature' parameter that cools over time). Prioritize minimizing waste.";
          break;
      case 'BZ12':
          algorithmInstruction = `
            You are a senior software engineer specializing in manufacturing optimization and 2D sheet nesting problems.

            Your task is to design and implement a nesting logic that arranges parts onto multiple sheets with the following strict objective:

            MAIN OBJECTIVE
            - Sheets from the first sheet to the second-to-last sheet must have the LOWEST possible waste (highest utilization).
            - The LAST sheet is allowed to have ANY amount of waste.
            - Waste should be intentionally pushed toward the last sheet.

            SYSTEM RULES

            1. Definitions
            - SheetArea = total usable area of one sheet
            - PartArea = area of a single part
            - Utilization = (sum of part areas on sheet) / SheetArea
            - Waste = 1 - Utilization

            2. Sheet Utilization Constraint
            - For every sheet except the last sheet:
                Utilization must be >= TargetUtilization (e.g. 85–92%)
            - The last sheet has no utilization constraint.

            3. Sheet Creation Rule
            - A new sheet MUST NOT be created if the current sheet has not reached the TargetUtilization.
            - The system must attempt re-nesting, rotation, and gap filling before opening a new sheet.

            4. Part Ordering Strategy (Pre-processing)
            - Sort parts before nesting using the following priority:
                1) Larger area first
                2) More complex or irregular shapes first
                3) Parts with limited rotation first

            5. Nesting Strategy
            - Place parts on the current sheet using a packing heuristic (e.g. Bottom-Left, First Fit Decreasing, or similar).
            - Allow part rotation if machine constraints permit.
            - Minimize spacing between parts based on cutting kerf rules.

            6. Last Sheet Strategy
            - All remaining parts that cannot be placed into earlier sheets without violating the utilization rule must be placed on the last sheet.
            - The last sheet acts as a "waste buffer".

            7. Inter-Sheet Balancing (Post-processing)
            - After initial nesting is complete:
                For each sheet except the last:
                    If Utilization < TargetUtilization:
                        Attempt to move compatible parts from the last sheet into this sheet without overlap or constraint violation.
            - Repeat until no further improvement is possible.

            8. Output Requirements
            - For each sheet:
                - List of parts placed
                - Utilization percentage
                - Waste percentage
            - Clearly identify the last sheet.
            - Ensure that waste is minimized on all sheets except the last one.
          `;
          break;
      default:
          algorithmInstruction = "Your primary task is to act as a mock optimization engine for steel coil nesting.";
  }


  const prompt = `
    You are a Manufacturing Data Workflow Orchestrator. 
    ${algorithmInstruction}
    You will receive data grouped by material and a set of user parameters.
    Your response MUST be a valid JSON object that strictly conforms to the provided schema.

    OPTIMIZATION STRATEGY: **VARIABLE LENGTH FOR MINIMAL WASTE**
    
    You are simulating a process where steel sheets are cut from a master coil. 
    Unlike standard nesting on fixed sheets, here **you determine the cut length** of each sheet to strictly minimize waste, subject to weight and length limits.

    **STRICT CONSTRAINTS & LOGIC:**

    1.  **Variable Sheet Length (Dynamic Cutting):**
        - Do not assume a fixed sheet length. 
        - Nest parts tightly together. 
        - The final "Length" of a sheet should be determined by the end of the last nested part (plus a small margin), **provided it meets the weight constraint below**.
    
    2.  **Constraint: Roll Weight Range (CRITICAL):**
        - Every generated sheet MUST have a calculated weight between **${parameters.rollWeightRange.min} kg** (Minimum) and **${parameters.rollWeightRange.max} kg** (Maximum).
        - **Formula:** Weight (kg) = Width (mm) * Length (mm) * Thickness (mm) * 0.00000785 (Density of Steel).
        - **Logic:**
            - If the nested parts form a sheet that is too light (< ${parameters.rollWeightRange.min} kg), you **MUST** continue adding parts to increase the length until the minimum weight is reached.
            - If adding a part would exceed the maximum weight (> ${parameters.rollWeightRange.max} kg), you **MUST** stop and move that part to the next sheet.
            - This ensures every sheet (except potentially the very last one of the group) is a valid, transportable roll.

    3.  **Constraint: Max Sheet Length:**
        - The 'Length' of any generated sheet MUST NOT exceed **${parameters.maxSheetLength} mm**.
        - If satisfying the minimum weight requires a length longer than ${parameters.maxSheetLength} mm, prioritizing the Length limit is safer (but this indicates a poor width selection).

    4.  **Width Selection:**
        - Select a sheet Width from the 'candidateCoilWidths' provided. 
        - Choose the width that, when combined with the variable length logic, results in the lowest waste percentage.
        - Candidate Widths: ${parameters.candidateCoilWidths}

    5.  **Output Generation:**
        - Create a JSON response.
        - Calculate a realistic 'wastePercentage' (Goal: < 15%).
        - The 'nestedParts' must include plausible 'width' and 'length' for drawing.
        - Ensure 'sheetNumber' increments correctly.

    INPUT DATA:
    User Parameters:
    ${JSON.stringify(parameters, null, 2)}

    Material Groups and Parts:
    ${JSON.stringify(materialGroups, null, 2)}

    Generate the JSON output now.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });
    
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result as OptimizationResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API_KEY")) {
         throw new Error("Invalid or missing API Key. Please ensure it is set correctly.");
    }
    throw new Error("Failed to get a valid response from the optimization engine.");
  }
};
