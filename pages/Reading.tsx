import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { QuestionBank, TestResult, TestModule, ReadingModule } from '../types';
import { CheckCircle, AlertCircle, Search, Edit3, X, Eye, ChevronDown } from 'lucide-react';

const calculateBandScore = (rawScore: number): number => {
  if (rawScore >= 39) return 9.0;
  if (rawScore >= 37) return 8.5;
  if (rawScore >= 35) return 8.0;
  if (rawScore >= 33) return 7.5;
  if (rawScore >= 30) return 7.0;
  if (rawScore >= 27) return 6.5;
  if (rawScore >= 23) return 6.0;
  if (rawScore >= 19) return 5.5;
  if (rawScore >= 15) return 5.0;
  if (rawScore >= 13) return 4.5;
  if (rawScore >= 10) return 4.0;
  return 3.5; // Simplification
};

const ReadingPage = () => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  
  // Selection State
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  
  // Content State
  const [readingModule, setReadingModule] = useState<ReadingModule | null>(null);
  
  // Test Execution State
  const [currentPassageIdx, setCurrentPassageIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); 
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  
  // Analysis State
  const [highlightedEvidence, setHighlightedEvidence] = useState<string | null>(null);

  // Refs for highlighting
  const passageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedBanks = StorageService.getQuestionBanks().filter(b => b.tests && b.tests.some(t => t.reading));
    setBanks(loadedBanks);
    if (loadedBanks.length > 0) {
      const firstBank = loadedBanks[0];
      setSelectedBankId(firstBank.id);
      
      const firstTestWithReading = firstBank.tests.find(t => t.reading);
      if (firstTestWithReading) {
        setSelectedTestId(firstTestWithReading.id);
        setReadingModule(firstTestWithReading.reading || null);
      }
    }
  }, []);

  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId);
    const bank = banks.find(b => b.id === bankId);
    if (bank) {
        const firstTest = bank.tests.find(t => t.reading);
        if (firstTest) {
            handleTestChange(bank, firstTest.id);
        } else {
            setReadingModule(null);
            setSelectedTestId('');
        }
    }
  };

  const handleTestChange = (bank: QuestionBank, testId: string) => {
      setSelectedTestId(testId);
      const test = bank.tests.find(t => t.id === testId);
      
      // Reset everything
      setReadingModule(test?.reading || null);
      setAnswers({});
      setIsSubmitted(false);
      setCurrentPassageIdx(0);
      setNotes('');
      setHighlightedEvidence(null);
  };

  const handleAnswer = (qId: number, val: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = () => {
    if (!readingModule) return;
    setIsSubmitted(true);
    
    // Calculate Score
    let rawScore = 0;
    let totalQuestions = 0;
    
    readingModule.passages.forEach(p => {
      p.questions.forEach(q => {
        totalQuestions++;
        const userAns = answers[q.id]?.trim().toLowerCase();
        const correctAns = q.correctAnswer?.trim().toLowerCase();
        if (userAns && correctAns && userAns === correctAns) {
          rawScore++;
        }
      });
    });

    const band = calculateBandScore(rawScore);

    const testResult: TestResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      module: TestModule.READING,
      score: band,
      details: { rawScore, totalQuestions, answers }
    };
    StorageService.saveResult(testResult);
  };

  const highlightSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (passageRef.current && passageRef.current.contains(selection.anchorNode)) {
       try {
         document.execCommand('hiliteColor', false, '#fef08a');
         selection.removeAllRanges();
       } catch (e) {
         console.error("Highlight failed", e);
       }
    }
  };

  const locateEvidence = (evidence: string) => {
    if (!evidence || !passageRef.current) return;
    setHighlightedEvidence(evidence);
  };

  if (banks.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Reading Tests Found</h3>
        <p className="text-slate-500 mb-6">Upload a PDF to generate reading tests.</p>
        <a href="#/upload" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Go to Upload</a>
      </div>
    );
  }

  const currentBank = banks.find(b => b.id === selectedBankId);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative">
       {/* Top Bar */}
       <div className="bg-white p-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center shadow-sm shrink-0 z-10 gap-3">
         <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto">
            {/* Bank Selector */}
            <div className="relative">
                <select 
                  value={selectedBankId} 
                  onChange={(e) => handleBankChange(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-3 pr-8 py-2 min-w-[150px] font-medium"
                >
                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Test Selector */}
            {currentBank && (
                 <div className="relative">
                    <select 
                        value={selectedTestId} 
                        onChange={(e) => handleTestChange(currentBank, e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-3 pr-8 py-2 min-w-[100px] font-medium"
                    >
                        {currentBank.tests.filter(t => t.reading).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                 </div>
            )}
            
            {readingModule && (
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    {readingModule.passages.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentPassageIdx(idx)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                                currentPassageIdx === idx 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Passage {idx + 1}
                        </button>
                    ))}
                </div>
            )}
         </div>
         
         <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
                onClick={() => setShowNotes(!showNotes)}
                className={`p-2 rounded-lg border transition-colors ${showNotes ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}
                title="Toggle Notes"
            >
                <Edit3 className="w-5 h-5" />
            </button>
            
            {!isSubmitted ? (
             <button onClick={handleSubmit} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 text-sm whitespace-nowrap">
               Submit Test
             </button>
           ) : (
             <div className="flex items-center gap-3">
                <div className="text-right mr-2">
                    <p className="text-xs text-slate-500 uppercase font-bold">Band Score</p>
                    <p className="text-xl font-bold text-indigo-600">
                        {readingModule && calculateBandScore(readingModule.passages.flatMap(p => p.questions).reduce((acc, q) => {
                             return acc + (answers[q.id]?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase() ? 1 : 0);
                        }, 0))}
                    </p>
                </div>
                {/* Simple reset logic - reselect current test */}
                <button 
                    onClick={() => { if(currentBank) handleTestChange(currentBank, selectedTestId); }} 
                    className="text-slate-500 hover:text-indigo-600 underline text-sm"
                >
                    Retake
                </button>
             </div>
           )}
         </div>
       </div>

       {/* Content Area */}
       {!readingModule ? (
           <div className="flex-1 flex items-center justify-center text-slate-400">
               Select a test to begin.
           </div>
       ) : (
           <div className="flex-1 flex overflow-hidden">
              {/* Left: Passage Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-white border-r border-slate-200 relative group selection:bg-yellow-200 selection:text-black">
                 <div className="max-w-3xl mx-auto">
                     <h2 className="text-2xl font-bold text-slate-900 mb-6">{readingModule.passages[currentPassageIdx].title}</h2>
                     
                     {!isSubmitted && (
                         <div className="sticky top-0 z-20 flex justify-end mb-2 pointer-events-none">
                             <button 
                                onMouseDown={(e) => { e.preventDefault(); highlightSelection(); }}
                                className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full shadow-sm pointer-events-auto border border-yellow-200 hover:bg-yellow-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                            >
                                <Edit3 className="w-3 h-3" /> Highlight Selection
                            </button>
                         </div>
                     )}

                     <div 
                        ref={passageRef}
                        className="prose prose-slate max-w-none prose-p:leading-relaxed text-slate-800"
                        contentEditable={!isSubmitted}
                        suppressContentEditableWarning={true}
                        onKeyDown={(e) => e.preventDefault()}
                        dangerouslySetInnerHTML={{ __html: readingModule.passages[currentPassageIdx].content }}
                     />
                 </div>
              </div>

              {/* Right: Questions */}
              <div className={`w-[450px] flex-shrink-0 bg-slate-50 overflow-y-auto p-6 border-l border-slate-200 transition-all ${showNotes ? 'mr-80' : ''}`}>
                 {(() => {
                     const currentPassage = readingModule.passages[currentPassageIdx];
                     const groupedQuestions = [];
                     let currentGroup = [];
                     let currentInstruction = currentPassage.questions[0]?.groupInstruction || "Questions";

                     for (const q of currentPassage.questions) {
                         if (q.groupInstruction && q.groupInstruction !== currentInstruction) {
                             groupedQuestions.push({ instruction: currentInstruction, questions: currentGroup });
                             currentInstruction = q.groupInstruction;
                             currentGroup = [];
                         }
                         currentGroup.push(q);
                     }
                     if (currentGroup.length > 0) groupedQuestions.push({ instruction: currentInstruction, questions: currentGroup });

                     return groupedQuestions.map((group, gIdx) => (
                        <div key={gIdx} className="mb-8">
                             <div className="bg-white border border-slate-200 p-4 rounded-lg mb-4 shadow-sm sticky top-0 z-10">
                                 <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                                     {group.instruction || "Questions"}
                                 </h4>
                             </div>
                             
                             <div className="space-y-6">
                                 {group.questions.map((q) => {
                                     const isCorrect = answers[q.id]?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
                                     return (
                                        <div key={q.id} className={`p-4 rounded-xl border ${isSubmitted ? (isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-white border-slate-200'}`}>
                                            <div className="flex gap-3 mb-3">
                                                <span className="font-bold text-indigo-600 text-lg min-w-[1.5rem]">{q.id}.</span>
                                                <div className="flex-1">
                                                    <p className="text-slate-800 font-medium text-sm leading-relaxed">{q.text}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="pl-9 space-y-3">
                                                {/* Options & Inputs */}
                                                {q.type === 'multiple_choice' && q.options && (
                                                    <div className="space-y-2">
                                                        {q.options.map((opt, i) => (
                                                            <label key={i} className={`flex items-start gap-3 p-2 rounded-lg border text-sm cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-slate-50'}`}>
                                                                <input 
                                                                    type="radio" 
                                                                    name={`q-${q.id}`} 
                                                                    value={opt}
                                                                    checked={answers[q.id] === opt}
                                                                    onChange={() => handleAnswer(q.id, opt)}
                                                                    disabled={isSubmitted}
                                                                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="text-slate-700">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {(q.type === 'true_false_not_given' || q.type === 'matching_headings') && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {(q.type === 'matching_headings' ? ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'] : ['TRUE', 'FALSE', 'NOT GIVEN']).map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => handleAnswer(q.id, opt)}
                                                                disabled={isSubmitted}
                                                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                                                                    answers[q.id] === opt 
                                                                    ? 'bg-indigo-600 text-white border-indigo-600' 
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.type === 'fill_gap' && (
                                                    <input
                                                        type="text"
                                                        placeholder="Answer..."
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                                                        disabled={isSubmitted}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                )}

                                                {/* Analysis */}
                                                {isSubmitted && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200/50 text-xs">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <span className="text-slate-500">Correct: </span>
                                                                <span className="font-bold text-green-700">{q.correctAnswer}</span>
                                                            </div>
                                                            {q.evidence && (
                                                                <button 
                                                                    onClick={() => locateEvidence(q.evidence!)}
                                                                    className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                                                                >
                                                                    <Eye className="w-3 h-3" /> Show Evidence
                                                                </button>
                                                            )}
                                                        </div>
                                                        {highlightedEvidence === q.evidence && (
                                                            <div className="mt-2 p-2 bg-green-100 rounded text-green-800 italic border border-green-200">
                                                                "{q.evidence}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                     );
                                 })}
                             </div>
                        </div>
                     ));
                 })()}
              </div>
           </div>
       )}

       {/* Notes Sidebar */}
       <div className={`fixed top-[130px] right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-xl transform transition-transform duration-300 ease-in-out ${showNotes ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" /> Notepad
                    </h3>
                    <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 p-4">
                    <textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Write your notes here..."
                        className="w-full h-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg resize-none text-slate-700 text-sm leading-relaxed focus:ring-2 focus:ring-yellow-400 outline-none font-mono"
                    />
                </div>
            </div>
       </div>
    </div>
  );
};

export default ReadingPage;