
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, User, Play, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storage';
import { AuthService } from '../services/auth';
import { TestModule, PracticeTest, SpeakingModule } from '../types';

interface Message {
  role: 'examiner' | 'candidate';
  text: string;
}

const SpeakingPage = () => {
  const [loading, setLoading] = useState(true);
  const [allTests, setAllTests] = useState<{bankId: string, bankName: string, test: PracticeTest}[]>([]);
  const [selectedTestUniqueId, setSelectedTestUniqueId] = useState<string>('');
  const [currentContext, setCurrentContext] = useState<SpeakingModule | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'examiner', text: "Good afternoon. Can you tell me your full name, please?" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadTests();
    
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setUserInput(transcript);
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  }, []);

  const loadTests = async () => {
      setLoading(true);
      const tests = await StorageService.getAllTestsByModule(TestModule.SPEAKING);
      setAllTests(tests);
      if (tests.length > 0) {
          // Auto select first
          handleTestSelection(`${tests[0].bankId}|${tests[0].test.id}`, tests);
      }
      setLoading(false);
  }

  const handleTestSelection = (uniqueId: string, testList = allTests) => {
      setSelectedTestUniqueId(uniqueId);
      const [bankId, testId] = uniqueId.split('|');
      const found = testList.find(t => t.bankId === bankId && t.test.id === testId);
      setCurrentContext(found?.test.speaking);
      resetTest();
  };

  const resetTest = () => {
      setMessages([{ role: 'examiner', text: "Good afternoon. Can you tell me your full name, please?" }]);
      setUserInput('');
      setIsRecording(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setUserInput('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSend = async () => {
    if (!userInput.trim()) return;
    
    if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
    }

    const newMessages = [...messages, { role: 'candidate', text: userInput } as Message];
    setMessages(newMessages);
    setUserInput('');
    setIsProcessing(true);

    try {
      const historyForAI = messages.map(m => ({
        role: m.role === 'examiner' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const responseText = await GeminiService.getSpeakingResponse(historyForAI, userInput, currentContext);
      
      const updatedMessages = [...newMessages, { role: 'examiner', text: responseText } as Message];
      setMessages(updatedMessages);
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.lang = 'en-GB'; 
        window.speechSynthesis.speak(utterance);
      }

      const user = AuthService.getCurrentUser();
      if (updatedMessages.length > 10 && user) {
          await StorageService.saveResult({
              id: crypto.randomUUID(),
              userId: user.id,
              date: new Date().toISOString(),
              module: TestModule.SPEAKING,
              score: 0,
              details: { length: updatedMessages.length }
          });
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-white p-4 rounded-t-xl border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center shadow-sm z-10 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mic className="w-6 h-6 text-orange-600" />
            Speaking Simulation
          </h2>
        </div>

        <div className="flex items-center gap-2">
            {allTests.length > 0 && (
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
            )}
            <button 
                onClick={resetTest}
                className="text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                title="Reset Test"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-100 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'examiner' ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'examiner' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                {msg.role === 'examiner' ? <Volume2 className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className={`p-4 rounded-2xl ${msg.role === 'examiner' ? 'bg-white text-slate-800 rounded-bl-none shadow-sm' : 'bg-indigo-600 text-white rounded-br-none shadow-md'}`}>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-slate-500">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
               </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-4 rounded-b-xl border-t border-slate-200">
        <div className="flex gap-4 items-end">
           <textarea
             value={userInput}
             onChange={(e) => setUserInput(e.target.value)}
             onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
             placeholder="Type your answer or use microphone..."
             className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-14 max-h-32"
           />
           <button 
             onClick={toggleRecording}
             className={`p-4 rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-600 animate-pulse ring-2 ring-red-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
           </button>
           <button 
             onClick={handleSend}
             disabled={!userInput.trim() || isProcessing}
             className="p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
           >
             <Play className="w-6 h-6 fill-current" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default SpeakingPage;