#!/usr/bin/env node
/**
 * Get TRADEOS_ACCESS_TOKEN via browser OAuth (PKCE + loopback callback).
 *
 * Usage:
 *   npx -y @tradeos/tradeos-mcp-test oauth
 *   npx -y -p @tradeos/tradeos-mcp-test tradeos-mcp-test-oauth
 *   pnpm run oauth:token
 *
 * Opens browser → log in on TradeOS → prints access_token for .env
 */
import { createHash, randomBytes } from "node:crypto";
import { exec } from "node:child_process";
import { createServer } from "node:http";
import { URL } from "node:url";
import {
  BRIDGE_CONFIG,
  OAUTH_CONFIG,
  TRADEOS_CONFIG,
} from "../build/constant.js";

function base64Url(buffer) {
  return buffer.toString("base64url");
}

function generateCodeVerifier() {
  return base64Url(randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "win32"
      ? `start "" "${url}"`
      : platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      console.error(
        `[fetch-token] Could not open browser automatically. Open:\n${url}\n`,
      );
    }
  });
}

function buildAuthorizeUrl(codeChallenge, state) {
  const url = new URL(
    `${TRADEOS_CONFIG.baseUrl}${TRADEOS_CONFIG.authorizePath}`,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", OAUTH_CONFIG.clientId);
  url.searchParams.set("redirect_uri", OAUTH_CONFIG.redirectUri);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCodeForToken(code, codeVerifier) {
  const res = await fetch(
    `${TRADEOS_CONFIG.baseUrl}${TRADEOS_CONFIG.tokenPath}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }),
    },
  );

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `mcp-token failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }

  if (!body.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

function waitForAuthorizationCode(codeVerifier) {
  return new Promise((resolve, reject) => {
    const expectedState = base64Url(randomBytes(16));
    const authorizeUrl = buildAuthorizeUrl(
      generateCodeChallenge(codeVerifier),
      expectedState,
    );

    const server = createServer((req, res) => {
      try {
        const incoming = new URL(
          req.url ?? "/",
          `http://127.0.0.1:${OAUTH_CONFIG.port}`,
        );
        if (incoming.pathname !== OAUTH_CONFIG.callbackPath) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }

        const error = incoming.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h1>OAuth error</h1><pre>${error}</pre>`);
          reject(new Error(`OAuth error: ${error}`));
          server.close();
          return;
        }

        const state = incoming.searchParams.get("state");
        if (state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>Invalid state</h1>");
          reject(new Error("OAuth state mismatch"));
          server.close();
          return;
        }

        const code = incoming.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>Missing code</h1>");
          reject(new Error("Missing authorization code in callback"));
          server.close();
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>TradeOS MCP</h1><p>Login OK. Return to the terminal for your access_token.</p><script>setTimeout(()=>window.close(),1500)</script>",
        );
        resolve(code);
        server.close();
      } catch (e) {
        reject(e);
        server.close();
      }
    });

    server.listen(OAUTH_CONFIG.port, "127.0.0.1", () => {
      console.error(
        `[fetch-token] Waiting for callback on ${OAUTH_CONFIG.redirectUri}`,
      );
      console.error(`[fetch-token] Opening browser…\n`);
      console.error(`If it does not open, visit:\n${authorizeUrl}\n`);
      openBrowser(authorizeUrl);
    });

    server.on("error", reject);
  });
}

async function main() {
  console.error(`[fetch-token] TradeOS: ${TRADEOS_CONFIG.baseUrl}`);
  console.error(`[fetch-token] redirect_uri: ${OAUTH_CONFIG.redirectUri}`);
  console.error(
    "[fetch-token] Log in with your TradeOS account when the browser opens.\n",
  );

  const codeVerifier = generateCodeVerifier();
  const code = await waitForAuthorizationCode(codeVerifier);
  const accessToken = await exchangeCodeForToken(code, codeVerifier);

  console.error("\n[fetch-token] Success. Put this in .env:\n");
  console.log(`${BRIDGE_CONFIG.accessTokenEnv}=${accessToken}`);
  console.error(
    "\n[fetch-token] Token is a JWT (starts with eyJ…). Do not commit it to git.\n",
  );
}

main().catch((e) => {
  console.error(`[fetch-token] ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
