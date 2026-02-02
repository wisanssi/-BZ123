
import React, { useState, useCallback } from 'react';
import { Part, UserParameters, OptimizationResult, PartError } from './types';
import { v4 as uuidv4 } from 'uuid';
import ParametersCard from './components/ParametersCard';
import PartsTable from './components/PartsTable';
import ResultsDisplay from './components/ResultsDisplay';
import { runOptimization } from './services/geminiService';
import { CpuIcon, SettingsIcon } from './components/icons/Icons';

const initialParameters: UserParameters = {
  maxSheetLength: 18000,
  kerf: 5,
  candidateCoilWidths: '1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000, 2050, 2100',
  rollWeightRange: { min: 4000, max: 5500 },
  algorithm: 'Standard Simulation',
};

const App: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([
    { id: uuidv4(), width: 1000, length: 2500, quantity: 10, thickness: 2, grade: 'SS400', projectName: 'Project A' },
    { id: uuidv4(), width: 500, length: 1500, quantity: 20, thickness: 2, grade: 'SS400', projectName: 'Project A' },
    { id: uuidv4(), width: 800, length: 13000, quantity: 5, thickness: 3, grade: 'A36', projectName: 'Project B' },
  ]);
  const [parameters, setParameters] = useState<UserParameters>(initialParameters);
  const [errors, setErrors] = useState<Record<string, PartError>>({});
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateParts = useCallback(() => {
    const newErrors: Record<string, PartError> = {};
    let hasErrors = false;

    parts.forEach(part => {
      const partErrors: PartError = {};
      if (part.width <= 0) partErrors.width = 'ต้องมากกว่า 0';
      if (part.length <= 0) partErrors.length = 'ต้องมากกว่า 0';
      if (!Number.isInteger(part.quantity) || part.quantity <= 0) partErrors.quantity = 'ต้องเป็นจำนวนเต็มบวก';
      if (part.thickness <= 0) partErrors.thickness = 'ต้องมากกว่า 0';
      if (!part.grade) partErrors.grade = 'ต้องไม่ว่างเปล่า';
      if (!part.projectName) partErrors.projectName = 'ต้องไม่ว่างเปล่า';

      if (Object.keys(partErrors).length > 0) {
        newErrors[part.id] = partErrors;
        hasErrors = true;
      }
    });
    setErrors(newErrors);
    return !hasErrors;
  }, [parts]);
  
  const handleRunOptimization = async () => {
    if (!validateParts()) {
      setApiError('กรุณาแก้ไขข้อผิดพลาดในตารางก่อนดำเนินการ');
      return;
    }
    
    setIsLoading(true);
    setApiError(null);
    setOptimizationResult(null);

    try {
      const result = await runOptimization(parts, parameters);
      setOptimizationResult(result);
    } catch (error) {
      console.error("Optimization failed:", error);
      setApiError(error instanceof Error ? error.message : "An unknown error occurred during optimization.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-brand-dark font-sans">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand-dark">Steel Coil Nesting Optimizer</h1>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ParametersCard parameters={parameters} setParameters={setParameters} />
          </div>
          <div className="lg:col-span-2">
            <PartsTable 
              parts={parts} 
              setParts={setParts}
              errors={errors}
              setErrors={setErrors}
              maxSheetLength={parameters.maxSheetLength}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={handleRunOptimization}
            disabled={isLoading}
            className="w-full max-w-md bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
             <CpuIcon className="w-6 h-6" />
            )}
            <span>{isLoading ? 'กำลังประมวลผล...' : 'เริ่มการคำนวณ'}</span>
          </button>
        </div>

        {apiError && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <strong>Error:</strong> {apiError}
          </div>
        )}

        {optimizationResult && !isLoading && (
          <div className="mt-8">
            <ResultsDisplay result={optimizationResult} parameters={parameters} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
