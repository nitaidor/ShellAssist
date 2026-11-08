export const MODEL = "gemini-3-flash-preview";
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
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = firstBrace; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              try {
                return JSON.parse(cleaned.slice(firstBrace, i + 1));
              } catch {
                break;
              }
            }
          }
        }
      }
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace > firstBrace) {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      }
    }
    throw err;
  }
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

export const getOllamaActiveState = async (endpoint = 'http://localhost:11434') => {
  const cleanUrl = (endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${cleanUrl}/api/ps`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { serverRunning: false, runningModel: '' };
    const data = await res.json();
    const list = Array.isArray(data?.models) ? data.models : [];
    if (list.length > 0) {
      const first = list[0];
      const modelName = typeof first === 'string' ? first : (first?.name || first?.model || '');
      return { serverRunning: true, runningModel: modelName };
    }
    return { serverRunning: true, runningModel: '' };
  } catch {
    return { serverRunning: false, runningModel: '' };
  }
};

export const validateOllamaEndpoint = async (endpoint = 'http://localhost:11434') => {
  const state = await getOllamaActiveState(endpoint);
  return Boolean(state.serverRunning && state.runningModel);
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

    const modelsToTry = ["gemini-3-flash-preview", "gemini-2.5-flash"];
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
              maxOutputTokens: 32768
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
    const cleanUrl = (settings?.localEndpoint || "http://localhost:11434").trim().replace(/\/+$/, '');
    const state = await getOllamaActiveState(cleanUrl);

    if (!state.serverRunning || !state.runningModel) {
      throw new Error("Failed connection: Local AI is offline. Please start Ollama and a model in Settings.");
    }

    const activeModel = state.runningModel || (settings?.localModel || "").trim();

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
          think: false,
          format: "json",
          keep_alive: -1
        })
      });
      if (!res.ok) {
        res = await fetch(`${cleanUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: activeModel,
            messages,
            stream: false,
            format: "json",
            keep_alive: -1
          })
        });
      }
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
  const isAnalyze = mode === 'code-to-en';
  const skipTokens = Boolean(settings?.skipTokenAnalysis);
  const isLocalOllama = settings?.apiProvider === 'ollama';

  const typeRule = isAnalyze
    ? `ANALYSIS MODE (MANDATORY): The user provided existing ${cleanShell} code to reverse-translate and analyze. You MUST preserve their exact input code verbatim inside the "command" field without modifying, reformatting, or adding flags to it. Provide a clear plain-English "summary" and detailed "overallExplanation" of what the code does, and if there is a better or safer way to write it, set "hasAlternative" to true and put the alternative in "alternativeText".`
    : isScript
    ? `STRUCTURAL FORMAT (MANDATORY): The user selected "Script". You MUST generate standard, readable, multi-line indented code with newlines and proper spacing. Do NOT compress the code into a single line or chain it with semicolons.`
    : `STRUCTURAL FORMAT (MANDATORY): The user selected "Command". You MUST provide a SINGLE-LINE command string suitable for immediate terminal execution (using pipes '|', operators '&&' or ';', or inline loops). Do NOT use multi-line line breaks in the command string.`;

  const fastTokenRule = `TOKENIZATION RULE (FAST MODE): Do NOT generate token-by-token explanations on this pass. You MUST return an empty array [] for "tokens".`;
  const fullTokenRule = isLocalOllama
    ? (isScript
        ? `TOKENIZATION RULE (LOCAL SCRIPT MODE): Break down only the first 6 lines of "command" into sequential whitespace-separated tokens (commands, flags, variables, keywords, arguments, and operators, maximum 12 tokens total, with a brief 1-sentence explanation per token) and STOP adding tokens after line 6 so the user can click "Full Breakdown Available" for the rest.`
        : `TOKENIZATION RULE (LOCAL COMMAND MODE): Break "command" down sequentially into its whitespace-separated tokens (commands/cmdlets, flags/parameters, arguments/strings, and pipe/chain operators) from start to finish so every part of the single-line command is covered, keeping each token's "explanation" concise (1 short sentence, max 12 words). Do NOT split inside a single flag or path (keep flags like "/R:2" or "--output=json" as one token).`)
    : `TOKENIZATION RULE (CRITICAL): The "tokens" array must break "command" down into GRANULAR, ATOMIC tokens in sequential order: (1) individual cmdlets/commands (e.g. "Get-VM"), (2) individual flags/parameters (e.g. "-ComputerName"), (3) individual variables (e.g. "$Server"), (4) individual keywords (e.g. "if", "foreach"), (5) individual operators/delimiters (e.g. "=", "|", ";", "{"), (6) string/number literals, and (7) entire comments (e.g. "# This is a comment"). Treat an entire comment block as a single token. NEVER group a multi-token block, loop body, or pipeline into one giant token, and NEVER use "..." placeholders. 30-LINE CAP RULE: If "command" is longer than 30 lines, ONLY generate tokens for the first 30 lines and STOP adding tokens after line 30 (leaving lines 31+ unannotated so the user can trigger "Full Breakdown Available").`;

  const nonInteractiveRule = isAnalyze
    ? ``
    : `IMPORTANT: Because commands execute in a non-interactive background bridge that cannot accept mid-execution stdin keystrokes (like [Y/N] prompts), ALWAYS append non-interactive confirmation flags where applicable (e.g., -Confirm:$false, -Force, -y, --yes, --no-input, /y) so the command never hangs waiting for user confirmation.`;

  const sessionPrivilegeHint = (isInteractiveSession && !ctx?.isElevated && !isAnalyze)
    ? `SESSION CONTEXT (CRITICAL): The user is currently in a standard (non-elevated) terminal session. For read-only inspection or query requests (such as checking disk usage with 'du' even on system directories like /var/log, listing files with 'ls', searching with 'find', or inspecting containers with 'docker ps' / 'docker stats'), NEVER prepend 'sudo' and set "requiresElevation" to false so the command runs directly in the current non-elevated session. Only use 'sudo' or set "requiresElevation" to true when the user requests a system-modifying or root-only administrative action (such as restarting services, editing system configs, flushing DNS caches, or resetting network catalogs).`
    : ``;

  const elevationRule = `Evaluate the complete command and its exact subcommands/flags on ${cleanOs}, and set "requiresElevation" to true if executing it requires Administrator, root, sudo, or cluster/cloud/daemon-level administrative privileges (such as modifying system services, firewall rules, network catalogs, system packages, Cloud IAM roles/policies/users like 'aws iam detach-role-policy', 'aws iam attach-role-policy', 'aws iam delete-*', infrastructure state locks like 'terraform force-unlock', or destructive/cluster-admin commands like 'docker system prune', 'systemctl restart', 'kubectl drain', 'kubectl cordon', 'helm uninstall'), or false if it is a standard user or read-only command.`;

  const localPlatformAndScriptHint = isLocalOllama
    ? `${cleanOs.toLowerCase() === 'macos' ? `PLATFORM RULE (macOS): Use native macOS utilities (e.g. 'sysctl -n machdep.cpu.brand_string', 'sysctl -n hw.ncpu', 'vm_stat', 'diskutil', 'scutil', 'brew') rather than Linux-only commands like 'lscpu', 'free', or 'apt'. ` : ''}${(isScript && !isAnalyze) ? `LOCAL SCRIPT RULE (MANDATORY): Because the user selected "Script", the "command" field MUST be a complete multi-line ${cleanShell} script containing multiple lines separated by "\\n" newline characters (never a single-line command or a semicolon-compressed one-liner). ` : ''}`
    : ``;

  const buildSystemPrompt = (useSkipTokens) => {
    const activeTokenRule = useSkipTokens ? fastTokenRule : fullTokenRule;
    const schemaTokens = useSkipTokens ? `[]` : `[ { "text": "...", "explanation": "...", "context": "..." } ]`;
    const schemaCmdPlaceholder = (isLocalOllama && isScript && !isAnalyze) ? `"<multi-line script with \\n newlines>"` : `"..."`;
    return `You are an expert ${cleanShell} assistant on ${cleanOs}. ${typeRule} ${activeTokenRule} ${nonInteractiveRule} ${sessionPrivilegeHint} ${elevationRule} ${localPlatformAndScriptHint}Return STRICTLY a JSON object matching this schema: { "summary": "...", "overallExplanation": "...", "command": ${schemaCmdPlaceholder}, "tokens": ${schemaTokens}, "hasAlternative": false, "alternativeText": "", "riskLevel": "Low", "riskExplanation": "", "requiresElevation": false }`;
  };

  const userMessages = [];
  previousTurns.forEach(t => {
    userMessages.push({ role: "user", text: t.prompt });
    userMessages.push({ role: "assistant", text: t.command });
  });
  userMessages.push({ role: "user", text: requestText });

  let parsed;
  try {
    const raw = await callAiProvider(buildSystemPrompt(skipTokens), userMessages, settings);
    parsed = cleanJsonResponse(raw);
  } catch (err) {
    // If JSON parsing failed due to output token truncation when token analysis was enabled, retry in fast mode
    if (!skipTokens && err instanceof SyntaxError) {
      const fallbackRaw = await callAiProvider(buildSystemPrompt(true), userMessages, settings);
      parsed = cleanJsonResponse(fallbackRaw);
      if (parsed && typeof parsed === 'object') {
        parsed.tokens = [];
      }
    } else {
      throw err;
    }
  }

  if (isLocalOllama && parsed && typeof parsed === 'object') {
    if (isScript && !isAnalyze && typeof parsed.command === 'string') {
      let cmdTrim = parsed.command.trim();
      if (!cmdTrim.includes('\n') && cmdTrim.includes(';')) {
        cmdTrim = cmdTrim
          .replace(/;\s*do\s+/g, '; do\n  ')
          .replace(/;\s*then\s+/g, '; then\n  ')
          .replace(/;\s*(done|fi)\b/g, '\n$1')
          .replace(/;\s+(?=[A-Za-z0-9_$/.-])/g, '\n');
        parsed.command = cmdTrim;
      }
      if (!parsed.command.trim().includes('\n')) {
        try {
          const retryMessages = [
            ...userMessages.slice(0, -1),
            {
              role: "user",
              text: `${requestText}\n\nIMPORTANT: You MUST return a complete multi-line ${cleanShell} script/configuration in the "command" field with multiple lines separated by "\\n" newline characters (at least 4 lines). Do NOT return a single-line command.`
            }
          ];
          const retryRaw = await callAiProvider(buildSystemPrompt(true), retryMessages, settings);
          const retryParsed = cleanJsonResponse(retryRaw);
          if (retryParsed && typeof retryParsed.command === 'string' && retryParsed.command.trim().includes('\n')) {
            parsed.command = retryParsed.command;
            if (retryParsed.summary) parsed.summary = retryParsed.summary;
            if (retryParsed.overallExplanation) parsed.overallExplanation = retryParsed.overallExplanation;
          }
        } catch {}
      }
    }

    if (!parsed.requiresElevation && typeof parsed.command === 'string') {
      const cmdStr = parsed.command;
      const riskText = `${parsed.riskExplanation || ''}`;
      const adminCmdPattern = /\b(sudo|Start-MpScan|WindowsDefenderScheduledScan|New-NetFirewallRule|Set-NetFirewallProfile|Stop-Service|Start-Service|Restart-Service|Set-Service|bcdedit|diskpart|sfc\s+\/scannow|DISM\b|wevtutil\s+cl|netsh\s+(int|interface\s+ip\s+(reset|set)|advfirewall\s+(reset|set)|winsock\s+reset)|systemctl\s+(restart|stop|start|enable|disable|mask)|service\s+\S+\s+(restart|stop|start)|ufw\s+(allow|deny|enable|disable|delete|reset)|iptables|usermod|useradd|userdel|groupadd|chown\s+-R|chmod\s+.*\/etc\/|fdisk|mkfs|parted|lvextend|lvcreate|vgcreate|sysctl\s+-w|dscacheutil\s+-flushcache|killall\s+-HUP\s+mDNSResponder|scutil\s+--set|spctl\s+--master-disable|launchctl\s+(load|unload|bootstrap|bootout)\s+\/Library|docker\s+system\s+prune|kubectl\s+(drain|cordon|uncordon|taint|delete\s+node|create\s+clusterrolebinding)|helm\s+uninstall|terraform\s+(force-unlock|destroy)|aws\s+iam\s+(detach-|attach-|delete-|create-|put-|update-))\b/i;
      const adminTextPattern = /\b(requires\s+(administrator|admin|root|elevated|sudo|cluster-admin)|run\s+as\s+administrator|elevated\s+privileges\s+required)\b/i;
      if (adminCmdPattern.test(cmdStr) || (!isInteractiveSession && adminTextPattern.test(riskText))) {
        parsed.requiresElevation = true;
      }
    }
  }

  if (skipTokens && parsed && typeof parsed === 'object') {
    parsed.tokens = [];
  } else if (parsed && typeof parsed.command === 'string' && Array.isArray(parsed.tokens) && parsed.tokens.length > 0) {
    const cleanCmd = parsed.command.trim();
    const cmdLines = cleanCmd.split(/\r?\n/);
    const maxInitialLines = (isLocalOllama && isScript) ? 6 : 30;
    if (cmdLines.length > maxInitialLines) {
      let newlineCount = 0;
      let lineCapEndIdx = cleanCmd.length;
      for (let i = 0; i < cleanCmd.length; i++) {
        if (cleanCmd[i] === '\n') {
          newlineCount++;
          if (newlineCount === maxInitialLines) {
            lineCapEndIdx = i;
            break;
          }
        }
      }
      const cappedTokens = [];
      let cursor = 0;
      for (const tk of parsed.tokens) {
        if (!tk || !tk.text || !tk.text.trim()) continue;
        const tText = tk.text.trim();
        const idx = cleanCmd.indexOf(tText, cursor);
        if (idx === -1) continue;
        if (idx + tText.length > lineCapEndIdx) break;
        cappedTokens.push(tk);
        cursor = idx + tText.length;
      }
      parsed.tokens = cappedTokens;
    }
  }
  return parsed;
};

export const fetchDeepTokenBreakdown = async (command, ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();
  const isLocalOllama = settings?.apiProvider === 'ollama';
  const localConciseRule = isLocalOllama
    ? `\n3. LOCAL CONCISENESS RULE: Keep each token's "explanation" concise (1 short sentence, max 12 words) and keep composite flags (e.g. "/R:2", "--exclude='node_modules'") or full comment lines as single tokens so the breakdown completes quickly.`
    : ``;

  const systemPrompt = `You are a code lexer and documentation expert for ${cleanShell} on ${cleanOs}. 
Analyze the provided code and return an exhaustive, granular, atomic token breakdown covering 100% of the code from start to finish.
CRITICAL RULES:
1. Every token MUST be a single atomic element in sequential order: an individual command/cmdlet, an individual parameter/flag, an individual variable, an individual keyword (if, else, switch, foreach, param, return, continue), an individual operator (=, -eq, |, ;, {, }), a single string/number literal, or an entire comment block (e.g. "# comment text"). Treat an entire comment as a single token.
2. NEVER group a multi-line block, loop body, switch body, or full statement into a single token, and NEVER use "..." placeholders.${localConciseRule}
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

  const elevationRule = `Evaluate whether the fixCommand requires Administrator, root, or elevated privileges on ${cleanOs} and set "requiresElevation" to true ONLY if it actually requires elevation (or false if it can run under standard user permissions).`;

  const systemPrompt = `You are an automated ${cleanShell} debugger on ${cleanOs}. Always append non-interactive confirmation flags where applicable (e.g., -Confirm:$false, -Force, -y, --no-input) so the fix command never hangs waiting for [Y/N] user input. ${elevationRule} Return STRICTLY a JSON object: { "explanation": "...", "fixCommand": "...", "requiresElevation": false }`;
  const userMessages = [{ role: "user", text: `User Objective: "${prompt}"\nFailed Command: "${failedCommand}"\nOutput:\n${fullTerminalTranscript}` }];

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  return cleanJsonResponse(raw);
};

export const fetchCommandSimulation = async (command, ctx, sessionTranscript = "", settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'PowerShell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();
  const isElevated = Boolean(ctx?.isElevated);
  const isLocalOllama = settings?.apiProvider === 'ollama';
  const localSimRule = isLocalOllama
    ? `\nLOCAL SIMULATION RULES (CRITICAL): 1. Keep "terminalOutput" concise and realistic (maximum 8 to 10 sample rows for directory, file, process, or network listings) so the JSON output never truncates. 2. Read-only inspection and query commands — including 'netsh interface ipv4 show ...', 'netsh wlan show ...', 'netsh advfirewall show ...', 'ipconfig', 'route print', 'arp -a', 'Get-NetAdapter', 'Get-NetIPAddress', 'Get-ChildItem', 'Get-Process', 'Get-Service', 'ls', 'du', 'df', 'ps', 'lsof' — do NOT require elevation and MUST succeed with "status": "success" even when Elevated/Admin Privileges is 'No'.`
    : ``;

  const systemPrompt = `You are a realistic terminal execution engine simulating ${cleanShell} on ${cleanOs} (Elevated/Admin Privileges: ${isElevated ? 'Yes' : 'No'}). 
CRITICAL PERMISSIONS RULE: If Elevated/Admin Privileges is 'No', evaluate the command and its exact subcommands/flags. Standard read-only, inspection, or user-level commands (including 'docker ps', 'docker stats', 'docker images', 'kubectl get', 'du', 'ls', 'df', 'systeminfo', 'diskutil list', 'diskutil info') are permitted under standard user permissions and MUST succeed with realistic output. If executing the command requires Administrator, root, or elevated privileges on ${cleanOs} (for example, commands using 'sudo', managing system services like 'Restart-Service', 'Stop-Service', 'net stop', 'systemctl restart', resetting network/Winsock catalogs, flushing system DNS caches via 'dscacheutil'/'killall mDNSResponder', or modifying firewall rules), you MUST simulate a realistic permission error (e.g., Access Denied, Operation requires elevation, or insufficient privileges) with "status": "error" and non-zero exit code.
If valid and permitted, simulate a realistic execution output (stdout/stderr). If it queries or lists items (e.g., network adapters, VMs, processes, files), format a realistic tabular or structured console response.
If the command contains syntax errors, references invalid flags, or targets non-existent resources without creation parameters, simulate the realistic console error message with exit code 1 and "status": "error".${localSimRule}
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
  try {
    return cleanJsonResponse(raw);
  } catch (err) {
    if (isLocalOllama && typeof raw === 'string') {
      const statusMatch = raw.match(/"status"\s*:\s*"(success|error)"/i);
      const summaryMatch = raw.match(/"summaryMessage"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
      const outStart = raw.indexOf('"terminalOutput"');
      let partialOut = 'Command executed.';
      if (outStart !== -1) {
        const colonIdx = raw.indexOf(':', outStart);
        const quoteIdx = colonIdx !== -1 ? raw.indexOf('"', colonIdx + 1) : -1;
        if (quoteIdx !== -1) {
          partialOut = raw
            .slice(quoteIdx + 1)
            .replace(/["}\s]+$/, '')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
        }
      }
      return {
        status: statusMatch ? statusMatch[1].toLowerCase() : 'success',
        summaryMessage: summaryMatch ? summaryMatch[1] : 'Simulated execution completed.',
        terminalOutput: partialOut
      };
    }
    throw err;
  }
};

export const fetchCommandDebug = async (prompt, command, debugThread = [], currentInput, ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'shell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const elevationRule = `Evaluate whether any suggested fix command or code block requires Administrator, root, sudo, or cluster/cloud-admin privileges on ${cleanOs}. If a specific code block requires elevation, tag its markdown fence with ":admin" (for example \`\`\`powershell:admin or \`\`\`bash:admin) and set "requiresElevation" to true (or false if all fixes run under standard user permissions).`;

  const codeBlockRule = `CRITICAL CODE BLOCK RULE: Every response MUST include the complete corrected command or complete corrected multi-line script inside a triple-backtick (\`\`\`) markdown code block within "analysis" AND in the "fixCode" field so the UI can render Copy/Run or Copy/Download action buttons. Even if the command failed purely due to missing privileges, authentication, RBAC, or port permissions (with no syntax error), you MUST still output the complete runnable command inside a triple-backtick (\`\`\`) code block and in "fixCode". Never use only inline single backticks for the solution.`;

  const systemPrompt = `You are an expert ${cleanShell} debugger on ${cleanOs}. The user originally requested this objective: "${prompt}". The generated command/script they are trying to debug is: "${command}". Always include non-interactive flags where applicable (e.g. -Confirm:$false, -Force, -y). ${codeBlockRule} ${elevationRule} Return STRICTLY a JSON object matching: { "analysis": "Detailed explanation followed by a triple-backtick (\`\`\`) markdown code block with the complete fixed command or script", "fixCode": "The complete corrected command or multi-line script as raw code", "requiresElevation": false }`;
  const userMessages = [
    ...debugThread.map(msg => ({ role: msg.role === 'model' ? 'assistant' : msg.role, text: msg.text })),
    { role: "user", text: currentInput }
  ];

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  try {
    const parsed = cleanJsonResponse(raw);
    const reqElev = Boolean(parsed.requiresElevation);
    let analysisText = parsed.analysis || parsed.explanation || raw;
    const rawFix = typeof parsed.fixCode === 'string'
      ? parsed.fixCode.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim()
      : '';
    if (rawFix && !/```[\s\S]*?```/.test(analysisText)) {
      const fenceTag = reqElev ? 'sh:admin' : 'sh';
      analysisText = `${analysisText.trim()}\n\n\`\`\`${fenceTag}\n${rawFix}\n\`\`\``;
    }
    return {
      analysis: analysisText,
      requiresElevation: reqElev
    };
  } catch {
    return { analysis: raw, requiresElevation: false };
  }
};

export const fetchStandaloneDebug = async (messages = [], ctx, settingsOrKey = '') => {
  const settings = typeof settingsOrKey === 'object' ? settingsOrKey : { apiKey: settingsOrKey, apiProvider: 'gemini' };
  const cleanShell = (ctx?.shell || 'shell').replace(/\s*\(Elevated\)/i, '').trim();
  const cleanOs = (ctx?.os || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();

  const elevationRule = `Evaluate whether any suggested fix command or code block requires Administrator, root, sudo, or cluster/cloud-admin privileges on ${cleanOs}. If a specific code block requires elevation, tag its markdown fence with ":admin" (for example \`\`\`powershell:admin or \`\`\`bash:admin) and set "requiresElevation" to true (or false if all fixes run under standard user permissions).`;

  const codeBlockRule = `CRITICAL CODE BLOCK RULE: Every response MUST include the complete corrected command or complete corrected multi-line script inside a triple-backtick (\`\`\`) markdown code block within "analysis" AND in the "fixCode" field so the UI can render Copy/Run or Copy/Download action buttons. Even if the command failed purely due to missing privileges, authentication, RBAC, or port permissions (with no syntax error), you MUST still output the complete runnable command inside a triple-backtick (\`\`\`) code block and in "fixCode". Never describe the fix only in prose or single backticks.`;

  const systemPrompt = `You are an expert ${cleanShell} debugger on ${cleanOs}.
Analyze the user's issue, error log, and code to automatically determine whether the problem involves a multi-line "Script" (e.g., script files, functions, multi-line blocks, automation scripts) or a single-line "Command".
Always provide a suggested fix or corrected code with non-interactive flags where applicable (e.g. -Confirm:$false, -Force, -y).
${codeBlockRule}
${elevationRule}
Return STRICTLY a JSON object matching this schema:
{
  "summary": "A brief summary",
  "analysis": "Your detailed explanation followed by a triple-backtick (\`\`\`) markdown code block containing the complete fixed command or script.",
  "fixCode": "The complete corrected command or multi-line script as raw code",
  "type": "Script" or "Command",
  "requiresElevation": false
}`;
  const userMessages = messages.map(msg => ({ role: msg.role === 'model' ? 'assistant' : msg.role, text: msg.text }));

  const raw = await callAiProvider(systemPrompt, userMessages, settings);
  try {
    const parsed = cleanJsonResponse(raw);
    const resolvedType = (parsed.type && String(parsed.type).toLowerCase() === 'script') ? 'Script' : 'Command';
    const reqElev = Boolean(parsed.requiresElevation);
    let analysisText = parsed.analysis || "";
    const rawFix = typeof parsed.fixCode === 'string'
      ? parsed.fixCode.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim()
      : '';
    if (rawFix && !/```[\s\S]*?```/.test(analysisText)) {
      const fenceTag = reqElev ? 'sh:admin' : 'sh';
      analysisText = `${analysisText.trim()}\n\n\`\`\`${fenceTag}\n${rawFix}\n\`\`\``;
    }
    return { 
      summary: parsed.summary || "Debug Session", 
      analysis: analysisText,
      type: resolvedType,
      requiresElevation: reqElev
    };
  } catch {
    return { summary: "Debug Session", analysis: raw, type: 'Command', requiresElevation: false };
  }
};