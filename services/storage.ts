import { TestResult, QuestionBank } from '../types';

const KEYS = {
  RESULTS: 'ielts_results',
  QUESTION_BANKS: 'ielts_question_banks_v2', // Changed version to support new schema
  USER_NAME: 'ielts_user_name'
};

export const StorageService = {
  getResults: (): TestResult[] => {
    const data = localStorage.getItem(KEYS.RESULTS);
    return data ? JSON.parse(data) : [];
  },

  saveResult: (result: TestResult) => {
    const current = StorageService.getResults();
    localStorage.setItem(KEYS.RESULTS, JSON.stringify([result, ...current]));
  },

  getQuestionBanks: (): QuestionBank[] => {
    const data = localStorage.getItem(KEYS.QUESTION_BANKS);
    return data ? JSON.parse(data) : [];
  },

  saveQuestionBank: (bank: QuestionBank) => {
    const current = StorageService.getQuestionBanks();
    localStorage.setItem(KEYS.QUESTION_BANKS, JSON.stringify([bank, ...current]));
  },

  getUserName: (): string => {
    return localStorage.getItem(KEYS.USER_NAME) || 'Student';
  },

  setUserName: (name: string) => {
    localStorage.setItem(KEYS.USER_NAME, name);
  }
};