import { SHELL_OPTIONS } from '../constants/environment';

export const detectHostOS = () => {
  if (typeof window === 'undefined' || !window.navigator) return 'Windows';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux') && !ua.includes('android')) return 'Linux';
  return 'Windows';
};

export const getInteractiveShellOptions = (hostOs) => {
  if (hostOs === 'WebView') return ['N/A'];
  const cleanOs = (hostOs || 'Windows').replace(/\s*\(Simulated\)/i, '').trim();
  const localShells = SHELL_OPTIONS[cleanOs] || ['PowerShell', 'CMD'];
  return [
    ...localShells,
    '──────────',
    'Docker CLI',
    'Kubectl',
    'AWS CLI',
    'Terraform CLI'
  ];
};

export const getExtension = (shell = '') => {
  const cleanShell = shell.replace(/\s*\(Elevated\)/i, '').trim();
  if (['PowerShell'].includes(cleanShell)) return '.ps1';
  if (['CMD'].includes(cleanShell)) return '.bat';
  if (['Docker Compose'].includes(cleanShell)) return '.yml';
  if (['Terraform CLI', 'HCL'].includes(cleanShell)) return '.tf';
  return '.sh'; 
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const checkRequiresElevation = (cmd = '') => {
  const lower = (cmd || '').toLowerCase();
  return (
    lower.includes('sudo ') ||
    lower.includes('runas') ||
    lower.includes('-verbrunas') ||
    lower.includes('-verb runas') ||
    lower.includes('start-vm') ||
    lower.includes('stop-vm') ||
    lower.includes('new-vm') ||
    lower.includes('remove-vm') ||
    lower.includes('set-vm') ||
    lower.includes('get-vm') ||
    lower.includes('new-smbshare') ||
    lower.includes('remove-smbshare') ||
    lower.includes('netsh ') ||
    lower.includes('diskpart') ||
    lower.includes('bcdedit') ||
    lower.includes('sfc ') ||
    lower.includes('dism ') ||
    lower.includes('chkdsk') ||
    lower.includes('format-volume') ||
    lower.includes('clear-disk') ||
    lower.includes('initialize-disk') ||
    lower.includes('new-partition') ||
    lower.includes('set-executionpolicy') ||
    lower.includes('enable-windowsoptionalfeature') ||
    lower.includes('disable-windowsoptionalfeature') ||
    lower.includes('new-netfirewallrule') ||
    lower.includes('remove-netfirewallrule') ||
    lower.includes('set-netfirewallprofile') ||
    lower.includes('new-localuser') ||
    lower.includes('remove-localuser') ||
    lower.includes('add-localgroupmember') ||
    lower.includes('net user ') ||
    lower.includes('net localgroup ') ||
    lower.includes('systemctl ') ||
    lower.includes('iptables') ||
    lower.includes('ufw ') ||
    lower.includes('apt-get install') ||
    lower.includes('apt install') ||
    lower.includes('yum install') ||
    lower.includes('dnf install') ||
    lower.includes('pacman -s') ||
    lower.includes('chmod 777 /') ||
    lower.includes('chown ') ||
    lower.includes('reg add') ||
    lower.includes('reg delete') ||
    lower.includes('sc.exe') ||
    lower.includes('restart-service') ||
    lower.includes('stop-service') ||
    lower.includes('start-service') ||
    lower.includes('set-service') ||
    lower.includes('new-service')
  );
};

// Formats timestamp into Date + Time adhering to user clock preference (12h AM/PM vs 24h)
export const formatSessionDate = (dateOrUnix, clockFormat = '12h') => {
  if (!dateOrUnix) return '';
  const d = typeof dateOrUnix === 'number' ? new Date(dateOrUnix) : new Date(dateOrUnix);
  if (isNaN(d.getTime())) return String(dateOrUnix);

  const is24h = clockFormat === '24h';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24h,
    hourCycle: is24h ? 'h23' : 'h12'
  });
};

// Dynamically converts bracketed [HH:MM:SS AM/PM] or [HH:MM:SS] timestamps in terminal transcripts to 12h or 24h
export const formatTranscriptTimestamps = (transcript = '', clockFormat = '12h') => {
  if (!transcript) return '';
  const is24h = clockFormat === '24h';

  return String(transcript).replace(
    /\[(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM|am|pm))?\]/g,
    (_match, rawH, mm, ss, ampm) => {
      let hours = parseInt(rawH, 10);
      if (isNaN(hours)) return _match;

      if (ampm) {
        const upper = ampm.toUpperCase();
        if (upper === 'PM' && hours < 12) hours += 12;
        if (upper === 'AM' && hours === 12) hours = 0;
      }

      if (is24h) {
        return `[${String(hours).padStart(2, '0')}:${mm}:${ss}]`;
      } else {
        const period = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `[${h12}:${mm}:${ss} ${period}]`;
      }
    }
  );
};