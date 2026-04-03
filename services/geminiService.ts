import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Role } from "../types";

// Initialize the client.
// Note: In a real production app, ensure API keys are handled securely.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Using gemini-3-flash-preview as recommended for basic text tasks and speed.
const MODEL_NAME = 'gemini-3-flash-preview';

export const streamChatResponse = async (
  message: string,
  history: { role: Role; parts: { text: string }[] }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: MODEL_NAME,
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
    });

    const result = await chat.sendMessageStream({ message });
    
    let fullText = '';
    
    for await (const chunk of result) {
      if (signal?.aborted) {
        break;
      }
      const c = chunk as GenerateContentResponse;
      const text = c.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    
    return fullText;

  } catch (error: any) {
    if (signal?.aborted) {
       console.log("Generation aborted by user");
       return "";
    }

    // Handle Region/Permission Errors gracefully for demo/delivery
    // 403 PERMISSION_DENIED or specific message
    if (error.status === 403 || (error.message && error.message.includes('Region not supported'))) {
      console.warn("Gemini API Region blocked. Switching to mock response.");
      
      const mockResponse = "检测到当前网络环境无法直接访问 Gemini API (区域限制)。\n\n**这是一个模拟回复**，旨在展示界面交互效果。\n\n言复智能助手可以帮助您：\n1. 📈 **智能分析**：解读复杂的销售报表与市场趋势\n2. 📝 **内容创作**：生成周报、润色邮件或编写代码\n3. ⚡ **效率工具**：快速检索知识库与企业数据\n\n(请在支持的地区或配置代理后连接真实模型)";
      
      // Simulate streaming effect
      const chars = mockResponse.split('');
      let currentText = '';
      
      for (let i = 0; i < chars.length; i++) {
        if (signal?.aborted) break;
        await new Promise(resolve => setTimeout(resolve, 20)); // Typing speed
        currentText += chars[i];
        onChunk(chars[i]);
      }
      return mockResponse;
    }

    console.error("Gemini API Error:", error);
    throw error;
  }
};