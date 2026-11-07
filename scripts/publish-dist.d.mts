export interface CommandResult {
  status: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
}

export function publishDist(options: {
  repository: string;
  sha: string;
  artifactPath: string;
  run?: (args: string[]) => CommandResult;
}): { asset: string; sha256: string; reused: boolean };
