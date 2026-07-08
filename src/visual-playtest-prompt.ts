import type {
  VisualPlaytestControl,
  VisualPlaytestObservation,
  VisualPlaytestPromptInput,
  VisualPlaytestPromptMode,
  VisualPlaytestPromptPart,
  VisualPlaytestScreenshot,
  VisualPlaytestStateChannel,
} from './visual-playtest-types.js';

export function buildVisualPlaytestPrompt(input: VisualPlaytestPromptInput): string {
  const mode = input.mode ?? 'playerBlind';
  const lines = promptHeadLines(input, mode);
  if (input.observation.screenshot) {
    lines.push(`Screenshot: ${formatScreenshot(input.observation.screenshot)}`);
  }
  lines.push(...promptTailLines(input.observation, mode));
  return lines.join('\n');
}

export function buildVisualPlaytestPromptParts(
  input: VisualPlaytestPromptInput,
): VisualPlaytestPromptPart[] {
  const mode = input.mode ?? 'playerBlind';
  const head = promptHeadLines(input, mode);
  const screenshot = input.observation.screenshot;
  const source = screenshot ? screenshotSource(screenshot) : undefined;
  const hasImagePayload = source !== undefined && (source.path !== undefined || source.dataUrl !== undefined);
  if (screenshot && !hasImagePayload) {
    head.push(`Screenshot: ${formatScreenshot(screenshot)}`);
  }
  const parts: VisualPlaytestPromptPart[] = [{ type: 'text', text: head.join('\n') }];
  if (source !== undefined && hasImagePayload) {
    parts.push({ type: 'image', source });
  }
  parts.push({ type: 'text', text: promptTailLines(input.observation, mode).join('\n') });
  return parts;
}

function promptHeadLines(input: VisualPlaytestPromptInput, mode: VisualPlaytestPromptMode): string[] {
  const lines: string[] = [
    'You are playtesting a browser game through player-surface evidence.',
    `Mode: ${mode}.`,
  ];
  if (input.objective) lines.push(`Objective: ${input.objective}`);
  if (input.maxActions !== undefined) lines.push(`Maximum actions to return: ${input.maxActions}.`);
  if (input.observation.tick !== undefined) lines.push(`Simulation tick: ${input.observation.tick}`);
  return lines;
}

function promptTailLines(observation: VisualPlaytestObservation, mode: VisualPlaytestPromptMode): string[] {
  const lines: string[] = [];
  if (observation.visibleText?.length) {
    lines.push('Visible text:');
    for (const text of observation.visibleText) lines.push(`- ${text}`);
  }
  if (observation.controls?.length) {
    lines.push('Available controls:');
    for (const control of observation.controls) lines.push(`- ${formatControl(control)}`);
  }
  if (mode === 'oracleAssisted') {
    const channels = observation.state?.filter((channel) =>
      channel.audience === 'agent' && channel.redaction !== 'channel') ?? [];
    if (channels.length) {
      lines.push('Agent-visible hidden state:');
      for (const channel of channels) lines.push(`- ${formatStateChannelForPrompt(channel)}`);
    }
  }
  lines.push('Return only actions a player could take unless the host exposes a hidden-state diagnostic.');
  return lines;
}

function screenshotSource(screenshot: VisualPlaytestScreenshot): VisualPlaytestScreenshot {
  return {
    ...(screenshot.path !== undefined ? { path: screenshot.path } : {}),
    ...(screenshot.dataUrl !== undefined ? { dataUrl: screenshot.dataUrl } : {}),
    ...(screenshot.mime !== undefined ? { mime: screenshot.mime } : {}),
    ...(screenshot.width !== undefined ? { width: screenshot.width } : {}),
    ...(screenshot.height !== undefined ? { height: screenshot.height } : {}),
    ...(screenshot.alt !== undefined ? { alt: screenshot.alt } : {}),
  };
}

function formatScreenshot(screenshot: VisualPlaytestScreenshot): string {
  const source = screenshot.path ?? (screenshot.dataUrl ? '[inline data URL available]' : '[not provided]');
  const size = screenshot.width !== undefined && screenshot.height !== undefined
    ? ` ${screenshot.width}x${screenshot.height}`
    : '';
  const mime = screenshot.mime ? ` ${screenshot.mime}` : '';
  return `${source}${size}${mime}`.trim();
}

function formatControl(control: VisualPlaytestControl): string {
  const id = control.id ? `${control.id}: ` : '';
  const actions = control.actionKinds?.length ? ` actions=${control.actionKinds.join('|')}` : '';
  const enabled = control.enabled === false ? ' disabled' : '';
  const bounds = control.bounds
    ? ` bounds=${control.bounds.x},${control.bounds.y},${control.bounds.width},${control.bounds.height}`
    : '';
  return `${id}${control.label}${actions}${enabled}${bounds}`;
}

function formatStateChannelForPrompt(channel: VisualPlaytestStateChannel): string {
  const parts = [channel.label];
  const redaction = channel.redaction ?? (channel.sensitive ? 'value' : 'none');
  if (channel.summary) parts.push(channel.summary);
  if (channel.value !== undefined && redaction === 'none') parts.push(JSON.stringify(channel.value));
  if (channel.value !== undefined && redaction !== 'none') parts.push('[value redacted]');
  return parts.join(' - ');
}
