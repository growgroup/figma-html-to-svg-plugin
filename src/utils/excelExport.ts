import * as XLSX from 'xlsx';

// マークダウンテーブルからExcel形式に変換する関数
export function convertMarkdownTableToExcel(markdown: string): Blob {
  // テーブルを抽出
  const tables = extractTablesFromMarkdown(markdown);
  
  // Excelワークブックを作成
  const wb = XLSX.utils.book_new();
  
  // テーブルがなかった場合、テキスト全体をシートとして追加
  if (tables.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([
      ["分析結果"],
      [""],
      [markdown]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "分析結果");
  } else {
    // 各テーブルを処理
    tables.forEach((table, index) => {
      const { title, headers, rows } = parseMarkdownTable(table);
      
      // ワークシート名を設定
      const sheetName = title || `Sheet${index + 1}`;
      
      // ヘッダー行を含めたデータ配列を作成
      const data = [headers, ...rows];
      
      // ワークシートを作成
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // ヘッダー行のスタイルを設定
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cell]) continue;
        ws[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "DDDDDD" } }
        };
      }
      
      // ワークブックにワークシートを追加
      try {
        // シート名の長さは31文字までに制限
        const safeSheetName = sheetName.substring(0, 31).replace(/[*?:/\\[\]]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      } catch (error) {
        console.error(`シート追加エラー (${sheetName}):`, error);
        // フォールバックシート名を使用
        XLSX.utils.book_append_sheet(wb, ws, `Sheet${index + 1}`);
      }
    });
  }
  
  // ワークブックをBlob形式で出力
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// マークダウンからテーブルを抽出する関数
function extractTablesFromMarkdown(markdown: string): string[] {
  const tables: string[] = [];
  const lines = markdown.split('\n');
  
  let currentTable: string[] = [];
  let inTable = false;
  let lastLine = '';
  
  // テーブルの前にある見出しを取得するための変数
  let lastHeading = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 見出し行を記録
    if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) {
      lastHeading = line.replace(/^#+\s+/, '').trim();
    }
    
    // テーブルの開始行（|---|---|のようなセパレータ行の前の行）を検出
    if (!inTable && line.includes('|') && line.trim().startsWith('|') && 
        i + 1 < lines.length && lines[i + 1].includes('|') && 
        lines[i + 1].includes('-') && lines[i + 1].trim().startsWith('|')) {
      inTable = true;
      // テーブルの前の見出しをタイトルとして使用
      if (lastHeading) {
        currentTable.push(`# ${lastHeading}`);
      }
      currentTable.push(line);
    }
    // テーブルのセパレータ行または通常行
    else if (inTable && line.includes('|') && line.trim().startsWith('|')) {
      currentTable.push(line);
    }
    // テーブル終了（空行または次の見出し行）
    else if (inTable && (line.trim() === '' || line.startsWith('#'))) {
      inTable = false;
      tables.push(currentTable.join('\n'));
      currentTable = [];
    }
    // テーブル内容の継続
    else if (inTable) {
      currentTable.push(line);
    }
    
    lastLine = line;
  }
  
  // 最後のテーブルがまだ処理されていない場合
  if (inTable && currentTable.length > 0) {
    tables.push(currentTable.join('\n'));
  }
  
  return tables;
}

// マークダウンテーブルをヘッダーと行に解析する関数
function parseMarkdownTable(tableText: string): { title: string, headers: string[], rows: string[][] } {
  const lines = tableText.split('\n');
  let title = '';
  
  // タイトル行を探す（# で始まる行）
  if (lines[0].startsWith('# ') || lines[0].startsWith('## ')) {
    title = lines[0].replace(/^#+\s+/, '').trim();
    lines.shift(); // タイトル行を削除
  }
  
  // テーブルのヘッダー行とデータ行を探す
  let headerLine = '';
  let dataLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('|')) continue;
    
    if (!headerLine) {
      headerLine = line;
      // 次の行がセパレータ行なら、それをスキップ
      if (i + 1 < lines.length && lines[i + 1].includes('-')) {
        i++;
      }
    } else {
      dataLines.push(line);
    }
  }
  
  // ヘッダーをパース
  const headers = headerLine
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell !== '');
  
  // 行をパース
  const rows = dataLines.map(line => {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== '');
  });
  
  return { title, headers, rows };
} 