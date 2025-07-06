'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useUIStore } from '../lib/store';

export function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDarkMode}
      className="w-9 h-9 rounded-full"
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4 text-gray-600" />
      )}
    </Button>
  );
} 