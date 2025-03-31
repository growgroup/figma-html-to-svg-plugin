import * as React from 'react';

interface SVGPreviewProps {
  svg: string;
  html: string;
}

const SVGPreview: React.FC<SVGPreviewProps> = ({ svg, html }) => {
  const [activeTab, setActiveTab] = React.useState<'svg' | 'html'>('svg');

  // ファイルをダウンロードする関数
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    // Blobオブジェクトを作成
    const blob = new Blob([content], { type: contentType });
    // オブジェクトURLを作成
    const url = URL.createObjectURL(blob);
    
    // aタグを作成してダウンロードリンクとして使用
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    // オブジェクトURLを解放
    URL.revokeObjectURL(url);
  };

  // SVGをダウンロード
  const handleDownloadSVG = () => {
    downloadFile(svg, 'generated-svg.svg', 'image/svg+xml');
  };

  // HTMLをダウンロード
  const handleDownloadHTML = () => {
    downloadFile(html, 'generated-html.html', 'text/html');
  };

  return (
    <div className="svg-preview">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-medium text-gray-800">結果プレビュー</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleDownloadSVG}
            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>SVGダウンロード</span>
          </button>
          <button
            onClick={handleDownloadHTML}
            className="px-2 py-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>HTMLダウンロード</span>
          </button>
        </div>
      </div>
      
      <div className="flex border-b border-gray-200 mb-3">
        <button 
          className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'svg' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('svg')}
        >
          SVG
        </button>
        <button 
          className={`px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'html' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('html')}
        >
          HTML
        </button>
      </div>
      
      <div className="preview-content">
        {activeTab === 'svg' && (
          <div className="svg-container">
            <div className="preview-image" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="preview-code overflow-auto max-h-72 mt-3 bg-gray-50 p-3 rounded text-xs">
              <pre>{svg}</pre>
            </div>
          </div>
        )}
        
        {activeTab === 'html' && (
          <div className="html-container overflow-auto max-h-96 bg-gray-50 p-3 rounded text-xs">
            <pre>{html}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SVGPreview; 