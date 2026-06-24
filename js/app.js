/**
 * 截图排版工具 - 主脚本
 * 财务报销截图批量排版导出
 */

// ============================================
// 状态管理
// ============================================
const state = {
    images: [],
    settings: {
        paperSize: 'A5Landscape',
        perPage: 4,       // 每页张数
        direction: 'horizontal', // 排列方向: vertical(纵向) / horizontal(横向)
        margin: 5,
        gap: 2,
        showLabel: false,
        zoom: 1
    },
    pages: []
};

// 纸张尺寸 (mm)
const paperSizes = {
    A5Landscape: { width: 210, height: 148 },
    A5Portrait: { width: 148, height: 210 },
    A4Landscape: { width: 297, height: 210 },
    A4Portrait: { width: 210, height: 297 }
};

// 纸张名称
const paperNames = {
    A5Landscape: 'A5 横版',
    A5Portrait: 'A5 竖版',
    A4Landscape: 'A4 横版',
    A4Portrait: 'A4 竖版'
};

// mm 转 px (96dpi)
const mmToPx = 3.779527559;

// ============================================
// DOM 元素缓存
// ============================================
const $ = id => document.getElementById(id);

const dom = {
    uploadArea: null,
    fileInput: null,
    imageList: null,
    imageCount: null,
    pagesWrapper: null,
    emptyState: null,
    statsText: null,
    zoomText: null,
    progressBar: null,
    progressBarFill: null,
    toast: null,
    previewContainer: null,
    modal: null,
    modalTitleText: null,
    modalBody: null,
    modalFooter: null,
    modalCancel: null,
    modalConfirm: null,
    // 图片查看器
    imageViewer: null,
    viewerImage: null,
    viewerTitle: null,
    viewerCounter: null,
    viewerInfo: null
};

function initDom() {
    dom.uploadArea = $('uploadArea');
    dom.fileInput = $('fileInput');
    dom.imageList = $('imageList');
    dom.imageCount = $('imageCount');
    dom.pagesWrapper = $('pagesWrapper');
    dom.emptyState = $('emptyState');
    dom.statsText = $('statsText');
    dom.zoomText = $('zoomText');
    dom.progressBar = $('progressBar');
    dom.progressBarFill = $('progressBarFill');
    dom.toast = $('toast');
    dom.previewContainer = $('previewContainer');
    dom.modal = $('modal');
    dom.modalTitleText = $('modalTitleText');
    dom.modalBody = $('modalBody');
    dom.modalFooter = $('modalFooter');
    dom.modalCancel = $('modalCancel');
    dom.modalConfirm = $('modalConfirm');
    // 图片查看器
    dom.imageViewer = $('imageViewer');
    dom.viewerImage = $('viewerImage');
    dom.viewerTitle = $('viewerTitle');
    dom.viewerCounter = $('viewerCounter');
    dom.viewerInfo = $('viewerInfo');
}

// ============================================
// 工具函数
// ============================================

/**
 * 显示提示信息
 */
function showToast(message, type = 'info') {
    dom.toast.textContent = message;
    dom.toast.className = `toast toast-${type} show`;
    setTimeout(() => {
        dom.toast.classList.remove('show');
    }, 2000);
}

/**
 * 显示进度条
 */
function showProgress(percent) {
    dom.progressBar.classList.add('show');
    dom.progressBarFill.style.width = percent + '%';
}

/**
 * 隐藏进度条
 */
function hideProgress() {
    setTimeout(() => {
        dom.progressBar.classList.remove('show');
        dom.progressBarFill.style.width = '0%';
    }, 300);
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * 显示模态框
 * @param {Object} options - 配置项
 * @param {string} options.title - 标题
 * @param {string} options.content - 内容（HTML）
 * @param {Function} [options.onConfirm] - 确认回调
 * @param {string} [options.confirmText] - 确认按钮文字
 * @param {boolean} [options.showFooter] - 是否显示底部按钮
 * @param {boolean} [options.showCancel] - 是否显示取消按钮
 */
function showModal(options) {
    const {
        title,
        content,
        onConfirm,
        confirmText = '确认',
        showFooter = true,
        showCancel = true
    } = options;

    dom.modalTitleText.textContent = title;
    dom.modalBody.innerHTML = content;
    dom.modalConfirm.textContent = confirmText;

    if (showFooter) {
        dom.modalFooter.style.display = 'flex';
        dom.modalCancel.style.display = showCancel ? 'inline-block' : 'none';
    } else {
        dom.modalFooter.style.display = 'none';
    }

    dom.modal.classList.add('show');

    const handleConfirm = () => {
        closeModal();
        dom.modalConfirm.removeEventListener('click', handleConfirm);
        if (onConfirm) onConfirm();
    };

    dom.modalConfirm.addEventListener('click', handleConfirm);
}

/**
 * 关闭模态框
 */
function closeModal() {
    dom.modal.classList.remove('show');
}

// ============================================
// 图片上传
// ============================================

/**
 * 处理上传的文件
 */
function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('请选择图片文件', 'error');
        return;
    }

    let loaded = 0;
    const total = imageFiles.length;

    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                state.images.push({
                    id: Date.now() + Math.random(),
                    file: file,
                    src: e.target.result,
                    name: file.name,
                    width: img.width,
                    height: img.height,
                    size: file.size
                });
                loaded++;
                if (loaded === total) {
                    updateImageList();
                    generatePreview();
                    showToast(`已添加 ${total} 张图片`, 'success');
                }
            };
            img.onerror = () => {
                loaded++;
                if (loaded === total) {
                    updateImageList();
                    generatePreview();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * 绑定上传相关事件
 */
function bindUploadEvents() {
    // 点击上传
    dom.uploadArea.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', e => handleFiles(e.target.files));

    // 拖拽上传
    dom.uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        dom.uploadArea.classList.add('drag-over');
    });

    dom.uploadArea.addEventListener('dragleave', () => {
        dom.uploadArea.classList.remove('drag-over');
    });

    dom.uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        dom.uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // 粘贴上传
    document.addEventListener('paste', e => {
        const items = e.clipboardData.items;
        const files = [];
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    Object.defineProperty(file, 'name', {
                        value: `粘贴图片_${Date.now()}.png`,
                        writable: false
                    });
                    files.push(file);
                }
            }
        }
        if (files.length > 0) {
            handleFiles(files);
        }
    });
}

// ============================================
// 图片列表管理
// ============================================

// 当前查看的图片索引
let currentViewerIndex = 0;

/**
 * 打开图片查看器
 */
function openImageViewer(index) {
    if (state.images.length === 0) return;
    currentViewerIndex = index;
    updateViewerContent();
    dom.imageViewer.classList.add('show');
    document.addEventListener('keydown', handleViewerKeydown);
}

/**
 * 关闭图片查看器
 */
function closeImageViewer() {
    dom.imageViewer.classList.remove('show');
    document.removeEventListener('keydown', handleViewerKeydown);
}

/**
 * 更新查看器内容
 */
function updateViewerContent() {
    const img = state.images[currentViewerIndex];
    if (!img) return;
    
    dom.viewerImage.src = img.src;
    dom.viewerTitle.textContent = img.name;
    dom.viewerCounter.textContent = `${currentViewerIndex + 1} / ${state.images.length}`;
    dom.viewerInfo.textContent = `${img.width} × ${img.height} · ${formatFileSize(img.size)}`;
}

/**
 * 上一张
 */
function prevImage() {
    if (state.images.length === 0) return;
    currentViewerIndex = (currentViewerIndex - 1 + state.images.length) % state.images.length;
    updateViewerContent();
}

/**
 * 下一张
 */
function nextImage() {
    if (state.images.length === 0) return;
    currentViewerIndex = (currentViewerIndex + 1) % state.images.length;
    updateViewerContent();
}

/**
 * 键盘事件处理
 */
function handleViewerKeydown(e) {
    switch(e.key) {
        case 'ArrowLeft':
            prevImage();
            break;
        case 'ArrowRight':
            nextImage();
            break;
        case 'Escape':
            closeImageViewer();
            break;
    }
}

/**
 * 更新图片列表显示
 */
function updateImageList() {
    dom.imageCount.textContent = state.images.length + ' 张';

    if (state.images.length === 0) {
        dom.imageList.innerHTML = '<div class="empty-list">暂无图片</div>';
        $('btnExportPdf').disabled = true;
        $('btnPrint').disabled = true;
        $('btnClear').disabled = true;
        return;
    }

    $('btnExportPdf').disabled = false;
    $('btnPrint').disabled = false;
    $('btnClear').disabled = false;

    dom.imageList.innerHTML = state.images.map((img, index) => `
        <div class="thumb-item" title="${img.name}" onclick="openImageViewer(${index})">
            <img src="${img.src}" class="thumb-img" alt="${img.name}">
            <div class="thumb-index">${index + 1}</div>
            <button class="thumb-delete" onclick="event.stopPropagation(); deleteImage(${index})" title="删除">×</button>
        </div>
    `).join('');
}

/**
 * 删除指定图片
 */
function deleteImage(index) {
    state.images.splice(index, 1);
    updateImageList();
    generatePreview();
}

/**
 * 清空所有图片
 */
function clearAll() {
    if (state.images.length === 0) return;
    showModal(
        '确认清空',
        '<p>确定要清空所有已上传的图片吗？</p>',
        () => {
            state.images = [];
            updateImageList();
            generatePreview();
            showToast('已清空', 'info');
        },
        '清空'
    );
}

// ============================================
// 设置绑定
// ============================================

/**
 * 绑定设置控件事件
 */
function bindSettings() {
    // 纸张规格
    $('paperSize').addEventListener('change', e => {
        state.settings.paperSize = e.target.value;
        generatePreview();
    });

    // 每页张数
    document.querySelectorAll('.grid-option').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.grid-option').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            state.settings.perPage = parseInt(item.dataset.count);
            generatePreview();
        });
    });

    // 排列方向
    document.querySelectorAll('.seg-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.seg-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            state.settings.direction = item.dataset.dir;
            generatePreview();
        });
    });

    // 页边距
    $('margin').addEventListener('input', e => {
        state.settings.margin = parseInt(e.target.value);
        $('marginValue').textContent = e.target.value;
        generatePreview();
    });

    // 图片间距
    $('gap').addEventListener('input', e => {
        state.settings.gap = parseInt(e.target.value);
        $('gapValue').textContent = e.target.value;
        generatePreview();
    });

    // 显示序号
    $('showLabel').addEventListener('change', e => {
        state.settings.showLabel = e.target.checked;
        generatePreview();
    });
}

// ============================================
// 排版算法
// ============================================

/**
 * 计算行列数
 * @param {number} perPage - 每页张数
 * @param {string} direction - 排列方向
 * @returns {{rows: number, cols: number}}
 */
function getGridLayout(perPage, direction) {
    const layouts = {
        1: { rows: 1, cols: 1 },
        2: direction === 'vertical' ? { rows: 2, cols: 1 } : { rows: 1, cols: 2 },
        3: direction === 'vertical' ? { rows: 3, cols: 1 } : { rows: 1, cols: 3 },
        4: direction === 'vertical' ? { rows: 4, cols: 1 } : { rows: 2, cols: 2 },
        6: direction === 'vertical' ? { rows: 3, cols: 2 } : { rows: 2, cols: 3 },
        8: direction === 'vertical' ? { rows: 4, cols: 2 } : { rows: 2, cols: 4 },
        9: { rows: 3, cols: 3 }
    };
    return layouts[perPage] || { rows: 1, cols: 1 };
}

/**
 * 计算排版布局
 * @param {number} unitSize - 单位大小（px或mm）
 * @returns {Array} 分页数据
 */
function calculateLayout(unitSize) {
    const paperSize = paperSizes[state.settings.paperSize];
    const { perPage, direction, margin, gap, showLabel } = state.settings;

    const pageWidth = paperSize.width * unitSize;
    const pageHeight = paperSize.height * unitSize;
    const marginVal = margin * unitSize;
    const gapVal = gap * unitSize;
    
    // labelH：统一使用毫米单位，然后乘以 unitSize 转换
    // 预览时 4mm * 3.78 ≈ 15px，打印时 4mm * 1 = 4mm
    const labelH_mm = showLabel ? 4 : 0;
    const labelH = labelH_mm * unitSize;

    // 获取行列布局
    const { rows, cols } = getGridLayout(perPage, direction);

    // 水平方向：使用页边距
    const availWidth = pageWidth - marginVal * 2 - gapVal * (cols - 1);
    const cellWidth = availWidth / cols;

    // 垂直方向：计算可用高度（使用页边距），然后分配格子
    const availHeight = pageHeight - marginVal * 2 - gapVal * (rows - 1) - labelH * rows;
    const cellHeight = availHeight / rows;

    // 分页
    const pages = [];
    const totalPages = Math.ceil(state.images.length / perPage);

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageItems = [];
        const startIdx = pageIdx * perPage;
        const endIdx = Math.min(startIdx + perPage, state.images.length);

        for (let i = startIdx; i < endIdx; i++) {
            const img = state.images[i];
            const posInPage = i - startIdx;

            // 计算在网格中的位置
            let row, col;
            if (direction === 'vertical') {
                row = posInPage % rows;
                col = Math.floor(posInPage / rows);
            } else {
                row = Math.floor(posInPage / cols);
                col = posInPage % cols;
            }

            // 格子位置（使用页边距）
            const cellX = marginVal + col * (cellWidth + gapVal);
            const cellY = marginVal + row * (cellHeight + gapVal + labelH);

            // 按比例缩放图片以适应格子
            const imgRatio = img.width / img.height;
            const cellRatio = cellWidth / cellHeight;

            let imgW, imgH;
            if (imgRatio > cellRatio) {
                imgW = cellWidth;
                imgH = cellWidth / imgRatio;
            } else {
                imgH = cellHeight;
                imgW = cellHeight * imgRatio;
            }

            // 图片在格子内居中偏移
            const offsetX = (cellWidth - imgW) / 2;
            const offsetY = (cellHeight - imgH) / 2;

            pageItems.push({
                image: img,
                index: i + 1,
                x: cellX + offsetX,
                y: cellY + offsetY,
                width: imgW,
                height: imgH,
                labelY: cellY + cellHeight + labelH * 0.5 // label 在图片下方，间距为 labelH 的一半
            });
        }

        pages.push({ items: pageItems });
    }

    return pages;
}

// ============================================
// 预览生成
// ============================================

/**
 * 生成预览
 * @param {boolean} useMm - 是否使用mm单位（用于打印）
 */
function generatePreview(useMm = false) {
    if (state.images.length === 0) {
        dom.emptyState.style.display = 'flex';
        dom.pagesWrapper.innerHTML = '';
        dom.pagesWrapper.appendChild(dom.emptyState);
        dom.statsText.textContent = '请先上传截图';
        state.pages = [];
        return;
    }

    dom.emptyState.style.display = 'none';

    const unit = useMm ? 1 : mmToPx;
    const unitStr = useMm ? 'mm' : 'px';

    // 计算排版
    const pages = calculateLayout(unit);
    state.pages = pages;

    const paperSize = paperSizes[state.settings.paperSize];
    const { showLabel } = state.settings;

    // 渲染页面
    dom.pagesWrapper.innerHTML = pages.map((page, pageIndex) => {
        let content = '';

        page.items.forEach(item => {
            content += `
                <img src="${item.image.src}" class="page-image" 
                     style="left: ${item.x}${unitStr}; top: ${item.y}${unitStr}; width: ${item.width}${unitStr}; height: ${item.height}${unitStr};"
                     alt="截图 ${item.index}">
            `;

            if (showLabel) {
                content += `
                    <div class="page-label" 
                         style="left: ${item.x + item.width / 2}${unitStr}; top: ${item.labelY}${unitStr};">
                        ${item.index}
                    </div>
                `;
            }
        });

        if (!useMm) {
            content += `
                <div class="page-number">${pageIndex + 1} / ${pages.length}</div>
            `;
        }

        const pageStyle = useMm 
            ? `width: ${paperSize.width}mm; height: ${paperSize.height}mm;`
            : '';

        const pageClass = useMm ? 'page-print' : getPageClass();

        return `
            <div class="page-preview ${pageClass}" style="${pageStyle}">
                <div class="page-content">${content}</div>
            </div>
        `;
    }).join('');

    if (!useMm) {
        applyZoom();
    }

    // 更新统计
    dom.statsText.textContent = `${state.images.length}张 → ${pages.length}页（每页${state.settings.perPage}张）`;
}

/**
 * 获取页面CSS类名
 */
function getPageClass() {
    return {
        A5Landscape: 'page-a5-landscape',
        A5Portrait: 'page-a5-portrait',
        A4Landscape: 'page-a4-landscape',
        A4Portrait: 'page-a4-portrait'
    }[state.settings.paperSize];
}

// ============================================
// 缩放控制
// ============================================

/**
 * 应用缩放
 */
function applyZoom() {
    const zoom = state.settings.zoom;
    const pagePreviews = dom.pagesWrapper.querySelectorAll('.page-preview');
    pagePreviews.forEach(page => {
        page.style.transform = `scale(${zoom})`;
        page.style.transformOrigin = 'top center';
    });
    dom.zoomText.textContent = Math.round(zoom * 100) + '%';
}

/**
 * 绑定缩放事件
 */
function bindZoomEvents() {
    $('zoomIn').addEventListener('click', () => {
        state.settings.zoom = Math.min(2, state.settings.zoom + 0.1);
        applyZoom();
    });

    $('zoomOut').addEventListener('click', () => {
        state.settings.zoom = Math.max(0.3, state.settings.zoom - 0.1);
        applyZoom();
    });

    // Ctrl + 滚轮缩放
    dom.previewContainer.addEventListener('wheel', e => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                state.settings.zoom = Math.min(2, state.settings.zoom + 0.1);
            } else {
                state.settings.zoom = Math.max(0.3, state.settings.zoom - 0.1);
            }
            applyZoom();
        }
    });
}

// ============================================
// PDF 导出
// ============================================

/**
 * 获取排版信息HTML（用于确认对话框）
 */
function getLayoutInfoHtml() {
    const { perPage, direction, margin, gap, showLabel, paperSize } = state.settings;
    const dirText = direction === 'vertical' ? '纵向排列' : '横向排列';
    const totalPages = state.pages.length;

    return `
        <p>请确认以下排版信息：</p>
        <div class="info-row">
            <span class="info-label">图片数量</span>
            <span class="info-value">${state.images.length} 张</span>
        </div>
        <div class="info-row">
            <span class="info-label">纸张规格</span>
            <span class="info-value">${paperNames[paperSize]}</span>
        </div>
        <div class="info-row">
            <span class="info-label">每页张数</span>
            <span class="info-value">${perPage} 张</span>
        </div>
        <div class="info-row">
            <span class="info-label">排列方向</span>
            <span class="info-value">${dirText}</span>
        </div>
        <div class="info-row">
            <span class="info-label">总页数</span>
            <span class="info-value">${totalPages} 页</span>
        </div>
        <div class="info-row">
            <span class="info-label">显示序号</span>
            <span class="info-value">${showLabel ? '是' : '否'}</span>
        </div>
    `;
}

/**
 * 导出 PDF
 */
async function exportPdf() {
    if (typeof jspdf === 'undefined') {
        showToast('PDF库加载失败，请检查网络', 'error');
        return;
    }

    const { jsPDF } = jspdf;
    const paperSize = paperSizes[state.settings.paperSize];
    const { margin, gap, showLabel, perPage, direction } = state.settings;

    showProgress(10);

    try {
        // 创建PDF（单位 mm）
        const pdf = new jsPDF({
            orientation: paperSize.width > paperSize.height ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [paperSize.width, paperSize.height]
        });

        showProgress(20);

        // 计算排版（mm单位）
        const pages = calculateLayout(1);

        showProgress(40);

        // 逐页渲染
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            if (pageIndex > 0) {
                pdf.addPage();
            }

            const page = pages[pageIndex];

            for (const item of page.items) {
                // 添加图片
                try {
                    pdf.addImage(item.image.src, 'PNG', item.x, item.y, item.width, item.height);
                } catch (err) {
                    console.error('添加图片失败:', err);
                }

                // 添加标签
                if (showLabel) {
                    pdf.setFontSize(8);
                    pdf.setTextColor(153, 153, 153);
                    const label = String(item.index);
                    const labelX = item.x + item.width / 2;
                    const labelY = item.labelY + 1.5; // 略微下移，避免与图片重叠
                    pdf.text(label, labelX, labelY, { align: 'center' });
                }
            }

            showProgress(40 + (pageIndex + 1) / pages.length * 50);
        }

        showProgress(95);

        // 保存
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Date.now().toString().slice(-6);
        const fileName = `截图排版_${dateStr}_${randomStr}.pdf`;
        pdf.save(fileName);

        showProgress(100);
        showToast('PDF 导出成功', 'success');
    } catch (err) {
        console.error('PDF导出失败:', err);
        showToast('PDF 导出失败: ' + err.message, 'error');
    } finally {
        hideProgress();
    }
}

// ============================================
// 打印
// ============================================

/**
 * 打印
 */
function printPages() {
    if (state.images.length === 0) return;

    // 显示打印设置提示
    const tipsHtml = `
        <div class="print-tips">
            <div class="print-tip-icon">⚠️</div>
            <div class="print-tip-title">打印设置提醒</div>
            <div class="print-tip-content">
                <p>为确保打印效果与预览一致，请在打印对话框中设置：</p>
                <ul class="print-tip-list">
                    <li><strong>边距</strong>：选择「<span class="tip-highlight">无边距</span>」或「<span class="tip-highlight">最小</span>」</li>
                    <li><strong>缩放</strong>：选择「<span class="tip-highlight">实际大小</span>」（100%）或「<span class="tip-highlight">自定义缩放</span>」</li>
                    <li><strong>纸张</strong>：确认与设置一致（${paperNames[state.settings.paperSize]}）</li>
                </ul>
                <p class="print-tip-note">💡 大多数打印机无法打印到纸张边缘，如仍有空白，可适当增加页边距设置。</p>
            </div>
        </div>
    `;

    showModal({
        title: '打印设置',
        content: tipsHtml,
        confirmText: '开始打印',
        showCancel: true,
        onConfirm: () => {
            doPrint();
        }
    });
}

/**
 * 执行打印
 */
function doPrint() {
    // 动态设置打印纸张规格
    const paperSize = paperSizes[state.settings.paperSize];
    const styleId = 'print-page-style';
    let styleEl = document.getElementById(styleId);
    
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
        @page {
            size: ${paperSize.width}mm ${paperSize.height}mm;
            margin: 0;
        }
    `;

    // 打印前用mm单位重新渲染，确保尺寸精确
    generatePreview(true);

    // 监听打印完成，恢复预览
    const afterPrint = () => {
        generatePreview(false);
        window.removeEventListener('afterprint', afterPrint);
    };
    window.addEventListener('afterprint', afterPrint);

    window.print();
}

// ============================================
// 使用指南
// ============================================

/**
 * 显示使用指南
 */
function showGuide() {
    const guideHtml = `
        <div class="guide-content">
            <div class="guide-section">
                <h3>快速上手</h3>
                <div class="guide-steps">
                    <div class="guide-step">点击上传区域或拖拽图片到上传框，也可以使用 <strong>Ctrl+V</strong> 粘贴截图</div>
                    <div class="guide-step">在左侧设置纸张规格、每页张数、排列方向等参数</div>
                    <div class="guide-step">右侧实时预览排版效果，可使用缩放按钮或 <strong>Ctrl+滚轮</strong> 调整大小</div>
                    <div class="guide-step">点击「导出 PDF」保存文件，或点击「打印」直接打印</div>
                </div>
            </div>

            <div class="guide-section">
                <h3>上传图片</h3>
                <p>• <strong>点击上传</strong>：点击上传区域选择图片文件</p>
                <p>• <strong>拖拽上传</strong>：将图片文件直接拖到上传框</p>
                <p>• <strong>粘贴上传</strong>：截图后按 Ctrl+V 快速粘贴</p>
                <p>• 支持 JPG、PNG、GIF、WebP 等常见图片格式</p>
                <p>• 可一次选择多张图片批量上传</p>
            </div>

            <div class="guide-section">
                <h3>排版设置</h3>
                <p>• <strong>纸张规格</strong>：支持 A5/A4 横版和竖版</p>
                <p>• <strong>每页张数</strong>：1~9 张图片自由选择</p>
                <p>• <strong>排列方向</strong>：横向从左到右，纵向从上到下</p>
                <p>• <strong>页边距</strong>：调整图片与纸张边缘的距离</p>
                <p>• <strong>图片间距</strong>：调整图片之间的间隔</p>
                <p>• <strong>显示序号</strong>：在每张图片下方显示编号</p>
            </div>

            <div class="guide-section">
                <h3>导出与打印</h3>
                <p>• <strong>导出 PDF</strong>：生成高清 PDF 文件，便于保存和分享</p>
                <p>• <strong>直接打印</strong>：调用系统打印机直接打印</p>
                <p>• 打印前建议先预览，确认排版效果</p>
            </div>

            <div class="guide-section">
                <h3>小技巧</h3>
                <div class="guide-tip">
                    <strong>💡 提示：</strong>财务报销推荐使用 A5 横版 + 每页4张的组合，既清晰又节省纸张。
                </div>
                <p style="margin-top: 10px;">• 鼠标悬停在缩略图上可查看文件名</p>
                <p>• 点击缩略图右上角的 × 可删除单张图片</p>
                <p>• 所有操作均在本地完成，图片不会上传到服务器</p>
            </div>
        </div>
    `;

    showModal({
        title: '📖 使用指南',
        content: guideHtml,
        showFooter: true,
        showCancel: false,
        confirmText: '我知道了',
        onConfirm: null
    });
}

// ============================================
// 按钮绑定
// ============================================

function bindButtonEvents() {
    $('btnExportPdf').addEventListener('click', exportPdf);
    $('btnPrint').addEventListener('click', printPages);
    $('btnClear').addEventListener('click', clearAll);
}

// ============================================
// 初始化
// ============================================

function init() {
    initDom();
    bindUploadEvents();
    bindSettings();
    bindZoomEvents();
    bindButtonEvents();
    updateImageList();
    generatePreview();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
