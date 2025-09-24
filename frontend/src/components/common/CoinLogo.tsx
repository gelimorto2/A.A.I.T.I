import React from 'react';

type CoinLogoProps = {
  symbol: string;
  size?: number;
  style?: React.CSSProperties;
};

const svgs: Record<string, React.ReactNode> = {
  BTC: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path fill="#fff" d="M18.9 17.5c1.3-.3 2.2-1.1 2-2.7-.2-1.4-1.2-1.9-2.5-2.1l.5-2-1.2-.3-.5 1.9-1-.3.5-1.9-1.2-.3-.5 2-2.5-.6-.3 1.2s.9.2.9.2c.5.1.6.4.6.7l-1 3.8c0 .1-.1.4-.5.3 0 0-.9-.2-.9-.2l-.4 1.3 2.5.6-.5 2 .1.1 1.2.3.5-2 1 .3-.5 2 1.2.3.5-2c2 .5 3.5.3 3.9-1.5.2-1.5-.5-2.2-1.7-2.5zm-3.9-3.1c.6.1 2.5.4 2.8.6.4.1.5.5.5.8-.1.3-.3.7-.9.8-.6.1-3.1-.5-3.1-.5l.7-2.7zm1 5.7c-.7-.2-3.3-.8-3.3-.8l.7-2.8s2.6.6 3.2.7c.6.1 1 .5.9 1.1-.1.6-.6 1-.5 1.8 0 .1-.3.1-1 .1z"/>
    </svg>
  ),
  ETH: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path fill="#fff" d="M16 5l6.5 10-6.5 3.8L9.5 15 16 5zm0 22l6.5-9.3L16 20 9.5 17.7 16 27z"/>
    </svg>
  ),
  SOL: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#14F195"/>
      <path fill="#000" d="M10 20h12l-2 2H8l2-2zm0-4h12l-2 2H8l2-2zm0-4h12l-2 2H8l2-2z"/>
    </svg>
  ),
};

export const CoinLogo: React.FC<CoinLogoProps> = ({ symbol, size = 18, style }) => {
  const key = symbol?.toUpperCase?.() || 'UNKNOWN';
  const node = svgs[key];
  if (!node) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size,
          background: '#333',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: size * 0.55,
          fontWeight: 700,
          fontFamily: 'monospace',
          ...style,
        }}
        aria-label={`${symbol} logo`}
      >
        {key.slice(0, 1)}
      </div>
    );
  }
  return (
    <span style={{ width: size, height: size, display: 'inline-flex', ...style }}>
      {React.cloneElement(node as React.ReactElement, { width: size, height: size })}
    </span>
  );
};

export default CoinLogo;
