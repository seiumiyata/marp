// --- 初期化 ---
const marp = new Marp({ html: true });
let currentSlide = 0;
let slideCount = 0;

// --- DOM要素の取得 ---
const editorElement = document.getElementById('markdown-editor');
const previewElement = document.getElementById('preview-content');
const slideCounterElement = document.getElementById('slide-counter');

// --- CodeMirrorエディタの初期化 ---
const editor = CodeMirror.fromTextArea(editorElement, {
    mode: 'markdown',
    theme: 'material-darker',
    lineNumbers: true,
    lineWrapping: true
});

// --- コア機能 ---
const updatePreview = () => {
    const markdown = editor.getValue();
    const { html, css } = marp.render(markdown);
    
    // プレビューエリアにHTMLとCSSを適用
    previewElement.innerHTML = `<style>${css}</style>${html}`;

    const slides = previewElement.querySelectorAll('.marp-slide');
    slideCount = slides.length > 0 ? slides.length : 1;

    slides.forEach((slide, index) => {
        // 表示するスライド以外を非表示にする
        slide.style.display = (index === currentSlide) ? '' : 'none';
    });

    slideCounterElement.textContent = `${currentSlide + 1} / ${slideCount}`;
};

const changeSlide = (delta) => {
    const newSlide = currentSlide + delta;
    if (newSlide >= 0 && newSlide < slideCount) {
        currentSlide = newSlide;
        updatePreview();
    }
};

// --- イベントリスナーの登録 ---
editor.on('change', updatePreview);

document.getElementById('prev-slide').addEventListener('click', () => changeSlide(-1));
document.getElementById('next-slide').addEventListener('click', () => changeSlide(1));

// --- エクスポート機能 ---
const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

document.getElementById('save-md-btn').addEventListener('click', () => {
    const blob = new Blob([editor.getValue()], { type: 'text/markdown' });
    downloadBlob(blob, 'presentation.md');
});

document.getElementById('export-html').addEventListener('click', () => {
    const { html, css } = marp.render(editor.getValue());
    const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    downloadBlob(blob, 'presentation.html');
});

document.getElementById('export-pdf').addEventListener('click', () => {
    const { html, css } = marp.render(editor.getValue());
    const element = document.createElement('div');
    element.innerHTML = `<style>${css}</style>${html}`;
    // PDF出力の設定
    const opt = {
        margin:       0,
        filename:     'presentation.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
});

document.getElementById('export-pptx').addEventListener('click', () => {
    const pptx = new PptxGenJS();
    const slidesHtml = previewElement.querySelectorAll('.marp-slide');
    slidesHtml.forEach(slideNode => {
        const slide = pptx.addSlide();
        // ここでは単純にテキストを抽出して追加
        slide.addText(slideNode.innerText, { x: 0.5, y: 0.25, w: '90%', h: '90%', fontSize: 18 });
    });
    pptx.writeFile({ fileName: 'presentation.pptx' });
});

// --- 初期ロード時の処理 ---
editor.setValue("# ようこそ\n\n---\n\n## Marp PWA Editor\n\n- Markdownでスライドを作成できます\n- リアルタイムでプレビューが更新されます");
updatePreview();
