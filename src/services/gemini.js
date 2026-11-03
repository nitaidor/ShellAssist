export const MODEL = "gemini-3.8-flash";
export const GEMINI_MODEL = MODEL;
export const OPENAI_MODEL = "gpt-4o-mini";
export const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

export const getApiUrl = (apiKeyOverride = '') => {
  const key = apiKeyOverride || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_GEMINI_KEY') : '') || '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
};

const cleanJsonResponse = (rawText) => {
  let cleaned = (rawText || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  return JSON.parse(cleaned.trim());
};

// ----------------- VALIDATION HELPERS -----------------
export const validateGeminiKey = async (apiKey) => {
  if (!apiKey || !apiKey.trim()) return false;
  const key = apiKey.trim();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    if (res.ok) return true;

    const resModel = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}?key=${encodeURIComponent(key)}`);
    if (resModel.ok) return true;

    const resPing = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
    });
    if (resPing.ok) return true;

    return false;
  } catch {
    return false;
  }
};

export const validateOpenaiKey = async (apiKey) => {
  if (!apiKey || !apiKey.trim()) return false;
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey.trim()}` }
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const validateClaudeKey = async (apiKey) => {
  if (!apiKey || !apiKey.trim()) return false;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }]
      })
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const validateOllamaEndpoint = async (endpoint) => {
  if (!endpoint || !endpoint.trim()) return false;
  try {
    const cleanUrl = endpoint.trim().replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
};

// ----------------- UNIVERSAL REQUEST DISPATCHER -----------------
const callAiProvider = async (systemPrompt, userMessages, settings) => {
  const provider = settings?.apiProvider || 'gemini';

  // 1. GEMINI
  if (provider === 'gemini') {
    const key = (
      settings?.apiKey ||
      settings?.geminiApiKey ||
      (typeof window !== 'undefined' ? localStorage.getItem('BYOK_GEMINI_KEY') : '') ||
      ''
    ).trim();

    if (!key) throw new Error("Failed connection (no API key). Please add your API key in Settings.");

    const contents = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    const modelsToTry = ["gemini-3.8-flash", "gemini-3-flash-preview"];
    let lastErrorMsg = "";

    for (const modelCode of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCode}:generateContent?key=${encodeURIComponent(key)}`;
      
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 8192
            }
          })
        });
      } catch {
        continue;
      }

      const data = await res.json();

      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      const msg = data.error?.message || "";
      lastErrorMsg = msg || res.statusText;

      if (res.status === 400 && (msg.toLowerCase().includes("key") || msg.toLowerCase().includes("invalid"))) {
        throw new Error("Failed connection (wrong API key). Please verify your API key in Settings.");
      }
    }

    throw new Error(`Failed connection (${lastErrorMsg || "Model request error"})`);
  }

  // 2. OPENAI (CHATGPT)
  if (provider === 'openai') {
    const key = (settings?.openaiApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_OPENAI_KEY') : '') || '').trim();
    if (!key) throw new Error("Failed connection (no API key). Please add your API key in Settings.");

    const messages = [
      { role: "system", content: systemPrompt },
      ...userMessages.map(m => ({ role: m.role, content: m.text }))
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: settings?.openaiModel || OPENAI_MODEL,
        messages,
        response_format: { type: "json_object" }
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      if (res.status === 401 || (data.error?.message || "").toLowerCase().includes("key")) {
        throw new Error("Failed connection (wrong API key). Please verify your API key in Settings.");
      }
      throw new Error(`Failed connection (${data.error?.message || res.statusText})`);
    }
    return data.choices?.[0]?.message?.content || "";
  }

  // 3. ANTHROPIC (CLAUDE)
  if (provider === 'claude') {
    const key = (settings?.claudeApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_CLAUDE_KEY') : '') || '').trim();
    if (!key) throw new Error("Failed connection (no API key). Please add your API key in Settings.");

    const messages = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: settings?.claudeModel || CLAUDE_MODEL,
        max_tokens: 8192,
        system: systemPrompt + "\nIMPORTANT: Output STRICTLY valid JSON with no markdown wrapping.",
        messages
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      if (res.status === 401 || (data.error?.message || "").toLowerCase().includes("key")) {
        throw new Error("Failed connection (wrong API key). Please verify your API key in Settings.");
      }
      throw new Error(`Failed connection (${data.error?.message || res.statusText})`);
    }
    return data.content?.[0]?.text || "";
  }

  // 4. OLLAMA (LOCAL AI)
  if (provider === 'ollama') {
    const hasSavedConfig = Array.isArray(settings?.savedLocalConfigs) && settings.savedLocalConfigs.length > 0;
    const cleanUrl = (settings?.localEndpoint || "").trim().replace(/\/+$/, '');
    const activeModel = (settings?.localModel || "").trim();

    if (!hasSavedConfig || !cleanUrl || !activeModel) {
      throw new Error("Failed connection (no API key). Please add your API key in Settings.");
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...userMessages.map(m => ({ role: m.role, content: m.text }))
    ];

    let res;
    try {
      res = await fetch(`${cleanUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          messages,
          stream: false,
          format: "json"
        })
      });
    } catch {
      throw new Error("Failed connection: Local AI is offline or unreachable.");
    }

    const data = await res.json();
    if (!res.ok) throw new Error("Failed connection: Local AI returned an error.");
    return data.message?.content || "";
  }

  throw new Error("Unknown AI provider selected.");
};

// ----------------- APP INTERFACE FUNCTIONS -----------------
export const fetchCommandGeneration = async (requestText, previousTurns = [], ctx, mode = 'en-to-code', isInteractiveSession = false, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();
  const isScript = ctx?.type === 'Script';

  const typeRule = isScript
    ? `STRUCTURAL FORMAT (MANDATORY): The user selected "Script". You MUST generate standard, readable, multi-line indented code with newlines and proper spacing. Do NOT compress the code into a single line or chain it with semicolons.`
    : `STRUCTURAL FORMAT (MANDATORY): The user selected "Command". You MUST provide a SINGLE-LINE command string suitable for immediate terminal execution (using pipes '|', operators '&&' or ';', or inline loops). Do NOT use multi-line line breaks in the command string.`;

  const tokenRule = `TOKENIZATION RULE (CRITICAL): The "tokens" array must break "command" down into GRANULAR, ATOMIC tokens in sequential order from start to finish: (1) individual cmdlets/commands (e.g. "Get-VM"), (2) individual flags/parameters (e.g. "-ComputerName"), (3) individual variables (e.g. "$Server"), (4) individual keywords (e.g. "if", "foreach"), (5) individual operators/delimiters (e.g. "=", "|", ";", "{"), (6) string/number literals, and (7) entire comments (e.g. "# This is a comment"). Treat an entire comment block as a single token. NEVER group a multi-token block, loop body, or pipeline into one giant token, and NEVER use "..." placeholders.`;
  const nonInteractiveRule = `IMPORTANT: Because commands execute in a non-interactive background bridge that cannot accept mid-execution stdin keystrokes (like [Y/N] prompts), ALWAYS append non-interactive confirmation flags where applicable (e.g., -Confirm:$false, -Force, -y, --yes, --no-input, /y) so the command never hangs waiting for user confirmation.`;
  const elevationRule = `Set "requiresElevation" to true if executing this command on ${cleanOs} typically requires Administrator / root / elevated privileges (e.g., managing Hyper-V VMs like Start-VM/Stop-VM/Get-VM, modifying system services, firewall rules, network adapters, disk partitions, system registry, or sudo operations), otherwise false.`;

  const systemPrompt = `You are an expert ${cleanShell} assistant on ${cleanOs}. ${typeRule} ${tokenRule} ${nonInteractiveRule} ${elevationRule} Return STRICTLY a JSON object matching this schema: { "summary": "...", "overallExplanation": "...", "command": "...", "tokens": [ { "text": "...", "explanation": "...", "context": "..." } ], "hasAlternative": false, "alternativeText": "", "riskLevel": "Low", "riskExplanation": "", "requiresElevation": false }`;

  const userMessages = [];
  previousTurns.forEach(t => {
    userMessages.push({ role: "user", text: t.prompt });
    userMessages.push({ role: "assistant", text: t.command });
  });
  userMessages.push({ role: "user", text: requestText });

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  return cleanJsonResponse(raw);
};

// Dedicated deep analysis pass to annotate large scripts into granular atomic tokens without truncating
export const fetchDeepTokenBreakdown = async (command, ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const systemPrompt = `You are a code lexer and documentation expert for ${cleanShell} on ${cleanOs}. 
Analyze the provided code and return an exhaustive, granular, atomic token breakdown covering 100% of the code from start to finish.
CRITICAL RULES:
1. Every token MUST be a single atomic element in sequential order: an individual command/cmdlet, an individual parameter/flag, an individual variable, an individual keyword (if, else, switch, foreach, param, return, continue), an individual operator (=, -eq, |, ;, {, }), a single string/number literal, or an entire comment block (e.g. "# comment text"). Treat an entire comment as a single token.
2. NEVER group a multi-line block, loop body, switch body, or full statement into a single token, and NEVER use "..." placeholders.
Return STRICTLY a JSON object matching this schema:
{
  "tokens": [
    { "text": "...", "explanation": "Detailed explanation of what this specific token does.", "context": "Command | Parameter | Variable | Keyword | String | Operator | Comment | Syntax" }
  ]
}`;

  const userMessages = [{ role: "user", text: `Provide an exhaustive atomic token breakdown for this entire code block:\n\n${command}` }];
  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  const parsed = cleanJsonResponse(raw);
  return Array.isArray(parsed?.tokens) ? parsed.tokens : [];
};

export const fetchInteractiveAutoDebug = async (prompt, failedCommand, fullTerminalTranscript, ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const systemPrompt = `You are an automated ${cleanShell} debugger on ${cleanOs}. Always append non-interactive confirmation flags where applicable (e.g., -Confirm:$false, -Force, -y, --no-input) so the fix command never hangs waiting for [Y/N] user input. Return STRICTLY a JSON object: { "explanation": "...", "fixCommand": "..." }`;
  const userMessages = [{ role: "user", text: `User Objective: "${prompt}"\nFailed Command: "${failedCommand}"\nOutput:\n${fullTerminalTranscript}` }];

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  return cleanJsonResponse(raw);
};

// Universal Terminal Simulation Engine: Runs through whichever AI provider you selected (Gemini, ChatGPT, Claude, or Ollama)
export const fetchCommandSimulation = async (command, ctx, sessionTranscript = "", settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();
  const isElevated = Boolean(ctx?.isElevated);

  const systemPrompt = `You are a realistic terminal execution engine simulating ${cleanShell} on ${cleanOs} (Elevated/Admin Privileges: ${isElevated ? 'Yes' : 'No'}). 
CRITICAL PERMISSIONS RULE: If Elevated/Admin Privileges is 'No', and the executed command requires administrator, root, or elevated privileges (e.g., Get-VM, Start-VM, Stop-VM, New-VM, Set-VM, Restart-Service, Stop-Service, Start-Service, Set-Service, diskpart, netsh, sfc, bcdedit, iptables, ufw, apt install, sudo, etc.), you MUST simulate a realistic permission error (e.g., Access Denied, Operation requires elevation, or Hyper-V permission failure) with "status": "error" and non-zero exit code.
If valid and permitted, simulate a realistic execution output (stdout/stderr). If it queries or lists items (e.g., network adapters, VMs, processes, files), format a realistic tabular or structured console response.
If the command contains syntax errors, references invalid flags, or targets non-existent resources without creation parameters, simulate the realistic console error message with exit code 1 and "status": "error".
Return STRICTLY a JSON object matching this schema:
{
  "status": "success" or "error",
  "summaryMessage": "A concise summary of execution.",
  "terminalOutput": "The exact realistic raw terminal output text."
}`;

  const userMessages = [{
    role: "user",
    text: `Terminal Environment: OS=${cleanOs}, Shell=${cleanShell}, Elevated=${isElevated ? 'Yes' : 'No'}.\nPrevious Session Transcript:\n${sessionTranscript || '(New session)'}\n\nCommand executed:\n${command}`
  }];

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  return cleanJsonResponse(raw);
};

export const fetchCommandDebug = async (prompt, command, debugThread = [], currentInput, ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'shell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const systemPrompt = `You are an expert ${cleanShell} debugger on ${cleanOs}. The user originally requested this objective: "${prompt}". The generated command/script they are trying to debug is: "${command}". Always include non-interactive flags where applicable (e.g. -Confirm:$false, -Force, -y). Wrap any suggested code fixes or commands in standard markdown code blocks (\`\`\`).`;
  const userMessages = [
    ...debugThread.map(msg => ({ role: msg.role === 'model' ? 'assistant' : msg.role, text: msg.text })),
    { role: "user", text: currentInput }
  ];

  return await callAiProvider(systemPrompt, userMessages, settings);
};

export const fetchStandaloneDebug = async (messages = [], ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'shell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const systemPrompt = `You are an expert ${cleanShell} debugger on ${cleanOs}. The user is working with a ${ctx?.type || 'Command'}. Always provide a suggested fix or corrected ${(ctx?.type || 'command').toLowerCase()} with non-interactive flags where applicable (e.g. -Confirm:$false, -Force, -y) and wrap any suggested code fixes, commands, or scripts inside standard markdown code blocks (\`\`\`). Return STRICTLY JSON: {"summary": "A brief summary", "analysis": "Your detailed explanation and fixes."}`;
  const userMessages = messages.map(msg => ({ role: msg.role === 'model' ? 'assistant' : msg.role, text: msg.text }));

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  try {
    const parsed = cleanJsonResponse(raw);
    return { summary: parsed.summary || "Debug Session", analysis: parsed.analysis || "" };
  } catch {
    return { summary: "Debug Session", analysis: raw };
  }
};