import type {NextConfig} from 'next';
import {loadEnvConfig} from '@next/env';
import path from 'node:path';

// Load the shared project-root .env while Next runs from frontend/.
loadEnvConfig(path.resolve(process.cwd(),'..'));

const nextConfig:NextConfig={outputFileTracingRoot:path.join(process.cwd())};
export default nextConfig;
