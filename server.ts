import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server initialization...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Disable ETags to prevent 304 responses for mock data
  app.set('etag', false);

  // Add middleware to disable caching for all API routes
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });
  
  // Health check route
  app.get("/api/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mock Data
  const mockConversations = [
    {
      id: "1",
      title: "2026 年度核心战略",
      agent_type: "strategy",
      agents_config: ["config1"],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z"
    },
    {
      id: "2",
      title: "核心竞争力分析报告",
      agent_type: "analysis",
      agents_config: ["config2"],
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z"
    }
  ];

  const mockMessages: Record<string, any[]> = {
    "1": [
      {
        id: "m1",
        conversation_id: "1",
        role: "user",
        content: "2026 年度核心战略是什么？",
        message_type: "text",
        metadata: null,
        created_at: "2026-01-01T00:00:00Z"
      },
      {
        id: "m2",
        conversation_id: "1",
        role: "assistant",
        content: "2026 年度的核心战略是数字化转型与全球化扩张。",
        message_type: "answer",
        metadata: null,
        created_at: "2026-01-01T00:01:00Z"
      }
    ],
    "2": [
      {
        id: "m3",
        conversation_id: "2",
        role: "user",
        content: "我们的核心竞争力是什么？",
        message_type: "text",
        metadata: null,
        created_at: "2026-01-02T00:00:00Z"
      },
      {
        id: "m4",
        conversation_id: "2",
        role: "assistant",
        content: "我们的核心竞争力在于拥有自主研发的 AI 算法和庞大的行业数据库。",
        message_type: "answer",
        metadata: null,
        created_at: "2026-01-02T00:01:00Z"
      }
    ]
  };

  // Auth Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] === "") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // API Routes
  app.get("/console/api/manus/conversations", authMiddleware, (req, res) => {
    res.json({
      total: mockConversations.length,
      page: 1,
      per_page: 20,
      items: mockConversations
    });
  });

  app.get("/console/api/manus/conversations/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const conversation = mockConversations.find(c => c.id === id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({
      ...conversation,
      messages: mockMessages[id as string] || []
    });
  });

  app.delete("/console/api/manus/conversations/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const index = mockConversations.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    // Remove from mock data
    mockConversations.splice(index, 1);
    if (id) {
      delete mockMessages[id as string];
    }

    res.json({
      total: mockConversations.length,
      page: 1,
      per_page: 20,
      items: mockConversations
    });
  });

  // Mock Rename Conversation
  app.patch("/console/api/manus/conversations/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    const conversation = mockConversations.find(c => c.id === id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (title) {
      conversation.title = title;
    }
    res.json(conversation);
  });

  // Mock Model Types
  app.get("/console/api/workspaces/current/models/model-types/llm", authMiddleware, (req, res) => {
    res.json({
      data: [
        {
          provider: "openai",
          label: { zh_Hans: "OpenAI" },
          icon_small: { zh_Hans: "https://api.dicebear.com/7.x/bottts/svg?seed=openai" },
          models: [
            { model: "gpt-4o", name: "GPT-4o" },
            { model: "gpt-4-turbo", name: "GPT-4 Turbo" }
          ]
        },
        {
          provider: "anthropic",
          label: { zh_Hans: "Anthropic" },
          icon_small: { zh_Hans: "https://api.dicebear.com/7.x/bottts/svg?seed=anthropic" },
          models: [
            { model: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
            { model: "claude-3-opus", name: "Claude 3 Opus" }
          ]
        }
      ]
    });
  });

  // Mock Apps Usage
  app.get("/console/api/explore/appsUsage", authMiddleware, (req, res) => {
    res.json({
      data: [
        {
          app: {
            id: "app1",
            name: "代码助手",
            description: "智能代码编写与重构",
            icon: "Code",
            color: "bg-blue-50 text-blue-600"
          }
        },
        {
          app: {
            id: "app2",
            name: "翻译专家",
            description: "多语言实时翻译",
            icon: "Globe",
            color: "bg-green-50 text-green-600"
          }
        }
      ]
    });
  });

  // Mock Run (Streaming)
  const handleStreamingResponse = (res: express.Response, prompt: string) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        sendEvent('thought', { content: "正在分析您的问题..." });
      } else if (step === 2) {
        sendEvent('tool_call', { tool_name: "Google Search", arguments: { query: prompt } });
      } else if (step === 3) {
        sendEvent('tool_result', { result: "搜索结果显示相关信息..." });
      } else if (step === 4) {
        sendEvent('thought', { content: "基于搜索结果，我为您整理了以下回答：" });
      } else if (step <= 10) {
        sendEvent('delta', { content: `这是关于 "${prompt}" 的第 ${step - 4} 部分回答内容。\n` });
      } else {
        sendEvent('final', { content: "" });
        res.write('data: [DONE]\n\n');
        clearInterval(interval);
        res.end();
      }
    }, 500);

    res.on('close', () => {
      clearInterval(interval);
    });
  };

  app.post("/console/api/manus/run", authMiddleware, (req, res) => {
    const { prompt } = req.body;
    handleStreamingResponse(res, prompt);
  });

  app.post("/console/api/manus/run_flow", authMiddleware, (req, res) => {
    const { prompt } = req.body;
    handleStreamingResponse(res, prompt);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
