
import { User } from '../types';
import { StorageService } from './storage';

export const AuthService = {
  // Validate Student Credentials
  loginAsStudent: async (username: string, password: string): Promise<User | null> => {
    // Hardcoded for demo/fallback, but ideally checks DB
    if (username === 'arin' && password === 'arin123') {
      const studentUser: User = {
        id: 'student_arin',
        name: 'Arin',
        email: 'arin@arinsielts.com',
        role: 'student',
        avatar: 'https://ui-avatars.com/api/?name=Arin&background=random'
      };
      await StorageService.saveUser(studentUser);
      StorageService.setCurrentUser(studentUser);
      return studentUser;
    }
    return null;
  },

  // Validate Admin Credentials
  loginAsAdmin: async (username: string, password: string): Promise<User | null> => {
    if (username === 'admin' && password === 'admin123') {
      const adminUser: User = {
        id: 'admin_01',
        name: 'Administrator',
        email: 'admin@arinsielts.com',
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff'
      };
      await StorageService.saveUser(adminUser);
      StorageService.setCurrentUser(adminUser);
      return adminUser;
    }
    return null;
  },

  logout: () => {
    StorageService.setCurrentUser(null);
  },

  getCurrentUser: (): User | null => {
    return StorageService.getCurrentUser();
  },

  isAuthenticated: (): boolean => {
    return !!StorageService.getCurrentUser();
  },

  isAdmin: (): boolean => {
    const user = StorageService.getCurrentUser();
    return user?.role === 'admin';
  }
};