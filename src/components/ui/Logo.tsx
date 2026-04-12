import React from 'react';
import { Shield } from 'lucide-react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-full w-full" }: LogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Shield - The foundation of protection */}
        <path
          d="M50 90C50 90 85 75 85 45V20L50 10L15 20V45C15 75 50 90 50 90Z"
          fill="url(#shieldGradient)"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Inner Shield Border - Elegance and depth */}
        <path
          d="M50 82C50 82 78 68 78 45V25L50 17L22 25V45C22 68 50 82 50 82Z"
          stroke="url(#goldGradient)"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* Central Security Icon - Moved up to make room for central text */}
        <path
          d="M50 25C46 25 43 28 43 32C43 35 45 37.5 47.5 38.5V46H52.5V38.5C55 37.5 57 35 57 32C57 28 54 25 50 25Z"
          fill="url(#goldGradient)"
          filter="url(#glow)"
          opacity="0.9"
        />

        {/* Tech Circuit Motif - Emphasizing Technology */}
        <path
          d="M30 45H40M60 45H70M50 17V22M50 82V75"
          stroke="url(#goldGradient)"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="30" cy="45" r="1" fill="url(#goldGradient)" opacity="0.6" />
        <circle cx="70" cy="45" r="1" fill="url(#goldGradient)" opacity="0.6" />

        {/* Brand Name - SEGURIDAD TABSAR - Centered and Elegant */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fill="white"
          fontSize="4.5"
          fontWeight="300"
          fontFamily="'Space Grotesk', sans-serif"
          letterSpacing="0.4em"
          opacity="0.8"
        >
          SEGURIDAD
        </text>
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fill="url(#goldGradient)"
          fontSize="8"
          fontWeight="700"
          fontFamily="'Space Grotesk', sans-serif"
          letterSpacing="0.1em"
        >
          TABSAR
        </text>

        {/* Subtle Scan Lines - Modern industrial touch */}
        <line x1="25" y1="30" x2="75" y2="30" stroke="white" strokeWidth="0.5" opacity="0.1" />
        <line x1="25" y1="40" x2="75" y2="40" stroke="white" strokeWidth="0.5" opacity="0.1" />
        <line x1="25" y1="50" x2="75" y2="50" stroke="white" strokeWidth="0.5" opacity="0.1" />
      </svg>
    </div>
  );
}
