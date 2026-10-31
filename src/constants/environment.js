export const OS_OPTIONS = [
  'Windows', 'macOS', 'Linux',
  '──────────',
  'Docker', 'Kubernetes', 'AWS', 'Terraform'
];

export const SHELL_OPTIONS = {
  'Windows': ['PowerShell', 'CMD'],
  'macOS': ['Zsh', 'Bash', 'Fish'],
  'Linux': ['Bash', 'Fish'],
  'Docker': ['Docker CLI', 'Docker Compose'],
  'Kubernetes': ['Kubectl', 'Helm'],
  'AWS': ['AWS CLI'],
  'Terraform': ['Terraform CLI', 'HCL']
};

export const TYPE_OPTIONS = ['Command', 'Script'];