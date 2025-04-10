import * as React from 'react';
import { marked } from 'marked';

// マークダウンスタイル用のCSSをコンポーネント内で定義
const markdownStyles = `
  .markdown-content {
    color: #333;
    line-height: 1.5;
    font-size: 0.85rem;
  }
  
  .markdown-content h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.8rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid #eaecef;
    color: #24292e;
  }
  
  .markdown-content h2 {
    font-size: 1.3rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid #eaecef;
    color: #24292e;
  }
  
  .markdown-content h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.2rem;
    margin-bottom: 0.7rem;
    color: #24292e;
  }
  
  .markdown-content h4 {
    font-size: 1rem;
    font-weight: 600;
    margin-top: 1.2rem;
    margin-bottom: 0.7rem;
  }
  
  .markdown-content p {
    margin-top: 0;
    margin-bottom: 0.8rem;
    font-size: 0.85rem;
  }
  
  .markdown-content ul, .markdown-content ol {
    padding-left: 1.8rem;
    margin-top: 0;
    margin-bottom: 0.8rem;
  }
  
  .markdown-content li {
    margin-bottom: 0.2rem;
    font-size: 0.85rem;
  }
  
  .markdown-content blockquote {
    padding: 0 0.8rem;
    margin-left: 0;
    margin-right: 0;
    border-left: 0.25rem solid #dfe2e5;
    color: #6a737d;
    font-size: 0.85rem;
  }
  
  .markdown-content code {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 80%;
    background-color: rgba(27, 31, 35, 0.05);
    border-radius: 3px;
    font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
  }
  
  .markdown-content pre {
    padding: 12px;
    overflow: auto;
    font-size: 80%;
    line-height: 1.4;
    background-color: #f6f8fa;
    border-radius: 3px;
    margin-bottom: 0.8rem;
  }
  
  .markdown-content pre code {
    background-color: transparent;
    padding: 0;
    margin: 0;
    font-size: 100%;
    word-break: normal;
    white-space: pre;
    overflow: visible;
  }
  
  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.8rem 0;
    display: block;
    overflow-x: auto;
  }
  
  .markdown-content table th {
    font-weight: 600;
    text-align: left;
    background-color: #f0f3f9;
    font-size: 0.8rem;
  }
  
  .markdown-content table td {
    font-size: 0.8rem;
  }
  
  .markdown-content table th,
  .markdown-content table td {
    padding: 8px 12px;
    border: 1px solid #dfe2e5;
    white-space: nowrap;
  }
  
  .markdown-content table tr:nth-child(2n) {
    background-color: #f8f9fa;
  }
  
  .markdown-content table tr:hover {
    background-color: #f1f4f8;
  }
  
  .markdown-content hr {
    height: 0.2em;
    padding: 0;
    margin: 20px 0;
    background-color: #e1e4e8;
    border: 0;
  }
  
  .markdown-content img {
    max-width: 100%;
    box-sizing: content-box;
    background-color: #fff;
  }
`;

interface ResearchOutputProps {
  content: string;
  allowEdit?: boolean;
  onContentChange?: (content: string) => void;
  onExport?: () => void;
  onExportExcel?: () => void;
  isExporting?: boolean;
}

// Markdownオプションをカスタマイズ
marked.setOptions({
  breaks: true,        // 改行をbrタグに変換
  gfm: true            // GitHub Flavored Markdownを有効化
});

const ResearchOutput: React.FC<ResearchOutputProps> = ({
  content,
  allowEdit = false,
  onContentChange,
  onExport,
  onExportExcel,
  isExporting = false
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(content);

  React.useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleEdit = () => {
    if (!allowEdit) return;
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (onContentChange) {
      onContentChange(editContent);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <style>{markdownStyles}</style>
      
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-medium text-gray-800">分析結果</h3>
        <div className="flex gap-2">
          {allowEdit && (
            isEditing ? (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded transition-colors flex items-center gap-1"
              >
                <span>保存</span>
              </button>
            ) : (
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1"
              >
                <span>編集</span>
              </button>
            )
          )}
          {onExport && (
            <button
              onClick={onExport}
              disabled={isExporting}
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <span>{isExporting ? '出力中...' : 'Markdownで保存'}</span>
            </button>
          )}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              disabled={isExporting}
              className="px-3 py-1.5 text-xs bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <span>{isExporting ? '出力中...' : 'Excelで保存'}</span>
            </button>
          )}
        </div>
      </div>
      
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[500px] p-3 border border-gray-300 rounded-md font-mono text-sm resize-y"
          spellCheck="false"
        />
      ) : (
        <div className="markdown-preview border border-gray-200 rounded-md p-4 max-h-[500px] overflow-y-auto bg-white">
          <div 
            dangerouslySetInnerHTML={{ __html: marked(content) }} 
            className="markdown-content prose prose-sm max-w-none"
          />
        </div>
      )}
    </div>
  );
};

export default ResearchOutput; 