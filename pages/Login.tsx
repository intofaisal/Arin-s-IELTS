
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ShieldCheck, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let user = null;

      if (isAdminMode) {
        user = await AuthService.loginAsAdmin(username, password);
      } else {
        user = await AuthService.loginAsStudent(username, password);
      }

      if (user) {
        navigate('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (e) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsAdminMode(!isAdminMode);
    setError(null);
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-600 flex items-center justify-center gap-2 mb-2">
           <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-3xl">Arin's</span> IELTS
        </h1>
        <p className="text-slate-500">Your AI-Powered IELTS Preparation Companion</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-slate-100 relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isAdminMode ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
            {isAdminMode ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isAdminMode ? 'Admin Portal' : 'Student Login'}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isAdminMode 
              ? 'Enter your credentials to manage content.' 
              : 'Sign in to access mock tests and history.'}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">Username</label>
                  <div className="relative">
                      <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                          type="text" 
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 bg-slate-50 focus:bg-white transition-colors"
                          placeholder={isAdminMode ? "e.g. admin" : "e.g. arin"}
                      />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">Password</label>
                  <div className="relative">
                      <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                          type="password" 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 bg-slate-50 focus:bg-white transition-colors"
                          placeholder="••••••••"
                      />
                  </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md mt-6 ${isAdminMode ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isAdminMode ? 'Login as Admin' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-slate-500 hover:text-indigo-600 font-medium hover:underline transition-colors"
          >
            {isAdminMode ? '← Back to Student Login' : 'Go to Admin Portal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;