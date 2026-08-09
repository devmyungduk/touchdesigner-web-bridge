import path from 'node:path';
import type { NextConfig } from 'next';

// npm workspaces 를 쓰므로 의존성이 저장소 루트에 설치된다.
// Turbopack 의 기준 경로를 루트로 맞춰야 next 를 찾을 수 있다.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, '..'),
  },
};

export default nextConfig;
