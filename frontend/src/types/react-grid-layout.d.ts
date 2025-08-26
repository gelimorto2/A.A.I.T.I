// Minimal TypeScript declarations for react-grid-layout to satisfy compiler
// Only the pieces used in the project are declared. Extend as needed.

declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export type Layout = LayoutItem[];

  export interface ResponsiveProps {
    className?: string;
    layouts: { [breakpoint: string]: Layout };
    cols?: { [breakpoint: string]: number };
    breakpoints?: { [breakpoint: string]: number };
    rowHeight?: number;
    margin?: [number, number];
    containerPadding?: [number, number];
    isDraggable?: boolean;
    isResizable?: boolean;
    useCSSTransforms?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    preventCollision?: boolean;
    autoSize?: boolean;
    onLayoutChange?: (currentLayout: Layout, allLayouts: { [breakpoint: string]: Layout }) => void;
    children?: React.ReactNode;
  }

  export interface WidthProviderProps {}

  export class Responsive extends React.Component<ResponsiveProps> {}

  export function WidthProvider<T extends React.ComponentType<any>>(component: T): T;
}
