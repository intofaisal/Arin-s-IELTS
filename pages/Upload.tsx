import React, { useState } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storage';

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testsFound, setTestsFound] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
      setTestsFound(0);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const data = await GeminiService.extractTestContent(file);
      
      if (!data.tests || data.tests.length === 0) {
        throw new Error("Could not identify any valid Practice Tests in this PDF.");
      }

      StorageService.saveQuestionBank({
        id: crypto.randomUUID(),
        name: file.name.replace('.pdf', ''),
        uploadedAt: new Date().toISOString(),
        tests: data.tests
      });

      setTestsFound(data.tests.length);
      setSuccess(true);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process PDF. Please try a clearer PDF or a different file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Add New Questions</h2>
        <p className="text-slate-500">Upload a Cambridge IELTS PDF. AI will extract multiple Practice Tests automatically.</p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center transition-colors hover:border-indigo-400">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-indigo-50 rounded-full">
            <UploadIcon className="w-8 h-8 text-indigo-600" />
          </div>
          
          <div className="space-y-1">
             <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-indigo-600 font-medium hover:text-indigo-700">Click to upload</span>
              <span className="text-slate-500"> or drag and drop</span>
              <input 
                id="file-upload" 
                type="file" 
                accept=".pdf"
                className="hidden" 
                onChange={handleFileChange}
                disabled={isProcessing}
              />
            </label>
            <p className="text-sm text-slate-400">PDF up to 10MB</p>
          </div>
        </div>
      </div>

      {file && (
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-500" />
            <span className="font-medium text-slate-700">{file.name}</span>
            <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
          {!isProcessing && !success && (
             <button 
               onClick={handleProcess}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
             >
               Process with AI
             </button>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing multiple tests...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Processing complete!</p>
            <p className="text-sm">Successfully extracted {testsFound} tests from the PDF.</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-6 rounded-xl text-sm text-blue-800 space-y-2">
        <h4 className="font-semibold flex items-center gap-2">
           <span className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full">Tip</span>
           How to get best results
        </h4>
        <ul className="list-disc list-inside space-y-1 ml-1 text-blue-700">
          <li>Upload clear, standard Cambridge IELTS PDFs.</li>
          <li>The AI will attempt to recognize "Test 1", "Test 2", etc. and group questions accordingly.</li>
          <li>Each Reading Test will have 3 passages.</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadPage;