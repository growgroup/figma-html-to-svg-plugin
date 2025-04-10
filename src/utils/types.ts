export interface ColorInfo {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PaintStyle {
  type: string;
  color?: ColorInfo;
  // その他のペイントプロパティ...
}

export interface ColorToken {
  id: string;
  name: string;
  description: string;
  paints: PaintStyle[];
}

export interface TextToken {
  id: string;
  name: string;
  description: string;
  fontName: FontName;
  fontSize: number;
  letterSpacing: LetterSpacing;
  lineHeight: LineHeight;
  paragraphIndent: number;
  paragraphSpacing: number;
  textCase: TextCase;
  textDecoration: TextDecoration;
}

export interface EffectToken {
  id: string;
  name: string;
  description: string;
  effects: Effect[];
}

export interface DesignTokens {
  colors: ColorToken[];
  texts: TextToken[];
  effects: EffectToken[];
}

export interface SelectionInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  // その他の選択要素のプロパティ...
  [key: string]: any;
}

export interface CodeGenerationOptions {
  addPrefix: boolean;
  prefix: string;
  useBEM: boolean;
  mergeCss: boolean;
}

export interface GeneratedItem {
  id: string;
  html: string;
  css?: string;
  svg?: string;
  fullContent?: string;
  width: number;
  height: number;
}

// Figma API型定義
export interface FontName {
  family: string;
  style: string;
}

export interface LetterSpacing {
  value: number;
  unit: string;
}

export interface LineHeight {
  value: number;
  unit: string;
}

export type TextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
export type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';

export interface Effect {
  type: string;
  // エフェクト固有のプロパティ...
  [key: string]: any;
} 