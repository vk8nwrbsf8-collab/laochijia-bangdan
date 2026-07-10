import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * 国内网络代理：拦截 Firebase API 请求，通过 /api/proxy 转发
 * 仅在非 localhost 环境下生效（即 Vercel 生产环境）
 * 解决 googleapis.com 在国内被封锁的问题
 */
const PROXY_HOSTS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
];

const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

if (!isLocalhost) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    try {
      const parsed = new URL(url);
      if (PROXY_HOSTS.includes(parsed.hostname)) {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        if (input instanceof Request) {
          const newReq = new Request(proxyUrl, input);
          return originalFetch(newReq, init);
        }
        return originalFetch(proxyUrl, init);
      }
    } catch {
      // 非标准 URL，直接透传
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
