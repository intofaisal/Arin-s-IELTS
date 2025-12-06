
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PenTool, Mic, TrendingUp, Users, FileText, Trash2, Settings, Database, Save, CheckCircle, HelpCircle } from 'lucide-react';
import { StorageService } from '../services/storage';
import { AuthService } from '../services/auth';
import { TestResult, TestModule, QuestionBank, User, DBConfig } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Student Data
  const [results, setResults] = useState<TestResult[]>([]);
  
  // Admin Data
  const [usersCount, setUsersCount] = useState(0);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings Form
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    if (user) {
      if (user.role === 'student') {
        const userResults = await StorageService.getResultsForUser(user.id);
        setResults(userResults);
      } else {
        const users = await StorageService.getUsers();
        setUsersCount(users.length);
        const allBanks = await StorageService.getQuestionBanks();
        setBanks(allBanks);
        
        // Load existing config
        const config = StorageService.getDBConfig();
        if (config) {
            setDbUrl(config.url);
            setDbKey(config.key);
        }
      }
    }
    setLoading(false);
  };

  const handleDeleteTest = async (bankId: string, testId: string) => {
      if (window.confirm("Are you sure you want to delete this test?")) {
          await StorageService.deleteTest(bankId, testId);
          loadData(); // Refresh
      }
  };

  const handleSaveConfig = () => {
      let url = dbUrl.trim();
      const key = dbKey.trim();
      
      if (!url || !key) return;

      // Smart logic: If user pastes just the Reference ID (e.g., 'abcdefgh'), fix it.
      if (!url.startsWith('http') && !url.includes('.')) {
          url = `https://${url}.supabase.co`;
          setDbUrl(url); // Update UI
      }

      StorageService.saveDBConfig({ url, key });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
      loadData(); // Reload to try connection
  };

  const handleClearConfig = () => {
      if(window.confirm("Disconnect database? The app will revert to local storage.")) {
          StorageService.clearDBConfig();
          setDbUrl('');
          setDbKey('');
          loadData();
      }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  if (!currentUser) return null;

  // --- ADMIN DASHBOARD ---
  if (currentUser.role === 'admin') {
    return (
      <div className="space-y-8">
         <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
              <p className="text-slate-500 mt-1">Manage content and platform settings.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border ${showSettings ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    <Settings className="w-5 h-5" />
                    Settings
                </button>
                <Link to="/upload" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Upload New Test
                </Link>
            </div>
         </div>

         {/* SETTINGS PANEL */}
         {showSettings && (
             <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg animate-in slide-in-from-top-4">
                 <div className="flex items-center gap-2 mb-4">
                     <Database className="w-6 h-6 text-indigo-400" />
                     <h3 className="text-xl font-bold">Database Connection</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                         <div className="bg-slate-800 p-3 rounded-lg text-sm text-slate-300 flex gap-3">
                             <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                             <p>
                                 In your Supabase Dashboard, click the green <strong>"Connect"</strong> button (top right), 
                                 then select <strong>App Frameworks</strong> &rarr; <strong>React</strong> to find your URL and Key.
                             </p>
                         </div>

                         <div>
                             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project URL (or Reference ID)</label>
                             <input 
                                type="text" 
                                value={dbUrl}
                                onChange={(e) => setDbUrl(e.target.value)}
                                placeholder="https://xyz.supabase.co  OR  just 'xyz'"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">API Key (anon / public)</label>
                             <input 
                                type="password" 
                                value={dbKey}
                                onChange={(e) => setDbKey(e.target.value)}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                         </div>
                         <div className="flex items-center gap-3 pt-2">
                             <button 
                                onClick={handleSaveConfig}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                             >
                                 <Save className="w-4 h-4" /> Save Connection
                             </button>
                             {configSaved && <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Saved</span>}
                             {dbUrl && (
                                 <button onClick={handleClearConfig} className="text-red-400 hover:text-red-300 text-sm underline ml-auto">Disconnect</button>
                             )}
                         </div>
                     </div>

                     <div className="bg-slate-800 p-4 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-700">
                         <div className="flex justify-between items-center mb-2">
                             <p className="text-indigo-400 font-bold uppercase">Required: Run this in SQL Editor</p>
                         </div>
                         <pre className="whitespace-pre-wrap text-slate-400">
{`-- Create Tables & Policies
create table if not exists banks (id text primary key, data jsonb, created_at timestamptz default now());
create table if not exists results (id text primary key, user_id text, data jsonb, created_at timestamptz default now());
create table if not exists users (id text primary key, data jsonb);

alter table banks enable row level security;
create policy "Public Access" on banks for all using (true);

alter table results enable row level security;
create policy "Public Access" on results for all using (true);

alter table users enable row level security;
create policy "Public Access" on users for all using (true);`}
                         </pre>
                     </div>
                 </div>
             </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Users</p>
                        <h3 className="text-3xl font-bold text-slate-900">{usersCount}</h3>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Banks</p>
                        <h3 className="text-3xl font-bold text-slate-900">{banks.length}</h3>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Storage Mode</p>
                        <h3 className="text-xl font-bold text-slate-900 truncate">
                            {StorageService.getDBConfig() ? 'Live Cloud DB' : 'Local Storage'}
                        </h3>
                    </div>
                </div>
            </div>
         </div>

         <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
               <h3 className="font-semibold text-lg">Manage Tests</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {banks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No content uploaded yet.</div>
                ) : (
                    banks.map(bank => (
                        <div key={bank.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-slate-700">{bank.name}</h4>
                                <span className="text-xs text-slate-400">Uploaded: {new Date(bank.uploadedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="space-y-2">
                                {bank.tests.map(test => (
                                    <div key={test.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {test.reading && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Reading</span>}
                                            {test.writing && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">Writing</span>}
                                            {test.speaking && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded">Speaking</span>}
                                            <span className="font-medium text-slate-900">{test.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteTest(bank.id, test.id)}
                                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                            title="Delete Test"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
         </div>
      </div>
    );
  }

  // --- STUDENT DASHBOARD ---
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
          <h2 className="text-3xl font-bold text-slate-900">Welcome back, {currentUser.name}!</h2>
          <p className="text-slate-500 mt-1">Ready to practice today?</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-slate-500">Overall Estimated Band</p>
          <p className="text-3xl font-bold text-indigo-600">
            {results.length > 0 ? (results.reduce((a, b) => a + b.score, 0) / results.length).toFixed(1) : '-'}
          </p>
        </div>
      </div>

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
    </div>
  );
};

export default Dashboard;
