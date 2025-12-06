
import { TestResult, QuestionBank, User, PracticeTest, TestModule, DBConfig } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const KEYS = {
  RESULTS: 'ielts_results_v2',
  QUESTION_BANKS: 'ielts_question_banks_v2',
  USERS: 'ielts_users',
  CURRENT_USER: 'ielts_current_session',
  DB_CONFIG: 'ielts_db_config'
};

let supabase: SupabaseClient | null = null;

// Helper to fix URLs if user pastes just the ID
const normalizeUrl = (input: string): string => {
    if (!input) return '';
    if (input.startsWith('http')) return input;
    // Assume it's a project ref id
    return `https://${input}.supabase.co`;
};

// Initialize Supabase if config exists
const initSupabase = () => {
    const configStr = localStorage.getItem(KEYS.DB_CONFIG);
    if (configStr) {
        try {
            const config: DBConfig = JSON.parse(configStr);
            if (config.url && config.key) {
                const finalUrl = normalizeUrl(config.url);
                supabase = createClient(finalUrl, config.key);
            }
        } catch (e) {
            console.error("Failed to init supabase", e);
        }
    }
};

initSupabase();

export const StorageService = {
  // --- Configuration ---
  saveDBConfig: (config: DBConfig) => {
      const finalConfig = { ...config, url: normalizeUrl(config.url) };
      localStorage.setItem(KEYS.DB_CONFIG, JSON.stringify(finalConfig));
      initSupabase();
  },

  getDBConfig: (): DBConfig | null => {
      const s = localStorage.getItem(KEYS.DB_CONFIG);
      return s ? JSON.parse(s) : null;
  },

  clearDBConfig: () => {
      localStorage.removeItem(KEYS.DB_CONFIG);
      supabase = null;
  },

  // --- User Management ---
  getUsers: async (): Promise<User[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) return data.map(d => d.data);
    }
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUser: async (user: User) => {
    if (supabase) {
        await supabase.from('users').upsert({ id: user.id, data: user });
    }
    // Always save to local for session fallback
    const localUsers = localStorage.getItem(KEYS.USERS) ? JSON.parse(localStorage.getItem(KEYS.USERS)!) : [];
    if (!localUsers.find((u: User) => u.id === user.id)) {
        localStorage.setItem(KEYS.USERS, JSON.stringify([...localUsers, user]));
    }
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  // --- Results ---
  getAllResults: async (): Promise<TestResult[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('results').select('*').order('created_at', { ascending: false });
        if (!error && data) return data.map(d => d.data);
    }
    const data = localStorage.getItem(KEYS.RESULTS);
    return data ? JSON.parse(data) : [];
  },

  getResultsForUser: async (userId: string): Promise<TestResult[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('results').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!error && data) return data.map(d => d.data);
    }
    const all = localStorage.getItem(KEYS.RESULTS);
    const parsed: TestResult[] = all ? JSON.parse(all) : [];
    return parsed.filter(r => r.userId === userId);
  },

  saveResult: async (result: TestResult) => {
    if (supabase) {
        await supabase.from('results').insert({ 
            id: result.id, 
            user_id: result.userId, 
            data: result,
            created_at: new Date().toISOString()
        });
    } else {
        const current = localStorage.getItem(KEYS.RESULTS);
        const parsed = current ? JSON.parse(current) : [];
        localStorage.setItem(KEYS.RESULTS, JSON.stringify([result, ...parsed]));
    }
  },

  // --- Question Banks (Global) ---
  getQuestionBanks: async (): Promise<QuestionBank[]> => {
    if (supabase) {
        const { data, error } = await supabase.from('banks').select('*').order('created_at', { ascending: false });
        if (!error && data) return data.map(d => d.data);
    }
    const data = localStorage.getItem(KEYS.QUESTION_BANKS);
    return data ? JSON.parse(data) : [];
  },

  saveQuestionBank: async (bank: QuestionBank) => {
    if (supabase) {
        await supabase.from('banks').insert({
            id: bank.id,
            data: bank,
            created_at: new Date().toISOString()
        });
    } else {
        const current = localStorage.getItem(KEYS.QUESTION_BANKS);
        const parsed = current ? JSON.parse(current) : [];
        localStorage.setItem(KEYS.QUESTION_BANKS, JSON.stringify([bank, ...parsed]));
    }
  },

  deleteTest: async (bankId: string, testId: string) => {
    if (supabase) {
        const { data } = await supabase.from('banks').select('*').eq('id', bankId).single();
        if (data) {
            const bank: QuestionBank = data.data;
            bank.tests = bank.tests.filter(t => t.id !== testId);
            if (bank.tests.length === 0) {
                await supabase.from('banks').delete().eq('id', bankId);
            } else {
                await supabase.from('banks').update({ data: bank }).eq('id', bankId);
            }
        }
    } else {
        const banks = localStorage.getItem(KEYS.QUESTION_BANKS);
        let parsed: QuestionBank[] = banks ? JSON.parse(banks) : [];
        parsed = parsed.map(bank => {
            if (bank.id === bankId) {
                return {
                    ...bank,
                    tests: bank.tests.filter(t => t.id !== testId)
                };
            }
            return bank;
        }).filter(bank => bank.tests.length > 0);
        localStorage.setItem(KEYS.QUESTION_BANKS, JSON.stringify(parsed));
    }
  },

  getAllTestsByModule: async (module: TestModule): Promise<{ bankId: string, bankName: string, test: PracticeTest }[]> => {
      const banks = await StorageService.getQuestionBanks();
      const tests = [];
      for (const bank of banks) {
          if (!bank.tests) continue;
          for (const test of bank.tests) {
              if (module === TestModule.READING && test.reading) {
                  tests.push({ bankId: bank.id, bankName: bank.name, test });
              } else if (module === TestModule.WRITING && test.writing) {
                   tests.push({ bankId: bank.id, bankName: bank.name, test });
              } else if (module === TestModule.SPEAKING && test.speaking) {
                   tests.push({ bankId: bank.id, bankName: bank.name, test });
              }
          }
      }
      return tests;
  }
};
