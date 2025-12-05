import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, PenTool, Mic, Upload, BarChart, User, Menu, X } from 'lucide-react';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', icon: BarChart, label: 'Dashboard' },
    { to: '/reading', icon: BookOpen, label: 'Reading' },
    { to: '/writing', icon: PenTool, label: 'Writing' },
    { to: '/speaking', icon: Mic, label: 'Speaking' },
    { to: '/upload', icon: Upload, label: 'Upload PDF' },
    { to: '/history', icon: User, label: 'My Account' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 z-30 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-lg">Arin's</span> IELTS
          </h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                 S
              </div>
              <div className="overflow-hidden">
                 <p className="text-sm font-medium text-slate-900 truncate">Student</p>
                 <p className="text-xs text-slate-500 truncate">Free Plan</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-10 shrink-0">
           <button 
             onClick={() => setIsMobileMenuOpen(true)} 
             className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg"
           >
             <Menu className="w-6 h-6" />
           </button>
           <span className="ml-3 font-semibold text-slate-900">Arin's IELTS</span>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
           {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;