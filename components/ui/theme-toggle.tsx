'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/shell/theme-provider'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="size-9"
    >
      {theme === 'dark' ? (
        <Sun className="size-4 transition-all" />
      ) : (
        <Moon className="size-4 transition-all" />
      )}
    </Button>
  )
}
