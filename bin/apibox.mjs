#!/usr/bin/env bun

import { runCli } from '../packages/cli/dist/index.js';

process.exitCode = await runCli(process.argv.slice(2));
