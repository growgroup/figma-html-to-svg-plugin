import * as React from 'react';

export type TemplateType = 'webdesign' | 'presentation' | 'diagram' | 'wireframe';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  disabled: boolean;
  templateType: TemplateType;
  onTemplateTypeChange: (type: TemplateType) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  value, 
  onChange, 
  onGenerate, 
  disabled,
  templateType,
  onTemplateTypeChange 
}) => {
  const [showExamples, setShowExamples] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  // テンプレートタイプに基づいた例を取得する関数
  const getExamplesByType = (type: TemplateType): string[] => {
    switch (type) {
      case 'webdesign':
        return [
          'ECサイトのシンプルな商品紹介ページを作成してください。メインカラーは青で、商品画像、説明、価格情報を表示します。',
          'ポートフォリオサイトのヒーローセクションを作成してください。モダンなデザインで、名前、役職、短い自己紹介を含めます。',
          'レストランのメニューページを作成してください。フォントは優雅さを感じさせるものを使い、食品カテゴリごとに分類します。'
        ];
      case 'presentation':
        return [
          '四半期業績報告プレゼンのタイトルスライドを作成してください。会社ロゴ、タイトル、日付を含めます。',
          '新製品紹介スライドを作成してください。製品名、3つの主要機能、簡単な説明を含めます。',
          'プロジェクトタイムラインを示すスライドを作成してください。マイルストーンを視覚的に表現します。'
        ];
      case 'diagram':
        return [
          'ソフトウェア開発のワークフローを示すフローチャートを作成してください。計画から実装、テスト、デプロイまでの流れを表現します。',
          'マーケティングファネルを視覚化してください。認知、興味、検討、アクション、ロイヤルティの各段階を示します。',
          'シンプルな組織図を作成してください。CEO、部門長、チームメンバーの階層構造を表現します。'
        ];
      case 'wireframe':
        return [
          'ニュースサイトのトップページのワイヤーフレームを作成してください。ヘッダー、メインコンテンツ、サイドバー、フッターの構成を含めます。',
          'ECサイトの商品一覧ページの構成ラフを作成してください。フィルター、ソート機能、商品リスト、ページネーションを含めます。',
          'ポートフォリオサイトのシンプルな構成ラフを作成してください。ナビゲーション、作品一覧、問い合わせフォームの配置を示します。'
        ];
      default:
        return [];
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      {/* テンプレートタイプのセレクター */}
      <div className="mb-4">
        <p className="font-medium text-sm text-gray-700 mb-2">テンプレートタイプ:</p>
        <div className="flex flex-wrap gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="webdesign"
              checked={templateType === 'webdesign'}
              onChange={() => onTemplateTypeChange('webdesign')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Webデザイン</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="presentation"
              checked={templateType === 'presentation'}
              onChange={() => onTemplateTypeChange('presentation')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">プレゼン</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="diagram"
              checked={templateType === 'diagram'}
              onChange={() => onTemplateTypeChange('diagram')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">作図</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="templateType"
              value="wireframe"
              checked={templateType === 'wireframe'}
              onChange={() => onTemplateTypeChange('wireframe')}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">構成ラフ</span>
          </label>
        </div>
        
        <button 
          type="button"
          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowExamples(!showExamples)}
          disabled={disabled}
        >
          {showExamples ? '例を隠す' : 'プロンプト例を見る'}
        </button>
        
        {showExamples && (
          <div className="mt-3 bg-gray-50 p-3 rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">プロンプト例:</p>
            <ul className="space-y-2 pl-4 list-disc">
              {getExamplesByType(templateType).map((example, index) => (
                <li 
                  key={index} 
                  onClick={() => onChange(example)} 
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* プロンプト入力欄 */}
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">プロンプト:</label>
        <textarea
          id="prompt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={getPlaceholderByType(templateType)}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-100"
        />
      </div>
      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={disabled || !value}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:bg-blue-400 transition-colors"
        >
          {disabled ? '生成中...' : 'HTML生成 & SVG変換'}
        </button>
      </div>
    </form>
  );
};

// テンプレートタイプに基づいてプレースホルダーを返す関数
const getPlaceholderByType = (type: TemplateType): string => {
  switch (type) {
    case 'webdesign':
      return 'Webデザインのコンテンツを説明してください...';
    case 'presentation':
      return 'プレゼンのスライド内容を説明してください...';
    case 'diagram':
      return '作図したい図表の内容を説明してください...';
    case 'wireframe':
      return 'ワイヤーフレーム/構成ラフの内容を説明してください...';
    default:
      return 'HTMLを生成するためのプロンプトを入力してください...';
  }
};

export default PromptInput; 