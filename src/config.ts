import { BRIDGE_CONFIG, TRADEOS_CONFIG } from "./constant.js";

export type TradeosMcpConfig = {
  accessToken: string;
  mcpCallUrl: string;
};

/** Load bridge config from environment (see `.example.env`). */
export function loadConfig(): TradeosMcpConfig {
  const { accessTokenEnv } = BRIDGE_CONFIG;
  const accessToken = process.env[accessTokenEnv]?.trim();
  if (!accessToken) {
    throw new Error(
      `${accessTokenEnv} is required (OAuth Bearer token for mcp-call)`,
    );
  }

  return {
    accessToken,
    mcpCallUrl: TRADEOS_CONFIG.mcpCallUrl,
  };
}
