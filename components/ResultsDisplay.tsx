
import React, { useState } from 'react';
import type { OptimizationResult, OptimizationGroupResult, UserParameters } from '../types';
import { FileTextIcon } from './icons/Icons';
import { exportToPdf } from '../services/pdfGenerator';
import { exportToCsv, exportToDxf } from '../services/exportService';

interface ResultsDisplayProps {
    result: OptimizationResult;
    parameters: UserParameters;
}

const SummaryCard: React.FC<{ summary: OptimizationResult['summary'] }> = ({ summary }) => (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-bold text-brand-dark mb-4">Optimization Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
                <p className="text-2xl font-bold text-brand-blue">{summary.totalParts}</p>
                <p className="text-sm text-gray-600">Total Parts Input</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-green-600">{summary.totalPartsNested}</p>
                <p className="text-sm text-gray-600">Parts Nested</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-brand-blue">{summary.numberOfGroups}</p>
                <p className="text-sm text-gray-600">Material Groups</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-red-600">{summary.overallWastePercentage.toFixed(2)}%</p>
                <p className="text-sm text-gray-600">Overall Waste</p>
            </div>
        </div>
    </div>
);

const GroupResultCard: React.FC<{ group: OptimizationGroupResult }> = ({ group }) => {
    // Standard density for steel in kg/m^3
    const steelDensityKgPerM3 = 7850; 

    // Calculate split waste stats (BZ12 logic)
    const layouts = group.layouts;
    const totalSheets = layouts.length;
    let mainSheetsWaste = 0;
    let lastSheetWaste = 0;
    
    if (totalSheets > 1) {
        const mainSheets = layouts.slice(0, totalSheets - 1);
        const totalMainWaste = mainSheets.reduce((sum, l) => sum + l.wastePercentage, 0);
        mainSheetsWaste = totalMainWaste / mainSheets.length;
        lastSheetWaste = layouts[totalSheets - 1].wastePercentage;
    } else if (totalSheets === 1) {
        lastSheetWaste = layouts[0].wastePercentage;
    }

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <div className="md:flex justify-between items-center">
                <div>
                    <h4 className="font-bold text-lg text-brand-dark">{group.grade} - {group.thickness}mm</h4>
                    <p className="text-sm text-gray-500">{group.materialKey}</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 mt-2 md:mt-0 text-sm text-center md:text-right">
                     <div>
                        <span className="font-semibold">{group.totalPartsNested}</span>
                        <span className="text-gray-600"> Parts</span>
                    </div>
                     <div>
                        <span className="font-semibold">{group.totalSheetsUsed}</span>
                        <span className="text-gray-600"> Sheets</span>
                    </div>
                    <div>
                         <span className="font-semibold text-red-500">{group.averageWastePercentage.toFixed(2)}%</span>
                        <span className="text-gray-600"> Avg Waste</span>
                    </div>
                </div>
            </div>

            {/* Detailed Waste Breakdown (BZ12 Style) */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded border border-gray-100">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Main Sheets (1 to {totalSheets > 1 ? totalSheets - 1 : 1})</span>
                    <span className={`font-bold ${totalSheets === 1 ? 'text-gray-400' : 'text-green-600'}`}>
                        {totalSheets > 1 ? `${mainSheetsWaste.toFixed(2)}%` : '-'}
                    </span>
                </div>
                <div className="flex justify-between items-center border-t md:border-t-0 md:border-l border-gray-100 pt-2 md:pt-0 md:pl-4">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Last Sheet (Buffer)</span>
                    <span className="font-bold text-orange-500">{lastSheetWaste.toFixed(2)}%</span>
                </div>
            </div>

            <details className="mt-3">
                <summary className="text-sm font-medium text-brand-blue cursor-pointer">View Layouts ({group.layouts.length})</summary>
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-brand-blue">
                    {group.layouts.map((layout, idx) => {
                        const weightKg = (layout.width / 1000) * (layout.length / 1000) * (group.thickness / 1000) * steelDensityKgPerM3;
                        const isLastSheet = idx === group.layouts.length - 1;
                        return (
                            <div key={layout.sheetNumber} className={`p-2 rounded-md text-xs ${isLastSheet ? 'bg-orange-50 border border-orange-100' : 'bg-white'}`}>
                                <div className="flex justify-between">
                                    <p>
                                        <strong>Sheet #{layout.sheetNumber}</strong> 
                                        {isLastSheet && <span className="ml-2 px-1.5 py-0.5 bg-orange-200 text-orange-800 text-[10px] rounded-full">LAST SHEET</span>}
                                    </p>
                                    <p className="text-gray-500">({layout.width}mm x {layout.length}mm, {weightKg.toFixed(2)} kg)</p>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <p>Nested Parts: {layout.nestedParts.length}</p>
                                    <p>Waste: <span className={`${isLastSheet ? 'text-orange-600' : 'text-green-600'} font-semibold`}>{layout.wastePercentage.toFixed(2)}%</span></p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </details>
        </div>
    );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, parameters }) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
        await exportToPdf(result, parameters);
    } catch (e) {
        console.error("Export failed", e);
    } finally {
        setIsExportingPdf(false);
    }
  };
  
  const handleExportCsv = () => {
      exportToCsv(result);
  };

  const handleExportDxf = () => {
      exportToDxf(result);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-brand-dark mb-4 flex items-center space-x-2">
            <FileTextIcon className="w-6 h-6"/>
            <span>Optimization Results</span>
        </h2>

        <SummaryCard summary={result.summary} />

        <div>
            <h3 className="text-xl font-bold text-brand-dark mb-4">Results by Material Group</h3>
            <div className="space-y-4">
                {result.resultsByGroup.map(group => (
                    <GroupResultCard key={group.materialKey} group={group} />
                ))}
            </div>
        </div>
        
        <div className="mt-8 border-t pt-4 text-center">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">Export Detailed Reports</h3>
            <div className="flex justify-center space-x-4">
                <button 
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="bg-brand-blue hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center space-x-2"
                >
                    {isExportingPdf ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating PDF...</span>
                        </>
                    ) : (
                        <span>Export PDF</span>
                    )}
                </button>
                <button 
                    onClick={handleExportDxf}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Export DXF
                </button>
                <button 
                    onClick={handleExportCsv}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Export CSV
                </button>
            </div>
        </div>
    </div>
  );
};

export default ResultsDisplay;
