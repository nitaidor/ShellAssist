import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, X, Plus, Trash2, AlertTriangle, AlertCircle, XCircle,
  CheckCircle2, Loader2, Play, Square, Download, Ban, HelpCircle,
  Pencil, Check
} from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

const KNOWN_FAMILY_CASING = {
  gemma: 'Gemma', qwen: 'Qwen', llama: 'Llama', tinyllama: 'TinyLlama', codellama: 'CodeLlama',
  deepseek: 'DeepSeek', mistral: 'Mistral', mixtral: 'Mistral', codestral: 'Mistral',
  devstral: 'Mistral', ministral: 'Mistral', mathstral: 'Mistral', phi: 'Phi', gpt: 'GPT-OSS',
  glm: 'GLM', minimax: 'MiniMax', nemotron: 'Nemotron', granite: 'Granite', command: 'Command-R',
  starcoder: 'StarCoder', olmo: 'OLMo', smollm: 'SmolLM', falcon: 'Falcon', aya: 'Aya',
  cogito: 'Cogito', kimi: 'Kimi', dolphin: 'Dolphin', wizardlm: 'WizardLM',
  wizardcoder: 'WizardCoder', yi: 'Yi', solar: 'Solar', internlm: 'InternLM',
  opencoder: 'OpenCoder', qWQ: 'Qwen', qwq: 'Qwen'
};

// Recommended models categorized by family, sorted with newer generations and larger parameter models on top
const RECOMMENDED_OLLAMA_MODELS = [
  {
    family: 'Qwen (Alibaba)',
    subtitle: 'Top recommendation for shell scripting, PowerShell, Bash & coding accuracy',
    models: [
      { tag: 'qwen3:8b', ram: '~5.2 GB RAM', tier: '16 GB RAM', desc: 'Strong all-rounder for both command generation and natural-language explanations.' },
      { tag: 'qwen3:4b', ram: '~2.6 GB RAM', tier: '8–16 GB RAM', desc: 'Fast, modern compact model for everyday commands and script analysis.' },
      { tag: 'qwen2.5-coder:14b', ram: '~9.0 GB RAM', tier: '32 GB+ RAM', desc: 'Near-cloud-level complex script generation and multi-step debugging.' },
      { tag: 'qwen2.5-coder:7b', ram: '~4.8 GB RAM', tier: 'Best Overall (16 GB RAM)', desc: 'Exceptional accuracy with PowerShell cmdlets, Bash pipelines, and strict JSON formatting.' },
      { tag: 'qwen2.5-coder:3b', ram: '~2.2 GB RAM', tier: 'Best Lightweight / Fast', desc: 'Near-instant generation on laptops and systems without a dedicated GPU; ideal for quick everyday commands.' }
    ]
  },
  {
    family: 'Gemma (Google)',
    subtitle: 'Fast edge architecture & clear code explanations',
    models: [
      { tag: 'gemma4:12b', ram: '~7.5 GB RAM', tier: '16–32 GB RAM', desc: 'High-capacity model for complex script writing and deep error diagnosis.' },
      { tag: 'gemma4:e4b', ram: '~3.2 GB RAM', tier: 'Balanced Default', desc: 'Fast and reliable at structured JSON output and explaining code in the Analyzer.' },
      { tag: 'gemma4:e2b', ram: '~1.8 GB RAM', tier: 'Ultra-Lightweight', desc: 'Runs smoothly even on older laptops, integrated graphics, or low-RAM systems.' }
    ]
  },
  {
    family: 'Llama (Meta)',
    subtitle: 'Dependable instruction following & general shell tasks',
    models: [
      { tag: 'llama3.2:3b', ram: '~2.0 GB RAM', tier: '8–16 GB RAM', desc: 'Fast and compact for quick everyday terminal commands with minimal memory usage.' },
      { tag: 'llama3.1:8b', ram: '~4.7 GB RAM', tier: '16 GB RAM', desc: 'Proven 8B workhorse for general-purpose CLI assistance.' }
    ]
  },
  {
    family: 'Mistral (Mistral AI)',
    subtitle: 'Dedicated workstation coding & snappy 7B models',
    models: [
      { tag: 'codestral:22b', ram: '~13.0 GB RAM', tier: '32 GB+ RAM', desc: 'Mistral’s flagship dedicated code and CLI model for high-end workstations.' },
      { tag: 'mistral:7b', ram: '~4.1 GB RAM', tier: '16 GB RAM', desc: 'Fast and dependable 7B model on mid-range GPUs.' }
    ]
  },
  {
    family: 'Phi (Microsoft)',
    subtitle: 'High reasoning density in a compact footprint',
    models: [
      { tag: 'phi4:14b', ram: '~9.0 GB RAM', tier: '24–32 GB+ RAM', desc: 'Advanced logic and reasoning for diagnosing tricky terminal errors.' },
      { tag: 'phi4-mini:3.8b', ram: '~2.5 GB RAM', tier: '8–16 GB RAM', desc: 'Compact reasoning and script analysis for laptops.' }
    ]
  },
  {
    family: 'DeepSeek',
    subtitle: 'Mixture-of-Experts coding specialist',
    models: [
      { tag: 'deepseek-coder-v2:16b', ram: '~8.9 GB RAM', tier: '16–32 GB RAM', desc: 'Fast MoE architecture tailored specifically for code and shell scripts.' }
    ]
  }
];

const inferFamilyForModel = (modelTag = '') => {
  const clean = modelTag.trim().toLowerCase();
  if (!clean) return 'Gemma';
  const [base] = clean.split(':');
  const prefixMatch = base.match(/^([a-z]+)/);
  const rootPrefix = prefixMatch ? prefixMatch[1] : base;
  if (KNOWN_FAMILY_CASING[rootPrefix]) return KNOWN_FAMILY_CASING[rootPrefix];
  return rootPrefix.charAt(0).toUpperCase() + rootPrefix.slice(1);
};

const formatModelDisplayLabel = (rawTag = '') => {
  const clean = rawTag.trim();
  if (!clean) return '';
  const [base, sizeTag] = clean.split(':');
  const formattedBase = base
    .replace(/^([a-z]+)(\d)/i, '$1 $2')
    .replace(/^deepseek-r(\d)/i, 'DeepSeek R$1')
    .replace(/^deepseek-v(\d)/i, 'DeepSeek V$1')
    .replace(/^deepseek-coder-v(\d)/i, 'DeepSeek Coder V$1')
    .replace(/^deepseek/i, 'DeepSeek')
    .replace(/^gpt-oss/i, 'GPT-OSS')
    .replace(/^glm-(\d)/i, 'GLM-$1')
    .replace(/^phi (\d)/i, 'Phi-$1')
    .replace(/^olmo (\d)/i, 'OLMo $1')
    .replace(/^smollm (\d)/i, 'SmolLM $1')
    .replace(/^starcoder (\d)/i, 'StarCoder $1')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const formattedSize = sizeTag && sizeTag.toLowerCase() !== 'latest' ? ` ${sizeTag.toUpperCase()}` : '';
  return `${formattedBase}${formattedSize} (${clean})`;
};

const formatDiskSize = (bytes) => {
  if (!bytes || typeof bytes !== 'number' || bytes <= 0) return '';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 ** 2);
  return `${Math.max(1, Math.round(mb))} MB`;
};

const extractModelVersion = (baseName = '') => {
  const match = baseName.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

const extractParamSizeBillions = (sizeTag = '') => {
  if (!sizeTag || sizeTag.toLowerCase() === 'latest') return 0;
  const lower = sizeTag.toLowerCase().trim();
  const moeMatch = lower.match(/^(\d+)x(\d+(?:\.\d+)?)([bm])$/);
  if (moeMatch) {
    const mult = parseFloat(moeMatch[1]) * parseFloat(moeMatch[2]);
    return moeMatch[3] === 'm' ? mult / 1000 : mult;
  }
  const stdMatch = lower.match(/^e?(\d+(?:\.\d+)?)([bm])$/);
  if (stdMatch) {
    const val = parseFloat(stdMatch[1]);
    return stdMatch[2] === 'm' ? val / 1000 : val;
  }
  return 0.001;
};

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  apiStatus,
  setApiStatus,
  isDarkMode,
  setIsDarkMode,
  onToggleTerminalIntegration
}) => {
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [editingKeyIndex, setEditingKeyIndex] = useState(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [showRecommendedModal, setShowRecommendedModal] = useState(false);
  const [recommendedAlert, setRecommendedAlert] = useState(null);

  // Ollama Manager State
  const [isOllamaRunning, setIsOllamaRunning] = useState(false);
  const [ollamaActionState, setOllamaActionState] = useState('idle');
  const [rawInstalledEntries, setRawInstalledEntries] = useState([]);
  const [onlineCatalogModels, setOnlineCatalogModels] = useState([]);
  const [latestMatches, setLatestMatches] = useState({});
  const [runningModel, setRunningModel] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(() => inferFamilyForModel(settings?.localModel || 'gemma4:e4b'));
  const [selectedModel, setSelectedModel] = useState(() => String(settings?.localModel || 'gemma4:e4b'));
  const [selectedUninstallModel, setSelectedUninstallModel] = useState('');
  const [modelActionState, setModelActionState] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('Checking Ollama status...');
  const [installProgress, setInstallProgress] = useState(null);
  const [ollamaError, setOllamaError] = useState(null);

  const pullAbortRef = useRef(null);
  const recommendedScrollRef = useRef(null);
  const keyInputRef = useRef(null);
  const latestSettingsRef = useRef(settings);
  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);
  const currentProvider = settings?.apiProvider || 'gemini';

  useEffect(() => {
    if (!showRecommendedModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowRecommendedModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showRecommendedModal]);

  // Ensure the Recommended Models popup scrolls to the top whenever an error banner is triggered
  useEffect(() => {
    if (recommendedAlert && recommendedScrollRef.current) {
      recommendedScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [recommendedAlert]);

  const triggerRecommendedAlert = (title, message) => {
    setRecommendedAlert({ title, message });
    if (recommendedScrollRef.current) {
      recommendedScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getCleanEndpoint = () => {
    return String(settings?.localEndpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
  };

  const getDeduplicatedInstalledNames = (entries = rawInstalledEntries) => {
    return entries
      .filter((entry) => {
        const lowerName = entry.name.toLowerCase();
        if (!lowerName.endsWith(':latest') || !entry.digest) return true;
        const hasNumberedDuplicateWithSameHash = entries.some(
          (other) =>
            other.name.toLowerCase() !== lowerName &&
            !other.name.toLowerCase().endsWith(':latest') &&
            other.digest &&
            other.digest === entry.digest
        );
        return !hasNumberedDuplicateWithSameHash;
      })
      .map((e) => e.name);
  };

  const installedModels = getDeduplicatedInstalledNames(rawInstalledEntries);

  const getEffectiveParamScore = (modelTag = '') => {
    const clean = modelTag.trim().toLowerCase();
    const [, sz = 'latest'] = clean.split(':');
    if (sz === 'latest') {
      const matchedNumberedTag = latestMatches[clean];
      if (matchedNumberedTag) {
        const [, matchedSz = ''] = matchedNumberedTag.toLowerCase().split(':');
        return extractParamSizeBillions(matchedSz) + 0.0001;
      }
      const localEntry = rawInstalledEntries.find((e) => e.name.toLowerCase() === clean);
      if (localEntry?.paramSize) {
        return extractParamSizeBillions(localEntry.paramSize) + 0.0001;
      }
      return 0;
    }
    return extractParamSizeBillions(sz);
  };

  const sortModelsList = (models = []) => {
    return [...models].sort((a, b) => {
      const [baseA, sizeA = ''] = a.value.toLowerCase().split(':');
      const [baseB, sizeB = ''] = b.value.toLowerCase().split(':');
      if (baseA !== baseB) {
        const verA = extractModelVersion(baseA);
        const verB = extractModelVersion(baseB);
        if (verA !== verB) return verB - verA;
        return baseA.localeCompare(baseB);
      }
      const paramsA = getEffectiveParamScore(a.value);
      const paramsB = getEffectiveParamScore(b.value);
      if (paramsA !== paramsB) return paramsB - paramsA;
      return sizeB.localeCompare(sizeA);
    });
  };

  const isModelInstalled = (modelTag, customDeduplicatedList = null) => {
    if (!modelTag) return false;
    const list = customDeduplicatedList || installedModels;
    const target = modelTag.toLowerCase();
    return list.some((inst) => inst.toLowerCase() === target);
  };

  const isTagCurrentlyRunning = (modelTag) => {
    if (!runningModel || !modelTag) return false;
    const lowerTarget = modelTag.toLowerCase();
    const lowerRunning = runningModel.toLowerCase();
    if (lowerTarget === lowerRunning) return true;
    const targetEntry = rawInstalledEntries.find((e) => e.name.toLowerCase() === lowerTarget);
    const runningEntry = rawInstalledEntries.find((e) => e.name.toLowerCase() === lowerRunning);
    return Boolean(targetEntry?.digest && runningEntry?.digest && targetEntry.digest === runningEntry.digest);
  };

  const buildDynamicCatalog = () => {
    const grouped = {};
    const allRawTags = [...onlineCatalogModels, ...installedModels, ...(runningModel ? [runningModel] : [])];
    const basesWithExplicitSizes = new Set();

    allRawTags.forEach((t) => {
      if (!t || typeof t !== 'string') return;
      const [base, sz] = t.trim().toLowerCase().split(':');
      if (base && sz && sz !== 'latest') basesWithExplicitSizes.add(base);
    });

    const addTag = (rawTag, isFromInstalled = false) => {
      if (!rawTag || typeof rawTag !== 'string') return;
      const cleanTag = rawTag.trim();
      if (!cleanTag) return;
      const [base, sz = 'latest'] = cleanTag.toLowerCase().split(':');

      if (sz === 'latest' && !isFromInstalled && !isModelInstalled(cleanTag) && basesWithExplicitSizes.has(base)) {
        return;
      }

      const fam = inferFamilyForModel(cleanTag);
      if (!grouped[fam]) grouped[fam] = [];
      if (!grouped[fam].some((m) => m.value.toLowerCase() === cleanTag.toLowerCase())) {
        grouped[fam].push({ value: cleanTag, label: formatModelDisplayLabel(cleanTag) });
      }
    };

    installedModels.forEach((tag) => addTag(tag, true));
    onlineCatalogModels.forEach((tag) => addTag(tag, false));

    const sortedCatalog = {};
    Object.keys(grouped).forEach((fam) => {
      if (grouped[fam]?.length > 0) sortedCatalog[fam] = sortModelsList(grouped[fam]);
    });
    return sortedCatalog;
  };

  const dynamicCatalog = buildDynamicCatalog();

  const familyOptions = (() => {
    const families = Object.keys(dynamicCatalog);
    if (families.length === 0) {
      return [{ value: selectedFamily || 'Gemma', label: selectedFamily || 'Gemma', badge: null }];
    }
    return families.map((fam) => {
      const count = isOllamaRunning ? (dynamicCatalog[fam] || []).filter((m) => isModelInstalled(m.value)).length : 0;
      return { value: fam, label: fam, badge: count > 0 ? `${count} Installed` : null };
    });
  })();

  const getShortModelLabel = (modelTag) => {
    if (!modelTag) return 'Model';
    return formatModelDisplayLabel(modelTag).replace(/\s*\([^)]*\)\s*$/, '').trim() || modelTag;
  };

  useEffect(() => {
    if (!isOllamaRunning || runningModel) return;
    const availableFamilies = Object.keys(dynamicCatalog);
    if (availableFamilies.length === 0) return;

    const activeFam = availableFamilies.includes(selectedFamily) ? selectedFamily : availableFamilies[0];
    if (activeFam !== selectedFamily) setSelectedFamily(activeFam);

    const famModels = dynamicCatalog[activeFam] || [];
    if (famModels.length > 0 && !famModels.some((m) => m.value.toLowerCase() === selectedModel.toLowerCase())) {
      const firstInstalled = famModels.find((m) => isModelInstalled(m.value));
      setSelectedModel(firstInstalled ? firstInstalled.value : famModels[0].value);
    }
  }, [onlineCatalogModels, rawInstalledEntries, latestMatches, isOllamaRunning, runningModel]);

  useEffect(() => {
    if (!isOllamaRunning || installedModels.length === 0) {
      setSelectedUninstallModel('');
      return;
    }
    const currentValid = installedModels.some((m) => m === selectedUninstallModel && !isTagCurrentlyRunning(m));
    if (!currentValid) {
      const sortedInstalled = sortModelsList(installedModels.map((tag) => ({ value: tag, label: formatModelDisplayLabel(tag) }))).map((item) => item.value);
      const firstDeletable = sortedInstalled.find((m) => !isTagCurrentlyRunning(m));
      setSelectedUninstallModel(firstDeletable || sortedInstalled[0] || '');
    }
  }, [rawInstalledEntries, runningModel, latestMatches, isOllamaRunning]);

  const syncOllamaState = async (customEndpoint = null) => {
    const endpoint = customEndpoint || getCleanEndpoint();
    setOllamaError(null);

    let serverUp = false;
    let detectedEntries = [];
    let detectedRunning = '';

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const tagsRes = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(t);
      if (tagsRes.ok) {
        serverUp = true;
        const tagsData = await tagsRes.json();
        const rawList = Array.isArray(tagsData?.models) ? tagsData.models : [];
        detectedEntries = rawList
          .map((m) => {
            if (typeof m === 'string') return { name: m, digest: '', paramSize: '', diskBytes: 0 };
            return {
              name: m?.name || m?.model || '',
              digest: m?.digest || '',
              paramSize: m?.details?.parameter_size || '',
              diskBytes: typeof m?.size === 'number' ? m.size : 0
            };
          })
          .filter((e) => Boolean(e.name));
      }
    } catch {
      serverUp = false;
    }

    if (!serverUp) {
      setIsOllamaRunning(false);
      setRunningModel('');
      setRawInstalledEntries([]);
      setOnlineCatalogModels([]);
      setStatusMessage('Ollama Server Offline');
      if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
      return;
    }

    setIsOllamaRunning(true);
    setRawInstalledEntries(detectedEntries);
    const deduplicatedNames = getDeduplicatedInstalledNames(detectedEntries);

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const psRes = await fetch(`${endpoint}/api/ps`, { signal: controller.signal });
      clearTimeout(t);
      if (psRes.ok) {
        const psData = await psRes.json();
        const runningList = Array.isArray(psData?.models) ? psData.models : [];
        if (runningList.length > 0) {
          const first = runningList[0];
          const rawRunningName = typeof first === 'string' ? first : (first?.name || first?.model || '');
          const runningDigest = typeof first === 'object' ? first?.digest : '';

          if (rawRunningName.toLowerCase().endsWith(':latest') && !deduplicatedNames.some((n) => n.toLowerCase() === rawRunningName.toLowerCase())) {
            const matchingNumbered = detectedEntries.find(
              (e) =>
                !e.name.toLowerCase().endsWith(':latest') &&
                e.digest &&
                (e.digest === runningDigest ||
                  e.digest === detectedEntries.find((x) => x.name.toLowerCase() === rawRunningName.toLowerCase())?.digest)
            );
            detectedRunning = matchingNumbered ? matchingNumbered.name : rawRunningName;
          } else {
            detectedRunning = rawRunningName;
          }
        }
      }
    } catch {}

    const standaloneLatestToResolve = detectedEntries.filter(
      (e) => e.name.toLowerCase().endsWith(':latest') && deduplicatedNames.some((n) => n.toLowerCase() === e.name.toLowerCase())
    );

    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchOllamaCatalog === 'function') {
      window.electronAPI.fetchOllamaCatalog(standaloneLatestToResolve).then((res) => {
        if (res?.latestMatches && typeof res.latestMatches === 'object') {
          setLatestMatches((prev) => ({ ...prev, ...res.latestMatches }));
        }
        if (res?.status === 'ok' && Array.isArray(res.models) && res.models.length > 0) {
          setOnlineCatalogModels(res.models);
        }
      }).catch(() => {});
    }

    if (detectedRunning) {
      setRunningModel(detectedRunning);
      const fam = inferFamilyForModel(detectedRunning);
      setSelectedFamily(fam);
      setSelectedModel(detectedRunning);
      setStatusMessage(`${detectedRunning} is Running`);
      setSettings((prev) => ({ ...prev, localEndpoint: endpoint, localModel: detectedRunning }));
      if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('valid');
    } else {
      setRunningModel('');
      const sortedDetected = sortModelsList(deduplicatedNames.map((t) => ({ value: t, label: t })));
      const bestDefault = sortedDetected[0]?.value || selectedModel || settings?.localModel || 'gemma4:e4b';
      const fam = inferFamilyForModel(bestDefault);
      setSelectedFamily(fam);
      setSelectedModel(bestDefault);
      const isInst = isModelInstalled(bestDefault, deduplicatedNames);
      setStatusMessage(isInst ? `Ready (${bestDefault} is installed)` : `${bestDefault} is not installed`);
      if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
    }
  };

  useEffect(() => {
    let active = true;
    if (isOpen && currentProvider === 'ollama') {
      const init = async () => {
        let endpoint = getCleanEndpoint();
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getOllamaHost === 'function') {
          try {
            const host = await window.electronAPI.getOllamaHost();
            if (host) endpoint = host;
          } catch {}
        }
        if (active && latestSettingsRef.current?.apiProvider === 'ollama') {
          await syncOllamaState(endpoint);
        }
      };
      init();
    }
    return () => { active = false; };
  }, [isOpen, currentProvider]);

  useEffect(() => {
    if (!isOllamaRunning || ollamaActionState !== 'idle' || modelActionState !== 'idle' || runningModel) return;
    if (!selectedModel) return;
    setStatusMessage(isModelInstalled(selectedModel) ? `Ready (${selectedModel} is installed)` : `${selectedModel} is not installed`);
  }, [selectedModel, rawInstalledEntries, isOllamaRunning, ollamaActionState, modelActionState, runningModel]);

  if (!isOpen) return null;

  const handleToggleOllamaServer = async () => {
    if (ollamaActionState !== 'idle') return;
    setOllamaError(null);

    if (isOllamaRunning) {
      if (pullAbortRef.current) {
        pullAbortRef.current.abort();
        pullAbortRef.current = null;
      }
      setModelActionState('idle');
      setInstallProgress(null);
      setOllamaActionState('stopping');
      setStatusMessage('Stopping Ollama server...');

      try {
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.stopOllama === 'function') {
          await window.electronAPI.stopOllama();
        }
      } catch (err) {
        setOllamaError(err?.message || 'Failed to stop Ollama server.');
      } finally {
        setIsOllamaRunning(false);
        setRunningModel('');
        setRawInstalledEntries([]);
        setOnlineCatalogModels([]);
        setOllamaActionState('idle');
        setStatusMessage('Ollama Server Offline');
        if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
      }
    } else {
      setOllamaActionState('starting');
      setStatusMessage('Starting Ollama server...');

      try {
        if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.startOllama === 'function') {
          const res = await window.electronAPI.startOllama();
          if (res?.status === 'running') {
            const ep = res.endpoint || getCleanEndpoint();
            setSettings((prev) => ({ ...prev, localEndpoint: ep }));
            await syncOllamaState(ep);
          } else {
            setOllamaError(res?.message || 'Could not start Ollama server.');
            setStatusMessage('Ollama Server Offline');
          }
        } else {
          await syncOllamaState();
        }
      } catch (err) {
        setOllamaError(err?.message || 'Failed to start Ollama server.');
        setStatusMessage('Ollama Server Offline');
      } finally {
        setOllamaActionState('idle');
      }
    }
  };

  const handleFamilyChange = (newFamily) => {
    if (!isOllamaRunning || runningModel || modelActionState !== 'idle') return;
    setSelectedFamily(newFamily);
    const modelsInFamily = dynamicCatalog[newFamily] || [];
    if (modelsInFamily.length > 0) {
      const firstInstalled = modelsInFamily.find((m) => isModelInstalled(m.value));
      setSelectedModel(firstInstalled ? firstInstalled.value : modelsInFamily[0].value);
    }
  };

  const handleModelChange = (newModel) => {
    if (!isOllamaRunning || runningModel || modelActionState !== 'idle') return;
    setSelectedModel(String(newModel));
  };

  const handleSelectRecommendedModel = (targetTag) => {
    setRecommendedAlert(null);

    if (!isOllamaRunning) {
      triggerRecommendedAlert(
        'Ollama Server Offline',
        'Please start the Ollama server first before selecting a model from the catalog.'
      );
      return;
    }

    if (ollamaActionState !== 'idle' || modelActionState !== 'idle') {
      triggerRecommendedAlert(
        'Operation in Progress',
        'Please wait for the current model operation to finish before switching models.'
      );
      return;
    }

    if (runningModel) {
      if (isTagCurrentlyRunning(targetTag)) {
        setShowRecommendedModal(false);
        return;
      }
      triggerRecommendedAlert(
        'Another Model is Running',
        `"${runningModel}" is currently running. Please stop the active model before selecting a different one.`
      );
      return;
    }

    const fam = inferFamilyForModel(targetTag);
    const famModels = dynamicCatalog[fam] || [];
    const matched = famModels.find((m) => m.value.toLowerCase() === targetTag.toLowerCase());

    if (!matched) {
      triggerRecommendedAlert(
        'Model Not Found',
        `"${targetTag}" was not found in the current Ollama library and may no longer be supported.`
      );
      return;
    }

    setSelectedFamily(fam);
    setSelectedModel(matched.value);
    setShowRecommendedModal(false);
  };

  const startSelectedModelInMemory = async (modelToStart) => {
    const endpoint = getCleanEndpoint();
    setModelActionState('starting');
    setStatusMessage(`Loading ${modelToStart} into memory...`);
    setOllamaError(null);

    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToStart, prompt: '', keep_alive: -1 })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to load ${modelToStart} (HTTP ${res.status})`);
      }

      setRunningModel(modelToStart);
      setSettings((prev) => ({ ...prev, localModel: modelToStart, localEndpoint: endpoint }));
      setStatusMessage(`${modelToStart} is Running`);
      if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('valid');
    } catch (err) {
      setOllamaError(err?.message || `Failed to start ${modelToStart}.`);
      setStatusMessage(`Error starting ${modelToStart}`);
      if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
    } finally {
      setModelActionState('idle');
    }
  };

  const handleStopRunningModel = async () => {
    if (!runningModel || modelActionState !== 'idle') return;
    const target = runningModel;
    const endpoint = getCleanEndpoint();
    setModelActionState('stopping');
    setStatusMessage(`Stopping ${target}...`);
    setOllamaError(null);

    try {
      await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: target, keep_alive: 0 })
      });
    } catch {}

    setRunningModel('');
    setModelActionState('idle');
    setStatusMessage(`Ready (${target} is installed)`);
    if (latestSettingsRef.current?.apiProvider === 'ollama' && setApiStatus) setApiStatus('invalid');
  };

  const handleInstallAndStartModel = async () => {
    if (!selectedModel || modelActionState !== 'idle') return;
    const target = selectedModel;
    const endpoint = getCleanEndpoint();
    const abortController = new AbortController();
    pullAbortRef.current = abortController;

    setModelActionState('installing');
    setInstallProgress(0);
    setStatusMessage(`Installing ${target}... (Pulling manifest)`);
    setOllamaError(null);

    try {
      const res = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target, stream: true }),
        signal: abortController.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed to download ${target} (HTTP ${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.error) throw new Error(evt.error);
              if (evt.total && evt.completed) {
                const pct = Math.min(100, Math.round((evt.completed / evt.total) * 100));
                const doneGB = (evt.completed / (1024 ** 3)).toFixed(2);
                const totalGB = (evt.total / (1024 ** 3)).toFixed(2);
                setInstallProgress(pct);
                setStatusMessage(`Installing ${target}... ${pct}% (${doneGB} GB / ${totalGB} GB)`);
              } else if (evt.status) {
                setStatusMessage(`Installing ${target}: ${evt.status}`);
              }
            } catch (parseErr) {
              if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
            }
          }
        }
      }

      pullAbortRef.current = null;
      setInstallProgress(null);

      await syncOllamaState(endpoint);
      await startSelectedModelInMemory(target);
    } catch (err) {
      pullAbortRef.current = null;
      setInstallProgress(null);
      setModelActionState('idle');
      if (err?.name === 'AbortError') {
        setStatusMessage(`Installation of ${target} cancelled`);
      } else {
        setOllamaError(err?.message || `Failed to install ${target}.`);
        setStatusMessage(`Failed to install ${target}`);
      }
    }
  };

  const handleCancelModelInstall = () => {
    if (pullAbortRef.current) {
      pullAbortRef.current.abort();
      pullAbortRef.current = null;
    }
  };

  const handleModelPrimaryAction = async () => {
    if (!isOllamaRunning || ollamaActionState !== 'idle') return;
    if (modelActionState === 'installing') {
      handleCancelModelInstall();
      return;
    }
    if (modelActionState !== 'idle') return;

    if (runningModel) {
      await handleStopRunningModel();
    } else if (isModelInstalled(selectedModel)) {
      await startSelectedModelInMemory(selectedModel);
    } else {
      await handleInstallAndStartModel();
    }
  };

  const handleUninstallModel = async () => {
    if (!isOllamaRunning || !selectedUninstallModel || modelActionState !== 'idle' || ollamaActionState !== 'idle') return;
    if (isTagCurrentlyRunning(selectedUninstallModel)) return;

    const target = selectedUninstallModel;
    const endpoint = getCleanEndpoint();
    setModelActionState('uninstalling');
    setStatusMessage(`Uninstalling ${target}...`);
    setOllamaError(null);

    try {
      const targetEntry = rawInstalledEntries.find((e) => e.name.toLowerCase() === target.toLowerCase());
      const targetDigest = targetEntry?.digest || '';

      const tagsToDelete = rawInstalledEntries
        .filter((e) => {
          const isExactTarget = e.name.toLowerCase() === target.toLowerCase();
          const isDuplicateLatestWithSameHash =
            targetDigest && e.digest === targetDigest && e.name.toLowerCase().endsWith(':latest');
          return isExactTarget || isDuplicateLatestWithSameHash;
        })
        .map((e) => e.name);

      if (tagsToDelete.length === 0) tagsToDelete.push(target);

      for (const tagToRemove of tagsToDelete) {
        const res = await fetch(`${endpoint}/api/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagToRemove })
        });

        if (!res.ok && tagToRemove.toLowerCase() === target.toLowerCase()) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `Failed to uninstall ${target} (HTTP ${res.status})`);
        }
      }

      const deletedLowerSet = new Set(tagsToDelete.map((t) => t.toLowerCase()));
      setRawInstalledEntries((prev) => prev.filter((e) => !deletedLowerSet.has(e.name.toLowerCase())));
      setStatusMessage(runningModel ? `${runningModel} is Running` : `Uninstalled ${target}`);
    } catch (err) {
      setOllamaError(err?.message || `Failed to uninstall ${target}.`);
      setStatusMessage(`Failed to uninstall ${target}`);
    } finally {
      setModelActionState('idle');
    }
  };

  // ---------------- CLOUD API KEYS HANDLERS ----------------
  const normalizeKeyEntry = (entry) => {
    if (!entry) return { key: '', name: '' };
    if (typeof entry === 'string') return { key: entry.trim(), name: '' };
    return { key: String(entry.key || '').trim(), name: String(entry.name || '').trim() };
  };

  const handleSaveKey = () => {
    const trimmedKey = newKeyInput.trim();
    if (!trimmedKey) return;
    const trimmedName = newKeyName.trim();

    const providerKeyField = currentProvider === 'gemini' ? 'geminiApiKey' : currentProvider === 'openai' ? 'openaiApiKey' : 'claudeApiKey';
    const providerListField = currentProvider === 'gemini' ? 'savedGeminiKeys' : currentProvider === 'openai' ? 'savedOpenaiKeys' : 'savedClaudeKeys';
    const byokStorageKey = currentProvider === 'gemini' ? 'BYOK_GEMINI_KEY' : currentProvider === 'openai' ? 'BYOK_OPENAI_KEY' : 'BYOK_CLAUDE_KEY';

    const existing = (settings[providerListField] || []).map(normalizeKeyEntry);
    const existingIdx = existing.findIndex((k) => k.key === trimmedKey);
    let updated;
    if (existingIdx >= 0) {
      updated = [...existing];
      if (trimmedName) updated[existingIdx] = { key: trimmedKey, name: trimmedName };
    } else {
      updated = [{ key: trimmedKey, name: trimmedName }, ...existing];
    }

    setSettings((prev) => ({
      ...prev,
      apiKey: currentProvider === 'gemini' ? trimmedKey : prev.apiKey,
      [providerKeyField]: trimmedKey,
      [providerListField]: updated
    }));
    localStorage.setItem(byokStorageKey, trimmedKey);
    setNewKeyInput('');
    setNewKeyName('');
  };

  const handleSelectKey = (keyString) => {
    if (currentProvider === 'gemini') {
      setSettings((prev) => ({ ...prev, apiKey: keyString, geminiApiKey: keyString }));
      localStorage.setItem('BYOK_GEMINI_KEY', keyString);
    } else if (currentProvider === 'openai') {
      setSettings((prev) => ({ ...prev, openaiApiKey: keyString }));
      localStorage.setItem('BYOK_OPENAI_KEY', keyString);
    } else if (currentProvider === 'claude') {
      setSettings((prev) => ({ ...prev, claudeApiKey: keyString }));
      localStorage.setItem('BYOK_CLAUDE_KEY', keyString);
    }
  };

  const handleRenameKey = (keyString, newName) => {
    const providerListField = currentProvider === 'gemini' ? 'savedGeminiKeys' : currentProvider === 'openai' ? 'savedOpenaiKeys' : 'savedClaudeKeys';
    const existing = (settings[providerListField] || []).map(normalizeKeyEntry);
    const updated = existing.map((k) => (k.key === keyString ? { ...k, name: newName.trim() } : k));
    setSettings((prev) => ({
      ...prev,
      [providerListField]: updated
    }));
    setEditingKeyIndex(null);
  };

  const handleDeleteKey = (keyToDelete) => {
    const providerKeyField = currentProvider === 'gemini' ? 'geminiApiKey' : currentProvider === 'openai' ? 'openaiApiKey' : 'claudeApiKey';
    const providerListField = currentProvider === 'gemini' ? 'savedGeminiKeys' : currentProvider === 'openai' ? 'savedOpenaiKeys' : 'savedClaudeKeys';
    const byokStorageKey = currentProvider === 'gemini' ? 'BYOK_GEMINI_KEY' : currentProvider === 'openai' ? 'BYOK_OPENAI_KEY' : 'BYOK_CLAUDE_KEY';

    const existing = (settings[providerListField] || []).map(normalizeKeyEntry);
    const updated = existing.filter((k) => k.key !== keyToDelete);
    const fallbackKey = updated[0]?.key || '';

    setSettings((prev) => ({
      ...prev,
      apiKey: currentProvider === 'gemini' ? fallbackKey : prev.apiKey,
      [providerKeyField]: fallbackKey,
      [providerListField]: updated
    }));
    localStorage.setItem(byokStorageKey, fallbackKey);
  };

  const getProviderInfo = () => {
    if (currentProvider === 'gemini') return { label: 'Gemini', model: 'gemini-3-flash-preview', hasKey: !!(settings.geminiApiKey || settings.apiKey || (typeof window !== 'undefined' && localStorage.getItem('BYOK_GEMINI_KEY'))) };
    if (currentProvider === 'openai') return { label: 'ChatGPT', model: settings.openaiModel || 'gpt-4o-mini', hasKey: !!settings.openaiApiKey };
    if (currentProvider === 'claude') return { label: 'Claude', model: settings.claudeModel || 'claude-3-5-sonnet', hasKey: !!settings.claudeApiKey };
    return { label: 'Ollama', model: String(runningModel || settings.localModel || 'gemma4:e4b'), hasKey: true };
  };

  const renderBadge = () => {
    const info = getProviderInfo();

    if (!info.hasKey) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-warning shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5" /> Missing API Key
        </span>
      );
    }
    if (apiStatus === 'checking') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-checking shadow-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {info.label} (Checking...)
        </span>
      );
    }
    if (apiStatus === 'invalid' || apiStatus === 'missing' || (currentProvider === 'ollama' && (!isOllamaRunning || !runningModel))) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-error shadow-sm">
          <XCircle className="w-3.5 h-3.5" /> {currentProvider === 'ollama' ? 'Local AI Offline' : 'Wrong API Key'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 status-badge-valid shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5" /> {info.label} ({info.model})
      </span>
    );
  };

  const renderSavedKeysList = (savedKeys = [], activeKey = '') => (
    <div>
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Saved API Keys:</span>
      {savedKeys.length === 0 ? (
        <p className="text-xs text-gray-500 italic p-2 border border-dashed border-[#30363d] rounded text-center">
          No keys saved yet. Paste your key above and click Save.
        </p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {savedKeys.map((item, i) => {
            const entry = normalizeKeyEntry(item);
            const isSelected = activeKey === entry.key;
            const masked = entry.key.length > 20 ? `${entry.key.substring(0, 8)}••••••••${entry.key.substring(entry.key.length - 6)}` : entry.key;
            const isEditingThis = editingKeyIndex === i;

            return (
              <div
                key={i}
                onClick={() => !isEditingThis && handleSelectKey(entry.key)}
                className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer text-xs transition-all ${
                  isSelected ? 'saved-item-active font-semibold shadow-sm' : 'border-[#30363d] bg-[#161b22] text-gray-400 hover:border-gray-500'
                }`}
              >
                {isEditingThis ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editNameInput}
                      onChange={(e) => setEditNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameKey(entry.key, editNameInput);
                        if (e.key === 'Escape') setEditingKeyIndex(null);
                      }}
                      placeholder="Enter key name..."
                      autoFocus
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameKey(entry.key, editNameInput)}
                      className="p-1 btn-saved-action transition-colors"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5 rename-check-icon" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKeyIndex(null)}
                      className="p-1 btn-saved-action transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'saved-item-dot' : 'saved-item-dot-inactive'}`}></span>
                    {entry.name ? (
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="font-semibold text-xs saved-item-name truncate">{entry.name}</span>
                        <span className="text-[11px] font-mono text-gray-500 truncate">({masked})</span>
                      </div>
                    ) : (
                      <span className="font-mono truncate">{masked}</span>
                    )}
                    {isSelected && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {!isEditingThis && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingKeyIndex(i);
                        setEditNameInput(entry.name || '');
                      }}
                      className="p-1 btn-saved-action text-gray-500 transition-colors"
                      title="Rename key"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteKey(entry.key); }}
                    className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const getActiveKey = () => {
    if (currentProvider === 'gemini') return settings.geminiApiKey || settings.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_GEMINI_KEY') : '') || '';
    if (currentProvider === 'openai') return settings.openaiApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_OPENAI_KEY') : '') || '';
    if (currentProvider === 'claude') return settings.claudeApiKey || (typeof window !== 'undefined' ? localStorage.getItem('BYOK_CLAUDE_KEY') : '') || '';
    return '';
  };

  const getSavedKeys = () => {
    if (currentProvider === 'gemini') return settings.savedGeminiKeys || [];
    if (currentProvider === 'openai') return settings.savedOpenaiKeys || [];
    if (currentProvider === 'claude') return settings.savedClaudeKeys || [];
    return [];
  };

  const rawFamilyModels = dynamicCatalog[selectedFamily] || [];
  const currentFamilyModels = rawFamilyModels.length > 0
    ? rawFamilyModels.map((m) => ({
        value: m.value,
        label: m.label,
        badge: isOllamaRunning && isModelInstalled(m.value) ? 'Installed' : null
      }))
    : [{ value: selectedModel || 'N/A', label: isOllamaRunning ? 'Loading models...' : 'Start Ollama to load models' }];

  const uninstallOptions = installedModels.length > 0
    ? sortModelsList(
        installedModels.map((tag) => ({
          value: tag,
          label: formatModelDisplayLabel(tag)
        }))
      ).map((m) => {
        const isCurrentlyRunning = isTagCurrentlyRunning(m.value);
        const entry = rawInstalledEntries.find((e) => e.name.toLowerCase() === m.value.toLowerCase());
        const sizeLabel = formatDiskSize(entry?.diskBytes);
        const combinedBadge = isCurrentlyRunning
          ? (sizeLabel ? `${sizeLabel} • Running` : 'Running')
          : (sizeLabel || null);

        return {
          value: m.value,
          label: m.label,
          badge: combinedBadge,
          disabled: isCurrentlyRunning
        };
      })
    : [{ value: '', label: 'No installed models' }];

  const isSelectedUninstallRunning = isTagCurrentlyRunning(selectedUninstallModel);

  const canUninstallSelected =
    isOllamaRunning &&
    installedModels.length > 0 &&
    Boolean(selectedUninstallModel) &&
    !isSelectedUninstallRunning &&
    ollamaActionState === 'idle' &&
    modelActionState === 'idle';

  const areDropdownsLocked =
    !isOllamaRunning ||
    Boolean(runningModel) ||
    rawFamilyModels.length === 0 ||
    ollamaActionState !== 'idle' ||
    modelActionState !== 'idle';

  const isModelButtonDisabled =
    !isOllamaRunning ||
    rawFamilyModels.length === 0 ||
    ollamaActionState !== 'idle' ||
    modelActionState === 'starting' ||
    modelActionState === 'stopping' ||
    modelActionState === 'uninstalling';

  const activeTargetModel = runningModel || selectedModel;
  const shortModelName = getShortModelLabel(activeTargetModel);
  const shortUninstallName = selectedUninstallModel ? getShortModelLabel(selectedUninstallModel) : 'Model';
  const selectedIsInstalled = isModelInstalled(selectedModel);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#30363d] bg-[#0d1117]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-400" /> Application Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="modal-close-btn p-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Appearance Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#30363d] pb-2">Appearance</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-[#0d1117] p-4 rounded-md border border-[#30363d]">
                <div>
                  <p className="font-medium text-gray-200">Application Theme</p>
                  <p className="text-xs text-gray-500">Toggle between dark and light themes.</p>
                </div>
                <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => setIsDarkMode(!isDarkMode)}>
                  <span className={`text-sm font-bold ${isDarkMode ? 'theme-active-toggle' : 'text-gray-500'}`}>Dark</span>
                  <button type="button" role="switch" aria-checked={!isDarkMode} aria-label="Toggle dark and light theme" className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors border theme-toggle-track">
                    <span className={`theme-toggle-knob inline-block h-4 w-4 transform rounded-full transition-transform ${!isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm font-bold ${!isDarkMode ? 'theme-active-toggle' : 'text-gray-500'}`}>Light</span>
                </div>
              </div>

              {/* Color Scheme Variant */}
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in">
                <p className="font-medium text-gray-200 mb-3 text-sm">Color Scheme Variant</p>
                {isDarkMode ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, darkTheme: 'default' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'default' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Default Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, darkTheme: 'green' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'green' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Green on Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, darkTheme: 'red' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.darkTheme === 'red' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Red on Black
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, lightTheme: 'default' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.lightTheme === 'default' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Default Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, lightTheme: 'monochrome' }))}
                      className={`p-2.5 text-xs rounded border font-medium transition-colors ${settings.lightTheme === 'monochrome' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                    >
                      Black on White (Monochrome)
                    </button>
                  </div>
                )}
              </div>

              {/* Clock Format Selection (12h vs 24h) */}
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Clock & Timestamp Format</p>
                  <p className="text-xs text-gray-500">Controls how dates and times appear across all sessions.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, clockFormat: '12h' }))}
                    className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${settings.clockFormat !== '24h' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                  >
                    12-Hour (AM/PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, clockFormat: '24h' }))}
                    className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${settings.clockFormat === '24h' ? 'active-variant' : 'border-[#30363d] text-gray-400 hover:border-gray-500'}`}
                  >
                    24-Hour (24h)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* AI Providers Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#30363d] pb-2">AI Provider & API</h3>

            <div className="flex items-center justify-between bg-[#0d1117] p-3.5 rounded-md border border-[#30363d] mb-4">
              <div>
                <p className="font-semibold text-gray-200 text-xs uppercase tracking-wider">Current Model Status</p>
                <p className="text-[11px] text-gray-500">Live health check of your active AI model.</p>
              </div>
              {renderBadge()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  if (currentProvider !== 'gemini') {
                    if (setApiStatus) setApiStatus('checking');
                    setSettings((prev) => ({ ...prev, apiProvider: 'gemini' }));
                  }
                }}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'gemini' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Google Gemini</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentProvider !== 'openai') {
                    if (setApiStatus) setApiStatus('checking');
                    setSettings((prev) => ({ ...prev, apiProvider: 'openai' }));
                  }
                }}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'openai' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">ChatGPT (OpenAI)</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentProvider !== 'claude') {
                    if (setApiStatus) setApiStatus('checking');
                    setSettings((prev) => ({ ...prev, apiProvider: 'claude' }));
                  }
                }}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'claude' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Claude (Anthropic)</p>
                <span className="text-[10px] text-gray-500 font-normal">Cloud (BYOK)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentProvider !== 'ollama') {
                    if (setApiStatus) setApiStatus('checking');
                    setSettings((prev) => ({ ...prev, apiProvider: 'ollama' }));
                  }
                }}
                className={`p-3 rounded-md border text-left transition-all ${currentProvider === 'ollama' ? 'provider-card-active' : 'border-[#30363d] bg-[#0d1117] text-gray-400 hover:border-gray-500'}`}
              >
                <p className="text-xs">Ollama (Local)</p>
                <span className="text-[10px] text-gray-500 font-normal">100% Private</span>
              </button>
            </div>

            {currentProvider !== 'ollama' && (
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add {getProviderInfo().label} API Key
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Enter key name..."
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (!newKeyInput.trim()) {
                            keyInputRef.current?.focus();
                          } else {
                            handleSaveKey();
                          }
                        }
                      }}
                      className="sm:w-1/3 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      ref={keyInputRef}
                      type="password"
                      placeholder={currentProvider === 'gemini' ? "Paste AIzaSy..." : currentProvider === 'openai' ? "Paste sk-..." : "Paste sk-ant-..."}
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
                      className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button 
                      type="button" 
                      onClick={handleSaveKey} 
                      disabled={!newKeyInput.trim()} 
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-transparent shadow-sm shrink-0 h-10"
                    >
                      <Plus className="w-4 h-4" /> Save
                    </button>
                  </div>
                </div>

                {renderSavedKeysList(getSavedKeys(), getActiveKey())}
              </div>
            )}

            {/* Ollama Local AI Manager Section */}
            {currentProvider === 'ollama' && (
              <div className="bg-[#0d1117] p-4 rounded-md border border-[#30363d] animate-in fade-in space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Ollama Server & Model Selection
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecommendedAlert(null);
                        setShowRecommendedModal(true);
                      }}
                      title="Recommended Local Models"
                      aria-label="Recommended Local Models"
                      className="modal-close-btn p-1 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Row 1: Start/Stop Ollama + Model Family Dropdown + Model Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleToggleOllamaServer}
                        disabled={ollamaActionState !== 'idle'}
                        className={`w-full h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
                          isOllamaRunning
                            ? 'btn-stop-session'
                            : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
                        }`}
                      >
                        {ollamaActionState === 'starting' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</>
                        ) : ollamaActionState === 'stopping' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping...</>
                        ) : isOllamaRunning ? (
                          <><Square className="w-3.5 h-3.5 fill-current" /> Stop Ollama</>
                        ) : (
                          <><Play className="w-3.5 h-3.5 fill-current" /> Start Ollama</>
                        )}
                      </button>
                    </div>

                    <div className="sm:col-span-4">
                      <CustomSelect
                        value={selectedFamily}
                        onChange={handleFamilyChange}
                        options={familyOptions}
                        disabled={areDropdownsLocked}
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <CustomSelect
                        value={selectedModel}
                        onChange={handleModelChange}
                        options={currentFamilyModels}
                        disabled={areDropdownsLocked}
                        alignRight={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Start/Stop/Install <Model> Button + Live Status Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleModelPrimaryAction}
                      disabled={isModelButtonDisabled}
                      className={`w-full h-10 px-3.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
                        modelActionState === 'installing'
                          ? 'btn-cancel-action'
                          : runningModel
                          ? 'btn-stop-session'
                          : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
                      }`}
                    >
                      {modelActionState === 'starting' ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting {shortModelName}...</>
                      ) : modelActionState === 'stopping' ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping {shortModelName}...</>
                      ) : modelActionState === 'installing' ? (
                        <><Ban className="w-3.5 h-3.5 btn-cancel-icon" /> Cancel Install</>
                      ) : runningModel ? (
                        <><Square className="w-3.5 h-3.5 fill-current" /> Stop {shortModelName}</>
                      ) : selectedIsInstalled ? (
                        <><Play className="w-3.5 h-3.5 fill-current" /> Start {shortModelName}</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Install {shortModelName}</>
                      )}
                    </button>
                  </div>

                  {/* Live Status Box */}
                  <div className="sm:col-span-8 bg-[#161b22] border border-[#30363d] rounded-md px-3.5 min-h-[40px] py-2 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {(ollamaActionState !== 'idle' || modelActionState !== 'idle') ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin theme-spinner shrink-0" />
                      ) : runningModel ? (
                        <span className="w-2.5 h-2.5 rounded-full session-status-dot animate-pulse shrink-0"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full saved-item-dot-inactive shrink-0"></span>
                      )}
                      <span className="truncate text-gray-200">{statusMessage}</span>
                    </div>
                    {modelActionState === 'installing' && installProgress !== null && (
                      <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#30363d]">
                        <div
                          className="h-full tab-indicator transition-all duration-200"
                          style={{ width: `${installProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {ollamaError && (
                  <p className="text-xs font-mono ollama-error-msg flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {ollamaError}
                  </p>
                )}

                {/* Row 3: Uninstall Installed Model (Shows disk size badge; running model is grayed out and locked) */}
                <div className="pt-3 border-t border-[#30363d]">
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Manage Installed Models
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-8">
                      <CustomSelect
                        value={selectedUninstallModel}
                        onChange={(val) => setSelectedUninstallModel(val)}
                        options={uninstallOptions}
                        disabled={!isOllamaRunning || installedModels.length === 0 || ollamaActionState !== 'idle' || modelActionState !== 'idle'}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <button
                        type="button"
                        onClick={handleUninstallModel}
                        disabled={!canUninstallSelected}
                        className="w-full h-10 px-3.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors btn-stop-session"
                      >
                        {modelActionState === 'uninstalling' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uninstalling...</>
                        ) : (
                          <><Trash2 className="w-3.5 h-3.5" /> Uninstall {shortUninstallName}</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 4: Option to stop Ollama & unload model when closing ShellAssist */}
                <div className="pt-2 border-t border-[#30363d]">
                  <label className="flex items-center justify-between bg-[#161b22] p-3 rounded-md border border-[#30363d] cursor-pointer hover:border-gray-500 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-gray-200">Stop Ollama & Unload Model on App Exit</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Automatically stop the running model and Ollama background server when closing ShellAssist to free up RAM/VRAM.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.stopOllamaOnExit)}
                      onChange={(e) => setSettings((prev) => ({ ...prev, stopOllamaOnExit: e.target.checked }))}
                      className="custom-checkbox shrink-0 ml-3"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Global Option to Skip Initial Token Analysis (Fast Mode) */}
            <div className="mt-4">
              <label className="flex items-center justify-between bg-[#0d1117] p-4 rounded-md border border-[#30363d] cursor-pointer hover:border-gray-500 transition-colors">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Skip Initial Token Analysis (Fast Mode)</p>
                  <p className="text-xs text-gray-500 max-w-lg mt-1">
                    Skips generating the token-by-token hover breakdown during initial command generation to significantly speed up lightweight local models and rate-limited APIs. You can still trigger the full token breakdown anytime by clicking <strong>Full Breakdown Available</strong>.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.skipTokenAnalysis)}
                  onChange={(e) => setSettings((prev) => ({ ...prev, skipTokenAnalysis: e.target.checked }))}
                  className="custom-checkbox shrink-0 ml-3"
                />
              </label>
            </div>
          </section>

          {/* Terminal Integration Section */}
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-[#30363d] pb-2">Terminal Integration</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between bg-[#0d1117] p-4 rounded-md border border-[#30363d] cursor-pointer hover:border-gray-500 transition-colors">
                <div>
                  <p className="font-medium text-gray-200">Terminal Integration</p>
                  <p className="text-xs text-gray-500 max-w-md mt-1">
                    Enables both the <strong>Interactive Terminal</strong> tab and <strong>1-Click Command Execution</strong>. Commands requiring administrator privileges will trigger an OS-level elevation prompt.
                  </p>
                </div>
                <input type="checkbox" checked={settings.enableExecution} onChange={(e) => onToggleTerminalIntegration(e.target.checked)} className="custom-checkbox shrink-0" />
              </label>
            </div>
          </section>
        </div>
      </div>

      {/* Recommended Local Models Popup Modal */}
      {showRecommendedModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setShowRecommendedModal(false);
          }}
        >
          <div
            className="bg-[#161b22] border border-[#30363d] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#0d1117]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 header-logo shrink-0" /> Recommended Local Models for ShellAssist
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click any model below to select it in the menus (sorted with newer and larger models on top).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecommendedModal(false)}
                aria-label="Close recommendations"
                className="modal-close-btn p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={recommendedScrollRef}
              className="p-5 overflow-y-auto space-y-4 flex-1"
            >
              {recommendedAlert && (
                <div className="theme-error-banner rounded-lg p-3.5 flex items-start justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider error-title">{recommendedAlert.title}</h4>
                      <p className="text-xs mt-0.5 font-mono leading-relaxed error-msg">{recommendedAlert.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecommendedAlert(null)}
                    className="p-1 hover:opacity-80 transition-opacity"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {RECOMMENDED_OLLAMA_MODELS.map((group) => (
                <div key={group.family} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-3">
                  <div className="border-b border-[#30363d] pb-2">
                    <h4 className="text-sm font-bold text-white">{group.family}</h4>
                    <p className="text-xs text-gray-400">{group.subtitle}</p>
                  </div>
                  <div className="space-y-2.5">
                    {group.models.map((item) => {
                      const isInst = isOllamaRunning && isModelInstalled(item.tag);

                      return (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => handleSelectRecommendedModel(item.tag)}
                          className="w-full text-left bg-[#161b22] border border-[#30363d] hover:border-gray-500 rounded-md p-3 flex flex-col gap-1 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-white">
                                {formatModelDisplayLabel(item.tag)}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge">
                                {item.tier}
                              </span>
                              {isInst && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider saved-item-badge">
                                  Installed
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-gray-400">{item.ram}</span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed mt-0.5">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-[#30363d] bg-[#0d1117] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRecommendedModal(false)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold btn-modal-cancel"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;