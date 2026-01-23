import fs from "fs";
import path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const MAX_CHARS = 8000;

// === Создаём сервер ===
const server = new Server(
  { name: "safe-reader", version: "1.0.0" },
  { capabilities: { tools: {} } } // обязательный объект capabilities
);

const transport = new StdioServerTransport();
await server.connect(transport);

// === tools/list ===
server.setRequestHandler(
  {
    // старый рабочий метод SDK 0.6.0
    method: "tools/list"
  },
  async () => {
    return {
      tools: [
        {
          name: "safe_read",
          description: "Safely read a file without stopping the process",
          inputSchema: {
            type: "object",
            properties: {
              filePath: { type: "string" }
            },
            required: ["filePath"]
          }
        }
      ]
    };
  }
);

// === tools/call ===
server.setRequestHandler(
  { method: "tools/call" },
  async (request) => {
    // проверяем, что вызывается именно safe_read
    if (!request.params || request.params.name !== "safe_read") {
      return { content: [{ type: "text", text: "UNKNOWN_TOOL" }] };
    }

    const { filePath } = request.params.arguments || {};
    if (!filePath || typeof filePath !== "string") {
      return { content: [{ type: "text", text: "INVALID_INPUT" }] };
    }

    try {
      const resolvedPath = path.resolve(process.cwd(), filePath);

      if (!fs.existsSync(resolvedPath)) {
        return { content: [{ type: "text", text: "FILE_NOT_FOUND" }] };
      }

      const stat = fs.statSync(resolvedPath);
      if (!stat.isFile()) {
        return { content: [{ type: "text", text: "NOT_A_FILE" }] };
      }

      const data = fs.readFileSync(resolvedPath, "utf8");

      return { content: [{ type: "text", text: data.slice(0, MAX_CHARS) }] };
    } catch {
      return { content: [{ type: "text", text: "READ_ERROR" }] };
    }
  }
);
