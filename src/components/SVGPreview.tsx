import * as React from 'react';

interface SVGPreviewProps {
  svg: string;
  html: string;
}

const SVGPreview: React.FC<SVGPreviewProps> = ({ svg, html }) => {
  const [activeTab, setActiveTab] = React.useState<'svg' | 'html'>('svg');

  return (
    <div className="svg-preview">
      <h3>結果プレビュー</h3>
      
      <div className="preview-tabs">
        <button 
          className={`tab ${activeTab === 'svg' ? 'active' : ''}`}
          onClick={() => setActiveTab('svg')}
        >
          SVG
        </button>
        <button 
          className={`tab ${activeTab === 'html' ? 'active' : ''}`}
          onClick={() => setActiveTab('html')}
        >
          HTML
        </button>
      </div>
      
      <div className="preview-content">
        {activeTab === 'svg' && (
          <div className="svg-container">
            <div className="preview-image" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="preview-code">
              <pre>{svg}</pre>
            </div>
          </div>
        )}
        
        {activeTab === 'html' && (
          <div className="html-container">
            <pre>{html}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SVGPreview; 