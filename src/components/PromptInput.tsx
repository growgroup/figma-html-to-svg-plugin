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
          'モバイルフレンドリーなランディングページを作成してください。主要な機能3つと申し込みフォームを含み、コントラストの高い配色を使用します。',
          'マテリアルデザインのダッシュボード画面を作成してください。ユーザー統計、最近のアクティビティ、カレンダーコンポーネントを含みます。',
          'シンプルなSaaSサービスの料金プランページを作成してください。3つのプラン（無料、スタンダード、プロ）を比較表で表示します。'
        ];
      case 'presentation':
        return [
          'プロジェクト提案スライドを作成してください。目標、解決策、ロードマップを視覚的に表現し、企業ブランドカラーを活用します。',
          'データ分析の結果を示すスライドを作成してください。棒グラフと円グラフを用いて主要な指標を視覚化します。',
          'シンプルな会社紹介スライドを作成してください。ミッション、ビジョン、主要事業を簡潔にまとめます。'
        ];
      case 'diagram':
        return [
          'プロジェクト管理のカンバン方式を図解してください。ToDo、進行中、完了の各カラムとタスクカードを表現します。',
          'マイクロサービスアーキテクチャの概念図を作成してください。APIゲートウェイ、サービス間の通信、データベースの関係を示します。',
          'ユーザー認証フローのプロセス図を作成してください。登録、ログイン、パスワードリセットの各ステップを可視化します。'
        ];
      case 'wireframe':
        return [
          'モバイルアプリのユーザープロフィール画面の構成を作成してください。アバター、基本情報、設定メニューの配置を示します。',
          'ECサイトの商品詳細ページの設計図を作成してください。商品画像カルーセル、説明、レビュー、関連商品の配置を含みます。',
          'ダッシュボードアプリの管理画面のワイヤーフレームを作成してください。サイドナビ、ヘッダー、統計ウィジェット、データテーブルを配置します。'
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