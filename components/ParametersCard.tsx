
import React from 'react';
import type { UserParameters } from '../types';
import { SettingsIcon } from './icons/Icons';

interface ParametersCardProps {
  parameters: UserParameters;
  setParameters: React.Dispatch<React.SetStateAction<UserParameters>>;
}

const ParameterInput: React.FC<{ label: string; unit: string; value: number | string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }> = ({ label, unit, value, onChange, type = 'number' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="focus:ring-brand-blue focus:border-brand-blue block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                min={type === 'number' ? 0 : undefined}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{unit}</span>
            </div>
        </div>
    </div>
);


const ParametersCard: React.FC<ParametersCardProps> = ({ parameters, setParameters }) => {
  const handleChange = (field: keyof UserParameters, value: any) => {
    setParameters(prev => ({ ...prev, [field]: value }));
  };

  const handleRangeChange = (field: 'min' | 'max', value: number) => {
    setParameters(prev => ({
        ...prev,
        rollWeightRange: { ...prev.rollWeightRange, [field]: value }
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h2 className="text-xl font-bold text-brand-dark mb-4 flex items-center space-x-2">
        <SettingsIcon className="w-6 h-6" />
        <span>User Parameters</span>
      </h2>
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700">Optimization Algorithm</label>
            <select
                value={parameters.algorithm}
                onChange={(e) => handleChange('algorithm', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md"
            >
                <option>Standard Simulation</option>
                <option>Genetic Algorithm</option>
                <option>Simulated Annealing</option>
                <option>BZ12</option>
            </select>
        </div>
        <ParameterInput 
            label="Max Sheet Length" 
            unit="mm" 
            value={parameters.maxSheetLength} 
            onChange={(e) => handleChange('maxSheetLength', Number(e.target.value))}
        />
        <ParameterInput 
            label="Kerf" 
            unit="mm" 
            value={parameters.kerf} 
            onChange={(e) => handleChange('kerf', Number(e.target.value))}
        />
        <ParameterInput 
            label="Candidate Coil Widths" 
            unit="mm" 
            type="text"
            value={parameters.candidateCoilWidths}
            onChange={(e) => handleChange('candidateCoilWidths', e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Roll Weight Range</label>
          <div className="mt-1 grid grid-cols-2 gap-4">
              <ParameterInput 
                label="Min"
                unit="kg" 
                value={parameters.rollWeightRange.min} 
                onChange={(e) => handleRangeChange('min', Number(e.target.value))}
              />
              <ParameterInput 
                label="Max"
                unit="kg" 
                value={parameters.rollWeightRange.max} 
                onChange={(e) => handleRangeChange('max', Number(e.target.value))}
              />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParametersCard;
