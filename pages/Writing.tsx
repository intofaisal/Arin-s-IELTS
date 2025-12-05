import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/geminiService';
import { QuestionBank, TestResult, TestModule, WritingFeedback, WritingModule } from '../types';
import { Clock, Send, AlertCircle, CheckCircle, ChevronDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const WritingPage = () => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  
  // Selection
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  
  // Content
  const [currentTask, setCurrentTask] = useState<WritingModule | null>(null);
  
  // Essay State
  const [essay, setEssay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const loadedBanks = StorageService.getQuestionBanks().filter(b => b.tests && b.tests.some(t => t.writing));
    setBanks(loadedBanks);
    if (loadedBanks.length > 0) {
      const firstBank = loadedBanks[0];
      setSelectedBankId(firstBank.id);
      
      const firstTestWithWriting = firstBank.tests.find(t => t.writing);
      if (firstTestWithWriting) {
        setSelectedTestId(firstTestWithWriting.id);
        setCurrentTask(firstTestWithWriting.writing || null);
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTimer((seconds) => seconds + 1);
      }, 1000);
    } else if (!isActive && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId);
    const bank = banks.find(b => b.id === bankId);
    if (bank) {
        const firstTest = bank.tests.find(t => t.writing);
        if (firstTest) {
            handleTestChange(bank, firstTest.id);
        } else {
            setCurrentTask(null);
            setSelectedTestId('');
        }
    }
  };

  const handleTestChange = (bank: QuestionBank, testId: string) => {
      setSelectedTestId(testId);
      const test = bank.tests.find(t => t.id === testId);
      setCurrentTask(test?.writing || null);
      
      // Reset
      setEssay('');
      setFeedback(null);
      setTimer(0);
      setIsActive(false);
  };

  const startTest = () => setIsActive(true);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!essay.trim() || !currentTask) return;
    setIsActive(false);
    setIsSubmitting(true);
    
    try {
      const result = await GeminiService.gradeWriting(essay, currentTask.task2Prompt);
      setFeedback(result);
      
      const testResult: TestResult = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        module: TestModule.WRITING,
        score: result.overallBand,
        details: result
      };
      StorageService.saveResult(testResult);
    } catch (error) {
      console.error(error);
      alert("Failed to grade essay. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (banks.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Writing Tasks Found</h3>
        <p className="text-slate-500 mb-6">Upload a Cambridge PDF to generate writing tasks.</p>
        <a href="#/upload" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Go to Upload</a>
      </div>
    );
  }

  const currentBank = banks.find(b => b.id === selectedBankId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Book</label>
            <div className="relative">
                <select 
                  value={selectedBankId} 
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-3 pr-8 py-2 min-w-[200px]"
                >
                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          {currentBank && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Test</label>
                <div className="relative">
                    <select 
                        value={selectedTestId} 
                        onChange={(e) => handleTestChange(currentBank, e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-3 pr-8 py-2 min-w-[120px]"
                    >
                        {currentBank.tests.filter(t => t.writing).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-700 font-mono text-xl bg-slate-100 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5 text-slate-500" />
            {formatTime(timer)}
          </div>
          {!isActive && !feedback && (
            <button onClick={startTest} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-sm">
              Start Timer
            </button>
          )}
          {isActive && (
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 shadow-sm flex items-center gap-2">
              <Send className="w-4 h-4" /> Submit Essay
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Prompt */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded mb-3">TASK 2</span>
            <h3 className="font-semibold text-lg text-slate-900 mb-4">Writing Task</h3>
            <div className="prose prose-slate text-slate-600">
               <ReactMarkdown>{currentTask?.task2Prompt || "Select a test to view prompt."}</ReactMarkdown>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-400">
              You should spend about 40 minutes on this task. Write at least 250 words.
            </div>
          </div>

          {/* Feedback Section */}
          {feedback && (
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm ring-4 ring-indigo-50/50">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-slate-900">AI Assessment</h3>
                 <div className="flex items-center gap-2">
                   <span className="text-slate-500 text-sm">Overall Band</span>
                   <span className="bg-indigo-600 text-white text-2xl font-bold px-3 py-1 rounded-lg">{feedback.overallBand}</span>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-6">
                  {Object.entries(feedback.scores).map(([key, score]) => (
                    <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="font-bold text-lg text-slate-900">{score}</div>
                    </div>
                  ))}
               </div>

               <div className="space-y-4">
                 <div>
                   <h4 className="font-semibold text-slate-900 mb-2">Feedback</h4>
                   <p className="text-sm text-slate-600 leading-relaxed">{feedback.feedback}</p>
                 </div>
                 <div>
                   <h4 className="font-semibold text-slate-900 mb-2">Tips to Improve</h4>
                   <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                     {feedback.improvementTips.map((tip, i) => <li key={i}>{tip}</li>)}
                   </ul>
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex flex-col h-full min-h-[500px]">
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            disabled={(!isActive && !feedback && timer === 0) || !currentTask}
            placeholder={isActive ? "Start typing your essay here..." : "Click 'Start Timer' to begin writing."}
            className="flex-1 w-full p-6 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
          <div className="flex justify-between items-center mt-3 text-sm text-slate-500 px-2">
            <span>Word Count: {essay.trim().split(/\s+/).filter(w => w.length > 0).length}</span>
            {isSubmitting && <span className="flex items-center gap-2 text-indigo-600"><Loader2 className="w-4 h-4 animate-spin"/> Grading...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingPage;