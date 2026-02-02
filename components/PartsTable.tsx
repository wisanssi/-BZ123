
import React, { useCallback } from 'react';
import { Part, PartError } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusIcon, TrashIcon, UploadIcon, DownloadIcon } from './icons/Icons';

interface PartsTableProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  errors: Record<string, PartError>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, PartError>>>;
  maxSheetLength: number;
}

const THAI_HEADERS = ['ชิ้น (ID)', 'กว้าง(mm)', 'ยาว(mm)', 'จำนวน', 'ความหนา(mm)', 'เกรดเหล็ก (Grade)', 'ชื่อโครงการ'];
const CSV_HEADER = "id,width,length,quantity,thickness,grade,projectName\n";

const PartsTable: React.FC<PartsTableProps> = ({ parts, setParts, errors, setErrors, maxSheetLength }) => {

  const handleUpdate = (id: string, field: keyof Part, value: string | number) => {
    setParts(prevParts => prevParts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const addRow = () => {
    const newPart: Part = {
      id: uuidv4(),
      width: 0,
      length: 0,
      quantity: 1,
      thickness: 0,
      grade: '',
      projectName: '',
    };
    setParts([...parts, newPart]);
  };

  const deleteRow = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
    setErrors(prevErrors => {
        const newErrors = {...prevErrors};
        delete newErrors[id];
        return newErrors;
    })
  };

  const handleExportCSV = () => {
    const csvContent = CSV_HEADER + parts.map(p => 
      `${p.id},${p.width},${p.length},${p.quantity},${p.thickness},"${p.grade}","${p.projectName}"`
    ).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "parts_data.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        try {
          const rows = text.split('\n').slice(1); // Skip header
          const importedParts: Part[] = rows.filter(row => row.trim() !== '').map(row => {
            const values = row.split(',');
            return {
              id: values[0] || uuidv4(),
              width: parseFloat(values[1]) || 0,
              length: parseFloat(values[2]) || 0,
              quantity: parseInt(values[3]) || 0,
              thickness: parseFloat(values[4]) || 0,
              grade: values[5]?.replace(/"/g, '') || '',
              projectName: values[6]?.replace(/"/g, '') || '',
            };
          });
          setParts(importedParts);
        } catch (error) {
          console.error("Error parsing CSV:", error);
          alert("Failed to parse CSV file. Please check the format.");
        }
      }
    };
    reader.readAsText(file);
  };
  
  const InputCell = useCallback(<K extends keyof Part>({ part, field, type }: { part: Part; field: K; type: 'text' | 'number' }) => {
    const error = errors[part.id]?.[field as keyof PartError];
    const isLengthExceeded = field === 'length' && part.length > maxSheetLength;
    const baseClasses = "w-full p-1 border-transparent rounded bg-transparent focus:bg-white focus:ring-1 focus:ring-brand-blue";
    const errorClasses = "border-red-500 ring-1 ring-red-500";
    const warningClasses = "bg-yellow-100 text-yellow-800 focus:bg-yellow-50";

    return (
        <td className="px-2 py-1 whitespace-nowrap">
            <input 
                type={type}
                value={part[field]}
                onChange={(e) => handleUpdate(part.id, field, type === 'number' ? Number(e.target.value) : e.target.value)}
                className={`${baseClasses} ${error ? errorClasses : ''} ${isLengthExceeded ? warningClasses : ''}`}
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </td>
    );
  }, [errors, maxSheetLength]);


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
       <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-brand-dark">Parts Input</h2>
        <div className="flex items-center space-x-2">
            <label htmlFor="csv-upload" className="cursor-pointer bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-md shadow-sm transition-colors flex items-center space-x-2">
                <UploadIcon className="w-4 h-4" />
                <span>Import</span>
            </label>
            <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <button onClick={handleExportCSV} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md shadow-sm transition-colors flex items-center space-x-2">
                <DownloadIcon className="w-4 h-4" />
                <span>Export</span>
            </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {THAI_HEADERS.map(header => (
                <th key={header} className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
              ))}
              <th className="relative px-2 py-3"><span className="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parts.map((part) => (
              <tr key={part.id} className={`${part.length > maxSheetLength ? 'bg-yellow-50' : ''}`}>
                <td className="px-2 py-2 text-sm text-gray-500 truncate" style={{maxWidth: '100px'}} title={part.id}>{part.id}</td>
                <InputCell part={part} field="width" type="number" />
                <InputCell part={part} field="length" type="number" />
                <InputCell part={part} field="quantity" type="number" />
                <InputCell part={part} field="thickness" type="number" />
                <InputCell part={part} field="grade" type="text" />
                <InputCell part={part} field="projectName" type="text" />
                <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => deleteRow(part.id)} className="text-red-600 hover:text-red-900">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <button onClick={addRow} className="w-full border-2 border-dashed border-gray-300 hover:border-brand-blue text-gray-500 hover:text-brand-blue font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2">
          <PlusIcon className="w-5 h-5"/>
          <span>Add Part</span>
        </button>
      </div>
    </div>
  );
};

export default PartsTable;
