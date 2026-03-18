export const MID_DIR_NAME = '.mid';
export const CONFIG_NAME = 'config';
export const CONFIG_RELATIVE_PATH = `${MID_DIR_NAME}/${CONFIG_NAME}`;
export const LEGACY_CONFIG_NAME = 'mid.config.json';
export const LEGACY_PROJECT_CONFIG_NAME = 'mid.config';
export const CONFIG_VERSION = '1';
export const MANAGED_TOKEN = 'mid:managed';
export const CURSOR_PREFIX = 'mid-';
export const BACKUPS_DIR_NAME = 'backups';
export const STATE_DIR_NAME = 'state';
export const ADOPTED_BACKUPS_DIR_NAME = 'adopted';
export const ADOPTED_STATE_NAME = 'adopted.json';
export const INSTRUCTIONS_DIR_NAME = 'instructions';

export const ASSISTANTS = [
  { id: 'codex', label: 'Codex', defaultOutput: 'AGENTS.md' },
  { id: 'claude', label: 'Claude Code', defaultOutput: 'CLAUDE.md' },
  { id: 'cursor', label: 'Cursor', defaultOutput: '.cursor/rules' },
  { id: 'general', label: 'General', defaultOutput: 'AGENTS.md' }
];

export const GROUP_WEIGHTS = {
  general: '20',
  language: '30',
  framework: '40'
};

export const DEFAULT_OUTPUTS = {
  codex: 'AGENTS.md',
  claude: 'CLAUDE.md',
  cursor: '.cursor/rules',
  general: 'AGENTS.md'
};
