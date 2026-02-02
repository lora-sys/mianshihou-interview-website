/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '../..');

const nextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
