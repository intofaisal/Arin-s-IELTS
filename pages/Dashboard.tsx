import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PenTool, Mic, ArrowRight, TrendingUp } from 'lucide-react';
import { StorageService } from '../services/storage';
import { TestResult, TestModule } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [userName] = useState(StorageService.getUserName());

  useEffect(() => {
    setResults(StorageService.getResults());
  }, []);

  const getLatestScore = (module: TestModule) => {
    const moduleResults = results.filter(r => r.module === module);
    return moduleResults.length > 0 ? moduleResults[0].score : '-';
  };

  const chartData = results
    .slice(0, 10)
    .reverse()
    .map(r => ({
      date: new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: r.score
    }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome back, {userName}!</h2>
          <p className="text-slate-500 mt-1">Ready to practice today?</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-slate-500">Overall Estimated Band</p>
          <p className="text-3xl font-bold text-indigo-600">
            {results.length > 0 ? (results.reduce((a, b) => a + b.score, 0) / results.length).toFixed(1) : '-'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Reading', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', to: '/reading', score: getLatestScore(TestModule.READING) },
          { label: 'Writing', icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-50', to: '/writing', score: getLatestScore(TestModule.WRITING) },
          { label: 'Speaking', icon: Mic, color: 'text-orange-600', bg: 'bg-orange-50', to: '/speaking', score: getLatestScore(TestModule.SPEAKING) },
        ].map((item) => (
          <Link key={item.label} to={item.to} className="group block p-6 bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all hover:border-indigo-200">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${item.bg}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest Band</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="text-sm text-slate-500 group-hover:text-indigo-600 transition-colors">Start Mock Test</p>
              </div>
              <span className="text-3xl font-bold text-slate-900">{item.score}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Progress Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-lg">Performance Trend</h3>
        </div>
        <div className="h-64 w-full">
          {results.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis domain={[0, 9]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              No test data available yet.
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
           <h3 className="font-semibold text-lg">Recent History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {results.slice(0, 5).map((result) => (
            <div key={result.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${result.module === TestModule.READING ? 'bg-blue-500' : result.module === TestModule.WRITING ? 'bg-purple-500' : 'bg-orange-500'}`} />
                <div>
                  <p className="font-medium text-slate-900">{result.module} Test</p>
                  <p className="text-sm text-slate-500">{new Date(result.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-900">Band {result.score}</span>
                <Link to="/history" className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50">
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
          {results.length === 0 && (
             <div className="p-8 text-center text-slate-500">
               No tests taken yet. Upload a PDF or start a mock test!
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;