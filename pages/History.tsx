
import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { AuthService } from '../services/auth';
import { TestResult, TestModule } from '../types';
import { BookOpen, PenTool, Mic, Calendar } from 'lucide-react';

const HistoryPage = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
      setLoading(true);
      const user = AuthService.getCurrentUser();
      if (user) {
          const res = await StorageService.getResultsForUser(user.id);
          setResults(res);
      }
      setLoading(false);
  }

  const getIcon = (module: TestModule) => {
    switch (module) {
      case TestModule.READING: return <BookOpen className="w-5 h-5 text-blue-600" />;
      case TestModule.WRITING: return <PenTool className="w-5 h-5 text-purple-600" />;
      case TestModule.SPEAKING: return <Mic className="w-5 h-5 text-orange-600" />;
    }
  };

  const getColor = (module: TestModule) => {
    switch (module) {
        case TestModule.READING: return 'bg-blue-50 border-blue-100';
        case TestModule.WRITING: return 'bg-purple-50 border-purple-100';
        case TestModule.SPEAKING: return 'bg-orange-50 border-orange-100';
    }
  }

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Test History</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {results.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
                You haven't taken any tests yet.
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {results.map((result) => (
                    <div key={result.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className={`p-3 rounded-lg h-fit ${getColor(result.module)}`}>
                                    {getIcon(result.module)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">{result.module} Test</h4>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(result.date).toLocaleDateString()} at {new Date(result.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    
                                    {/* Additional Details based on module */}
                                    {result.module === TestModule.WRITING && result.details?.feedback && (
                                        <div className="mt-3 p-3 bg-white border border-slate-200 rounded text-sm text-slate-600 max-w-2xl">
                                            <p className="font-semibold mb-1">Feedback Summary:</p>
                                            <p className="line-clamp-2">{result.details.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-500 uppercase font-semibold">Band Score</div>
                                <div className="text-3xl font-bold text-indigo-600">{result.score}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;