
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/geminiService';
import { AuthService } from '../services/auth';
import { TestModule, WritingFeedback, WritingModule, PracticeTest } from '../types';
import { Clock, Send, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const WritingPage = () => {
  const [loading, setLoading] = useState(true);
  const [allTests, setAllTests] = useState<{bankId: string, bankName: string, test: PracticeTest}[]>([]);
  const [selectedTestUniqueId, setSelectedTestUniqueId] = useState<string>('');
  
  const [currentTask, setCurrentTask] = useState<WritingModule | null>(null);
  const [activeTaskType, setActiveTaskType] = useState<'Task 1' | 'Task 2'>('Task 2'); // Default to Task 2 as it's more common for main practice

  // Essay State
  const [essay, setEssay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
      setLoading(true);
      const tests = await StorageService.getAllTestsByModule(TestModule.WRITING);
      setAllTests(tests);
      if (tests.length > 0) {
          const first = tests[0];
          handleTestSelection(`${first.bankId}|${first.test.id}`, tests);
      }
      setLoading(false);
  }

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

  const handleTestSelection = (uniqueId: string, testList = allTests) => {
      setSelectedTestUniqueId(uniqueId);
      const [bankId, testId] = uniqueId.split('|');
      const found = testList.find(t => t.bankId === bankId && t.test.id === testId);
      setCurrentTask(found?.test.writing || null);
      
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
    const user = AuthService.getCurrentUser();
    if (!essay.trim() || !currentTask || !user) return;
    setIsActive(false);
    setIsSubmitting(true);
    
    try {
      const prompt = activeTaskType === 'Task 1' ? currentTask.task1Prompt : currentTask.task2Prompt;
      const result = await GeminiService.gradeWriting(essay, prompt, activeTaskType);
      setFeedback(result);
      
      await StorageService.saveResult({
        id: crypto.randomUUID(),
        userId: user.id,
        date: new Date().toISOString(),
        module: TestModule.WRITING,
        score: result.overallBand,
        details: { ...result, taskType: activeTaskType }
      });
    } catch (error) {
      console.error(error);
      alert("Failed to grade essay. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;

  if (allTests.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Writing Tasks Found</h3>
        <p className="text-slate-500">Admin needs to upload writing tests.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-4 items-center">
            <div className="relative">
                <select 
                    value={selectedTestUniqueId} 
                    onChange={(e) => handleTestSelection(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-3 pr-8 py-2 min-w-[200px] font-medium"
                >
                    {allTests.map(t => (
                        <option key={`${t.bankId}|${t.test.id}`} value={`${t.bankId}|${t.test.id}`}>
                            {t.test.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => { setActiveTaskType('Task 1'); setEssay(''); setFeedback(null); }}
                  className={`px-3 py-1 text-xs font-bold rounded ${activeTaskType === 'Task 1' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                    TASK 1
                </button>
                <button 
                  onClick={() => { setActiveTaskType('Task 2'); setEssay(''); setFeedback(null); }}
                  className={`px-3 py-1 text-xs font-bold rounded ${activeTaskType === 'Task 2' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                    TASK 2
                </button>
            </div>
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
              <Send className="w-4 h-4" /> Submit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Prompt */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <span className={`inline-block text-xs font-bold px-2 py-1 rounded mb-3 ${activeTaskType === 'Task 1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {activeTaskType.toUpperCase()}
            </span>
            <div className="prose prose-slate text-slate-600">
               <ReactMarkdown>
                   {activeTaskType === 'Task 1' 
                       ? currentTask?.task1Prompt || "No prompt available."
                       : currentTask?.task2Prompt || "No prompt available."}
               </ReactMarkdown>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-sm text-slate-400">
              {activeTaskType === 'Task 1' ? 'Spend about 20 minutes. Write at least 150 words.' : 'Spend about 40 minutes. Write at least 250 words.'}
            </div>
          </div>

          {/* Feedback Section */}
          {feedback && (
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm ring-4 ring-indigo-50/50">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-slate-900">AI Assessment</h3>
                 <div className="flex items-center gap-2">
                   <span className="text-slate-500 text-sm">Band</span>
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
                   <h4 className="font-semibold text-slate-900 mb-2">Tips</h4>
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
            placeholder={isActive ? "Start typing..." : "Click 'Start Timer' to begin."}
            className="flex-1 w-full p-6 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 shadow-sm disabled:bg-slate-50"
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