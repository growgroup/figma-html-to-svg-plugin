import * as React from 'react';
import { DesignTokens } from '../utils/types';

interface TokenDisplayProps {
  tokens: DesignTokens | null;
}

const TokenDisplay: React.FC<TokenDisplayProps> = ({ tokens }) => {
  const [activeTab, setActiveTab] = React.useState<'colors' | 'texts' | 'effects'>('colors');
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!tokens) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-base font-medium text-gray-800 mb-2">デザイントークン</h3>
        <p className="text-sm text-gray-500 italic">デザイントークンが見つかりません</p>
      </div>
    );
  }

  const { colors, texts, effects } = tokens;
  const hasTokens = colors.length > 0 || texts.length > 0 || effects.length > 0;

  if (!hasTokens) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-base font-medium text-gray-800 mb-2">デザイントークン</h3>
        <p className="text-sm text-gray-500 italic">デザイントークンが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-medium text-gray-800">デザイントークン</h3>
        <button 
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '折りたたむ' : '展開する'}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="flex border-b border-gray-200 mb-3">
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'colors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('colors')}
            >
              カラー ({colors.length})
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'texts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('texts')}
            >
              テキスト ({texts.length})
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'effects' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('effects')}
            >
              エフェクト ({effects.length})
            </button>
          </div>

          <div className="token-content">
            {activeTab === 'colors' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {colors.map(color => (
                  <div key={color.id} className="flex items-center p-2 border border-gray-200 rounded-md">
                    <div 
                      className="w-6 h-6 rounded-full mr-2 border border-gray-300" 
                      style={{ 
                        backgroundColor: color.paints[0]?.type === 'SOLID' && color.paints[0].color ? 
                          `rgba(${color.paints[0].color.r}, ${color.paints[0].color.g}, ${color.paints[0].color.b}, ${color.paints[0].color.a})` : 
                          'transparent' 
                      }}
                    />
                    <div className="text-sm truncate">{color.name}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'texts' && (
              <div className="space-y-2">
                {texts.map(text => (
                  <div key={text.id} className="p-2 border border-gray-200 rounded-md">
                    <div className="font-medium text-sm">{text.name}</div>
                    <div className="text-xs text-gray-600">
                      {text.fontName?.family}, {text.fontSize}px
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="space-y-2">
                {effects.map(effect => (
                  <div key={effect.id} className="p-2 border border-gray-200 rounded-md">
                    <div className="text-sm">{effect.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TokenDisplay; 