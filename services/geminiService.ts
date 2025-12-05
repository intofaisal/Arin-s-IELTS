import { GoogleGenAI, Type } from "@google/genai";
import { PracticeTest, WritingFeedback } from "../types";

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
  // Extract Multiple Practice Tests (Reading & Writing) from PDF
  extractTestContent: async (file: File): Promise<{ tests: PracticeTest[] }> => {
    const ai = getAI();
    const model = "gemini-2.5-flash";
    const filePart = await fileToGenerativePart(file);

    const prompt = `
      Analyze this IELTS practice test PDF. It likely contains multiple Practice Tests (e.g., Test 1, Test 2, Test 3, Test 4).
      
      Your goal is to extract EACH Practice Test separately.
      
      For EACH Test found in the PDF:
      
      1. **Identify the Test Name** (e.g., "Test 1", "Practice Test 2").
      
      2. **Extract the Reading Module**:
         - A standard IELTS Reading module has EXACTLY 3 Sections (Passages).
         - Extract all 3 passages.
         - For each passage:
            - Title
            - Content (Format as HTML: use <p>, <h3>, <ul>. Do NOT use Markdown).
            - Questions (Extract all questions for this passage).
            - For each question:
                - ID (number)
                - Text
                - Type (multiple_choice, true_false_not_given, fill_gap, matching_headings)
                - Options (if any)
                - Correct Answer (Infer it or find in answer key)
                - Evidence (Short quote)
                - Group Instruction (e.g. "Questions 1-5")
      
      3. **Extract the Writing Module**:
         - Task 1 Prompt
         - Task 2 Prompt
      
      If the PDF is huge, try to extract at least the first 2 full tests found.
    `;

    // Define strict schema for output
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
                nullable: true,
                properties: {
                  passages: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING, description: "Full passage text in HTML format (<p>, <ul>, etc.)" },
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
                              evidence: { type: Type.STRING, description: "Exact quote from text proving the answer" },
                              groupInstruction: { type: Type.STRING, nullable: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              writing: {
                type: Type.OBJECT,
                nullable: true,
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

    try {
      const result = await ai.models.generateContent({
        model,
        contents: {
          parts: [filePart, { text: prompt }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster extraction
        }
      });

      if (!result.text) throw new Error("No data returned from AI");
      const parsed = JSON.parse(result.text);
      
      // Assign IDs if missing
      parsed.tests.forEach((t: any) => {
        if (!t.id) t.id = crypto.randomUUID();
      });

      return parsed;
    } catch (error) {
      console.error("Error extracting PDF content:", error);
      throw error;
    }
  },

  // Grade Writing Task 2
  gradeWriting: async (essay: string, prompt: string): Promise<WritingFeedback> => {
    const ai = getAI();
    const model = "gemini-2.5-flash";

    const systemInstruction = `You are a strict IELTS Writing Examiner. Grade the following Task 2 essay based on the official 4 criteria: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.`;

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
        feedback: { type: Type.STRING, description: "Detailed feedback explaining the score." },
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
        responseSchema: responseSchema,
        temperature: 0.3
      }
    });

    return JSON.parse(result.text || "{}");
  },

  // Generate Speaking Response (Chat)
  getSpeakingResponse: async (history: { role: string, parts: [{ text: string }] }[], lastUserMessage: string): Promise<string> => {
    const ai = getAI();
    // Using gemini-2.5-flash for speed in chat
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: "You are an IELTS Speaking Examiner. Conduct a mock test. Start with Part 1 (Introduction), move to Part 2 (Cue Card), then Part 3 (Discussion). Be professional, polite, but strictly adhere to the role. Do not break character. Keep responses brief like a real examiner.",
        temperature: 0.7
      },
      history: history
    });

    const result = await chat.sendMessage({ message: lastUserMessage });
    return result.text || "";
  }
};