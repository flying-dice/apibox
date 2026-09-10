import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const extensionRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(extensionRoot, '../..');
const examplesRoot = resolve(repositoryRoot, 'examples');
const developmentRoot = resolve(tmpdir(), 'apibox-vscode-development');
const userDataRoot = resolve(developmentRoot, 'user-data');
const extensionsRoot = resolve(developmentRoot, 'extensions');
mkdirSync(userDataRoot, { recursive: true });
mkdirSync(extensionsRoot, { recursive: true });
const extensionArguments = [
  '--new-window',
  `--user-data-dir=${userDataRoot}`,
  `--extensions-dir=${extensionsRoot}`,
  `--extensionDevelopmentPath=${extensionRoot}`,
  '--extensionDevelopmentKind=local-process',
  '--disable-workspace-trust',
  '--skip-welcome',
  '--skip-release-notes',
  examplesRoot,
];

const watcher = spawn('bun', ['run', 'dev:watch'], {
  cwd: extensionRoot,
  env: process.env,
  stdio: ['inherit', 'pipe', 'inherit'],
});

let launched = false;
watcher.stdout.setEncoding('utf8');
watcher.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (!launched && chunk.includes('APIBox extension build ready')) {
    launched = true;
    launchVsCode();
  }
});

watcher.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => watcher.kill(signal));
}

function launchVsCode() {
  const candidates = [
    '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    '/usr/local/bin/code',
  ];
  const command =
    process.env.APIBOX_VSCODE_EXECUTABLE ?? candidates.find((path) => existsSync(path)) ?? 'code';
  const editor = spawn(command, extensionArguments, { detached: true, stdio: 'ignore' });
  editor.on('error', (error) => {
    console.error(`Could not launch Visual Studio Code: ${error.message}`);
    watcher.kill('SIGTERM');
  });
  editor.unref();
  console.log(`Launching an isolated APIBox Extension Host in ${examplesRoot}`);
}
