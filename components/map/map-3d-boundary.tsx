'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  label: string
  onRetry: () => void
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render-time failures inside a 3D canvas (globe or terrain block)
 * so a broken WebGL context or a thrown error inside three.js/react-three
 * shows a recoverable "failed to load" card instead of leaving the map
 * panel blank or stuck on the loading spinner forever.
 */
export class Map3DErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[MDMIS] 3D view failed to render:', error)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
    this.props.onRetry()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">{this.props.label} failed to load</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This can happen if the graphics context was lost. Try reloading the view.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
            <RotateCcw className="size-3.5" />
            Reload 3D view
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
