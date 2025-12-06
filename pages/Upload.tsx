
import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, CheckCircle, AlertCircle, Loader2, FileText, Lock, BookOpen, PenTool, Mic } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storage';
import { AuthService } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { TestModule } from '../types';

const UploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [activeModule, setActiveModule] = useState<TestModule>(TestModule.READING);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!AuthService.isAdmin()) {
      const timer = setTimeout(() => {
        if (!AuthService.isAdmin()) navigate('/');
        else setIsAdmin(true);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setIsAdmin(true);
    }
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let tests = [];
      
      switch (activeModule) {
          case TestModule.READING:
              tests = await GeminiService.extractReadingTests(file);
              break;
          case TestModule.WRITING:
              tests = await GeminiService.extractWritingTests(file);
              break;
          case TestModule.SPEAKING:
              tests = await GeminiService.extractSpeakingTests(file);
              break;
      }

      await StorageService.saveQuestionBank({
        id: crypto.randomUUID(),
        name: `${file.name.replace('.pdf', '')} (${activeModule})`,
        uploadedAt: new Date().toISOString(),
        tests: tests
      });

      setSuccess(`Successfully extracted ${tests.length} ${activeModule} tests!`);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Upload Content</h2>
        <p className="text-slate-500">Select module and upload PDF to extract tests.</p>
      </div>

      {/* Module Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
         {[
             { id: TestModule.READING, icon: BookOpen, label: 'Reading' },
             { id: TestModule.WRITING, icon: PenTool, label: 'Writing' },
             { id: TestModule.SPEAKING, icon: Mic, label: 'Speaking' }
         ].map(m => (
             <button
                key={m.id}
                onClick={() => { setActiveModule(m.id); setError(null); setSuccess(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeModule === m.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
             >
                 <m.icon className="w-4 h-4" />
                 {m.label}
             </button>
         ))}
      </div>

      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center hover:border-indigo-400 transition-colors">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-indigo-50 rounded-full">
            <UploadIcon className="w-8 h-8 text-indigo-600" />
          </div>
          
          <div className="space-y-1">
             <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-indigo-600 font-medium hover:text-indigo-700">Click to upload {activeModule} PDF</span>
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
          </div>
          {!isProcessing && !success && (
             <button 
               onClick={handleProcess}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
             >
               Extract Tests
             </button>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-3 border border-green-100">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-bold">{success}</p>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-1">Requirement for {activeModule}:</p>
          <ul className="list-disc list-inside ml-1 opacity-80">
              {activeModule === TestModule.READING && <li>Must contain exactly 3 Passages and 40 Questions.</li>}
              {activeModule === TestModule.WRITING && <li>Must contain both Task 1 and Task 2 prompts.</li>}
              {activeModule === TestModule.SPEAKING && <li>Should contain Part 1, Cue Card, and Part 3.</li>}
          </ul>
      </div>
    </div>
  );
};

export default UploadPage;