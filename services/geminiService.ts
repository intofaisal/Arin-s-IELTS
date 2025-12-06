
import { GoogleGenAI, Type } from "@google/genai";
import { PracticeTest, WritingFeedback, TestModule, SpeakingModule } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const GeminiService = {
  // --- READING EXTRACTION (STRICT) ---
  extractReadingTests: async (file: File): Promise<PracticeTest[]> => {
    const ai = getAI();
    const model = "gemini-2.5-flash";
    const filePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this IELTS PDF. Extract separate READING Practice Tests.
      
      STRICT RULES FOR VALIDITY:
      1. Each Reading Test MUST have exactly 3 Passages.
      2. Each Reading Test MUST have exactly 40 Questions total across the 3 passages.
      3. If a test has missing passages or fewer than 40 questions, DO NOT include it.
      
      Output Schema:
      List of tests found.
      For each passage, format content as clean HTML (paragraphs, lists).
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reading: {
                type: Type.OBJECT,
                properties: {
                  passages: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        questions: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.INTEGER },
                              text: { type: Type.STRING },
                              type: { type: Type.STRING, enum: ["multiple_choice", "true_false_not_given", "fill_gap", "matching_headings"] },
                              options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                              correctAnswer: { type: Type.STRING },
                              evidence: { type: Type.STRING },
                              groupInstruction: { type: Type.STRING, nullable: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    try {
      const result = await ai.models.generateContent({
        model,
        contents: { parts: [filePart, { text: prompt }] },
        config: { responseMimeType: "application/json", responseSchema, thinkingConfig: { thinkingBudget: 0 } }
      });

      if (!result.text) throw new Error("No data returned");
      const parsed = JSON.parse(result.text);
      
      // Strict Validation
      const validTests: PracticeTest[] = [];
      
      if (parsed.tests) {
          for (const t of parsed.tests) {
              if (t.reading && t.reading.passages && t.reading.passages.length === 3) {
                  const totalQuestions = t.reading.passages.reduce((acc: number, p: any) => acc + (p.questions?.length || 0), 0);
                  if (totalQuestions === 40) {
                      t.id = crypto.randomUUID();
                      validTests.push(t);
                  }
              }
          }
      }
      
      if (validTests.length === 0) throw new Error("No valid IELTS Reading Tests (3 Passages, 40 Questions) found in this file.");
      return validTests;

    } catch (error) {
      console.error("Reading Extraction Error:", error);
      throw error;
    }
  },

  // --- WRITING EXTRACTION ---
  extractWritingTests: async (file: File): Promise<PracticeTest[]> => {
    const ai = getAI();
    const model = "gemini-2.5-flash";
    const filePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this IELTS PDF. Extract separate WRITING Practice Tests.
      Each test must contain BOTH Task 1 and Task 2 prompts.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              writing: {
                type: Type.OBJECT,
                properties: {
                  task1Prompt: { type: Type.STRING },
                  task2Prompt: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    };

    const result = await ai.models.generateContent({
        model,
        contents: { parts: [filePart, { text: prompt }] },
        config: { responseMimeType: "application/json", responseSchema, thinkingConfig: { thinkingBudget: 0 } }
    });
    
    const parsed = JSON.parse(result.text || "{}");
    if (!parsed.tests || parsed.tests.length === 0) throw new Error("No Writing tests found.");

    parsed.tests.forEach((t: any) => t.id = crypto.randomUUID());
    return parsed.tests;
  },

  // --- SPEAKING EXTRACTION ---
  extractSpeakingTests: async (file: File): Promise<PracticeTest[]> => {
    const ai = getAI();
    const model = "gemini-2.5-flash";
    const filePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this IELTS PDF. Extract separate SPEAKING Practice Tests.
      For each test, extract:
      - Part 1 Topics/Questions
      - Part 2 Cue Card Topic
      - Part 3 Discussion Questions
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        tests: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              speaking: {
                type: Type.OBJECT,
                properties: {
                  part1Topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  part2CueCard: { type: Type.STRING },
                  part3Questions: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      }
    };

    const result = await ai.models.generateContent({
        model,
        contents: { parts: [filePart, { text: prompt }] },
        config: { responseMimeType: "application/json", responseSchema, thinkingConfig: { thinkingBudget: 0 } }
    });

    const parsed = JSON.parse(result.text || "{}");
    if (!parsed.tests || parsed.tests.length === 0) throw new Error("No Speaking tests found.");

    parsed.tests.forEach((t: any) => t.id = crypto.randomUUID());
    return parsed.tests;
  },

  // Grade Writing (Task 1 or 2)
  gradeWriting: async (essay: string, prompt: string, taskType: 'Task 1' | 'Task 2'): Promise<WritingFeedback> => {
    const ai = getAI();
    const model = "gemini-2.5-flash";

    const systemInstruction = `You are a strict IELTS Writing Examiner. Grade the following ${taskType} essay based on official criteria.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        overallBand: { type: Type.NUMBER },
        scores: {
          type: Type.OBJECT,
          properties: {
            taskResponse: { type: Type.NUMBER },
            coherenceCohesion: { type: Type.NUMBER },
            lexicalResource: { type: Type.NUMBER },
            grammaticalRange: { type: Type.NUMBER }
          }
        },
        feedback: { type: Type.STRING },
        improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    };

    const result = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: `Prompt: ${prompt}\n\nEssay:\n${essay}` }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.3
      }
    });

    return JSON.parse(result.text || "{}");
  },

  // Generate Speaking Response with Context
  getSpeakingResponse: async (history: { role: string, parts: [{ text: string }] }[], lastUserMessage: string, context?: SpeakingModule): Promise<string> => {
    const ai = getAI();
    
    let systemInstruction = "You are an IELTS Speaking Examiner. Conduct a mock test. Start with Part 1 (Introduction), move to Part 2 (Cue Card), then Part 3 (Discussion). Be professional, polite, but strictly adhere to the role. Do not break character. Keep responses brief like a real examiner.";
    
    if (context) {
        systemInstruction += `\n\nUSE THIS SPECIFIC TEST MATERIAL:\nPart 1 Topics: ${context.part1Topics.join(', ')}\nPart 2 Cue Card: ${context.part2CueCard}\nPart 3 Questions: ${context.part3Questions.join(', ')}`;
    }

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7
      },
      history: history
    });

    const result = await chat.sendMessage({ message: lastUserMessage });
    return result.text || "";
  }
};
