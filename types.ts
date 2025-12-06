
export enum TestModule {
  READING = 'Reading',
  WRITING = 'Writing',
  SPEAKING = 'Speaking'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  avatar?: string;
}

export interface DBConfig {
  url: string;
  key: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  uploadedAt: string;
  tests: PracticeTest[];
}

export interface PracticeTest {
  id: string;
  name: string; // e.g. "Test 1"
  reading?: ReadingModule;
  writing?: WritingModule;
  speaking?: SpeakingModule;
}

export interface ReadingModule {
  passages: ReadingPassage[]; // Should contain exactly 3 passages
}

export interface ReadingPassage {
  title: string;
  content: string; // HTML format for easier highlighting
  questions: ReadingQuestion[];
}

export interface ReadingQuestion {
  id: number;
  text: string;
  type: 'multiple_choice' | 'true_false_not_given' | 'fill_gap' | 'matching_headings';
  options?: string[];
  correctAnswer?: string; // Optional if we want auto-grading
  evidence?: string; // The specific sentence/phrase in text that proves the answer
  groupInstruction?: string; // e.g. "Questions 1-5: Do the following statements agree..."
}

export interface WritingModule {
  task1Prompt: string;
  task2Prompt: string;
}

export interface SpeakingModule {
  part1Topics: string[];
  part2CueCard: string;
  part3Questions: string[];
}

// Alias for backwards compatibility if needed
export type WritingData = WritingModule;
export type ReadingData = ReadingModule;

export interface TestResult {
  id: string;
  userId: string; // Added to link result to specific user
  date: string;
  module: TestModule;
  score: number;
  details: any; // Flexible JSON for feedback
}

export interface WritingFeedback {
  overallBand: number;
  scores: {
    taskResponse: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
  };
  feedback: string;
  improvementTips: string[];
}

export interface SpeakingMessage {
  role: 'examiner' | 'candidate';
  text: string;
}