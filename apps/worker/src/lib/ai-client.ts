import OpenAI from "openai";

const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();

const config =
  provider === "openai"
    ? {
        apiKey:   process.env.OPENAI_API_KEY ?? "",
        baseURL:  "https://api.openai.com/v1",
        model:    "gpt-4o",
      }
    : {
        apiKey:   process.env.GEMINI_API_KEY ?? "",
        baseURL:  "https://generativelanguage.googleapis.com/v1beta/openai/",
        model:    "gemini-2.0-flash",
      };

export const ai          = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
export const AI_MODEL    = config.model;
export const AI_PROVIDER = provider;
