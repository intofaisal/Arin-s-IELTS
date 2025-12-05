import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, User, Play } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storage';
import { TestModule } from '../types';

interface Message {
  role: 'examiner' | 'candidate';
  text: string;
}

const SpeakingPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'examiner', text: "Good afternoon. Can you tell me your full name, please?" }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition Setup (Browser native)
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
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
        setUserInput(prev => {
             // Simple logic to replace previous partial input if needed, or append.
             // For simplicity, we just set the final transcript
             return transcript;
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
    }
  }, []);

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
      // Format history for Gemini API
      const historyForAI = messages.map(m => ({
        role: m.role === 'examiner' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const responseText = await GeminiService.getSpeakingResponse(historyForAI, userInput);
      
      const updatedMessages = [...newMessages, { role: 'examiner', text: responseText } as Message];
      setMessages(updatedMessages);
      
      // Text-to-Speech for Examiner
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.lang = 'en-GB'; // British accent for IELTS
        window.speechSynthesis.speak(utterance);
      }

      // If conversation gets long, save a "completed" result
      if (updatedMessages.length > 10) {
          StorageService.saveResult({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              module: TestModule.SPEAKING,
              score: 0, // Mock score
              details: { length: updatedMessages.length }
          });
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-white p-6 rounded-t-xl border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mic className="w-6 h-6 text-orange-600" />
            Speaking Test Simulation
          </h2>
          <p className="text-sm text-slate-500">Practice Part 1, 2, and 3 with AI Examiner</p>
        </div>
        <button 
            onClick={() => setMessages([{ role: 'examiner', text: "Good afternoon. Can you tell me your full name, please?" }])}
            className="text-sm text-red-500 hover:bg-red-50 px-3 py-1 rounded"
        >
            Reset Test
        </button>
      </div>

      <div className="flex-1 bg-slate-100 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'examiner' ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
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