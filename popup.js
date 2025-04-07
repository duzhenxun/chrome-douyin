// 版本检查配置
const GITHUB_OWNER = 'duzhenxun';
const GITHUB_REPO = 'chrome-douyin';
const VERSION_CHECK_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const CURRENT_VERSION = chrome.runtime.getManifest().version;
console.log(CURRENT_VERSION);
const UPDATE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

// 版本号比较函数
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// 下载队列管理器
class DownloadManager {
  constructor() {
    this.downloadQueue = new Map();
    this.maxConcurrent = 3; // 最大同时下载数
    this.currentDownloads = 0;
  }

  formatSize(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  async addToQueue(videoUrl, fileName, onProgress, onComplete, onError) {
    const downloadId = Math.random().toString(36).substr(2, 9);
    const downloadTask = {
      videoUrl,
      fileName,
      onProgress,
      onComplete,
      onError,
      status: 'pending'
    };

    this.downloadQueue.set(downloadId, downloadTask);
    this.processQueue();
    return downloadId;
  }

  async processQueue() {
    if (this.currentDownloads >= this.maxConcurrent) return;

    for (const [downloadId, task] of this.downloadQueue) {
      if (task.status === 'pending' && this.currentDownloads < this.maxConcurrent) {
        this.currentDownloads++;
        task.status = 'downloading';
        this.startDownload(downloadId, task);
      }
    }
  }

  async getFileSize(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return parseInt(response.headers.get('content-length') || '0');
    } catch (error) {
      console.error('获取文件大小失败:', error);
      return 0;
    }
  }

  async startDownload(downloadId, task) {
    try {
      const totalSize = await this.getFileSize(task.videoUrl);
      const response = await fetch(task.videoUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const chunks = [];
      let receivedSize = 0;

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedSize += value.length;

        // 计算下载进度
        const progress = {
          size: receivedSize,
          totalSize: totalSize,
          percent: totalSize ? Math.round((receivedSize / totalSize) * 100) : 0,
          sizeText: receivedSize < 1024 * 1024 
            ? `${(receivedSize / 1024).toFixed(1)}KB`
            : `${(receivedSize / (1024 * 1024)).toFixed(1)}MB`,
          totalSizeText: totalSize < 1024 * 1024
            ? `${(totalSize / 1024).toFixed(1)}KB`
            : `${(totalSize / (1024 * 1024)).toFixed(1)}MB`
        };
        task.onProgress(progress);
      }

      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${task.fileName}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      this.downloadQueue.delete(downloadId);
      this.currentDownloads--;
      task.onComplete();
      this.processQueue();
    } catch (error) {
      console.error('下载失败:', error);
      this.downloadQueue.delete(downloadId);
      this.currentDownloads--;
      task.onError(error);
      this.processQueue();
    }
  }

  cancelDownload(downloadId) {
    const task = this.downloadQueue.get(downloadId);
    if (task && task.status === 'pending') {
      this.downloadQueue.delete(downloadId);
    }
  }
}

// 创建下载管理器实例
const downloadManager = new DownloadManager();

// 检查新版本
async function checkUpdate() {
  try {
    const response = await fetch(VERSION_CHECK_URL);
    const data = await response.json();

    if (data.tag_name) {
      const latestVersion = data.tag_name.replace('v', '');
      if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
        // 显示更新提示
        const updateModal = document.getElementById('updateModal');
        const updateMessage = updateModal.querySelector('.update-message');
        updateMessage.innerHTML = `当前版本：${CURRENT_VERSION}<br>最新版本：${latestVersion}<br>发布时间：${new Date(data.published_at).toLocaleDateString()}<br><br>更新内容：<br>${data.body ? data.body.replace(/\n/g, '<br>') : '暂无更新内容'}`;
        updateModal.style.display = 'block';
        
        // 更新扩展图标
        chrome.action.setBadgeText({ text: '↑'});
        chrome.action.setBadgeTextColor({ color: '#000000' });
        chrome.action.setBadgeBackgroundColor({ color: '#FFCC00' });
      }
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 显示当前版本号
  document.getElementById('currentVersion').textContent = CURRENT_VERSION;

  // 初始化更新按钮事件
  const updateNow = document.getElementById('updateNow');
  const updateLater = document.getElementById('updateLater');
  const updateModal = document.getElementById('updateModal');

  updateNow.addEventListener('click', () => {
    window.open(UPDATE_URL, '_blank');
    updateModal.style.display = 'none';
  });

  updateLater.addEventListener('click', () => {
    updateModal.style.display = 'none';
  });

  // 检查更新
  checkUpdate();

  const shareTextInput = document.getElementById('shareText');
  const parseBtn = document.getElementById('parseBtn');
  const pasteBtn = document.getElementById('pasteButton');
  const videoInfo = document.getElementById('videoInfo');
  const errorMsg = document.getElementById('errorMsg');
  const authorAvatar = document.getElementById('authorAvatar');
  const authorName = document.getElementById('authorName');
  const authorSignature = document.getElementById('authorSignature');
  const videoDesc = document.getElementById('videoDesc');
  const videoPlayer = document.getElementById('videoPlayer');
  const playBtn = document.getElementById('playBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const videoDuration = document.getElementById('videoDuration');
  const historyBtn = document.getElementById('historyBtn');
  const historyModal = document.getElementById('historyModal');
  const closeHistory = document.getElementById('closeHistory');
  const clearHistory = document.getElementById('clearHistory');
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading';
  loadingEl.innerHTML = '<div class="loading-spinner"></div><div style="margin-top: 10px">正在解析视频...</div>';
  document.querySelector('.container').insertBefore(loadingEl, videoInfo);

  let currentVideoUrl = '';
  let historyRecords = [];
  const MAX_HISTORY = 100;
  const historyItems = document.getElementById('historyItems');

  let currentPage = 1;
  const itemsPerPage = 10;

  // 渲染历史记录列表
  function renderHistory() {
    historyItems.innerHTML = '';
    const totalRecords = historyRecords.length;
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    
    // 更新历史记录标题
    const historyTitle = document.querySelector('.history-title');
    historyTitle.textContent = `历史记录 (共${totalRecords}条，${totalPages}页)`;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageRecords = historyRecords.slice(startIndex, endIndex);

    pageRecords.forEach((record, index) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      const videoData = record.videoData;
      const additionalData = videoData.additional_data[0];
      
      const infoContainer = document.createElement('div');
      infoContainer.className = 'history-info-container';
      infoContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
      
      const title = document.createElement('div');
      title.className = 'history-item-title';
      title.style.cssText = 'font-size: 14px; font-weight: 500; white-space: normal; word-break: break-word;';
      title.textContent = `#${startIndex + index + 1} ${additionalData.desc || '无标题'}`;
      
      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      meta.style.cssText = 'color: #666; font-size: 13px;';
      const date = new Date(record.timestamp);
      meta.textContent = `作者：${additionalData.nickname} · ${date.toLocaleString()}`;

    
      
      infoContainer.appendChild(title);
      infoContainer.appendChild(meta);
      
      item.appendChild(infoContainer);

        // 添加视频预览
        const videoPreview = document.createElement('video');
        videoPreview.src = videoData.video_url;
        videoPreview.style.cssText = 'width: 100%; max-height: 200px; margin-top: 8px; border-radius: 8px;';
        videoPreview.controls = true;
        infoContainer.appendChild(videoPreview);
      
      // 点击历史记录项重新解析视频
      item.addEventListener('click', () => {
        shareTextInput.value = record.shareText;
        displayVideoInfo(record.videoData);
        loadingEl.style.display = 'none';
        videoInfo.style.display = 'block';
        errorMsg.style.display = 'none';
      });
      
      historyItems.appendChild(item);
    });


    // 更新分页按钮状态
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
  }

  // 修改loadHistory函数
  async function loadHistory() {
    try {
      const result = await chrome.storage.local.get(['douyinHistory']);
      historyRecords = result.douyinHistory || [];
      if (historyRecords.length > 0) {
        const lastRecord = historyRecords[0];
        shareTextInput.value = lastRecord.shareText;
        if (lastRecord.videoData) {
          displayVideoInfo(lastRecord.videoData);
        }
      }
      renderHistory(); // 加载后渲染历史记录
    } catch (err) {
      console.error('加载历史记录失败:', err);
    }
  }

  // 修改saveHistory函数
  async function saveHistory(shareText, videoData) {
    const record = {
      shareText,
      videoData,
      timestamp: Date.now()
    };
    
    const douyinUrl = extractDouyinUrl(shareText);
    const existingIndex = douyinUrl ? historyRecords.findIndex(item => extractDouyinUrl(item.shareText) === douyinUrl) : -1;
    
    if (existingIndex !== -1) {
      historyRecords.splice(existingIndex, 1);
    }
    
    historyRecords.unshift(record);
    if (historyRecords.length > MAX_HISTORY) {
      historyRecords = historyRecords.slice(0, MAX_HISTORY);
    }
    
    try {
      await chrome.storage.local.set({
        douyinHistory: historyRecords
      });
      renderHistory();
    } catch (err) {
      console.error('保存历史记录失败:', err);
    }
  }

  // 显示视频信息的函数
  function displayVideoInfo(videoData) {
    const additionalData = videoData.additional_data[0];
    authorAvatar.src = videoData.additional_data[0].url;
    authorName.textContent = additionalData.nickname;
    authorSignature.textContent = additionalData.signature;
    videoDesc.style.whiteSpace = 'pre-wrap';
    videoDesc.style.wordBreak = 'break-word';
    videoDesc.textContent = additionalData.desc;
    
    currentVideoUrl = videoData.video_url;
    currentVideoData = additionalData;
    videoPlayer.src = currentVideoUrl;
  
    videoInfo.style.display = 'block';
    errorMsg.style.display = 'none';
  }

  // 格式化视频时长
  function formatDuration(milliseconds) {
    return milliseconds;
  }

  // 从分享文本中提取抖音链接
  function extractDouyinUrl(text) {
    const urlRegex = /https:\/\/v\.douyin\.com\/[\w-]+\/?/;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  }

  // 处理粘贴事件
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      shareTextInput.value = text;
      if (text) {
        parseVideo(text);
      }
    } catch (error) {
      console.error('粘贴操作失败:', error);
      errorMsg.textContent = '粘贴失败，请检查是否授予剪贴板权限';
      errorMsg.style.display = 'block';
    }
  }

  // 事件监听器
  shareTextInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    shareTextInput.value = text;
    if (text) {
      parseVideo(text);
    }
  });
  
//   // 输入框获得焦点时自动触发粘贴操作
//   shareTextInput.addEventListener('focus', handlePaste);

  // 添加粘贴按钮点击事件
  if (pasteBtn) {
    pasteBtn.addEventListener('click', handlePaste);
  }

  // 解析视频
  async function parseVideo(shareText) {
    loadingEl.style.display = 'block';
    videoInfo.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
      const douyinUrl = extractDouyinUrl(shareText);
      if (!douyinUrl) {
        throw new Error('未找到有效的抖音链接');
      }

      const apiUrl = `https://dy.xs25.cn/api/douyinjx?url=${douyinUrl}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.code !== 200) {
        throw new Error(data.msg || '解析失败');
      }

      // 显示视频信息
      const videoData = data.data;
      displayVideoInfo(videoData);
      await saveHistory(shareText, videoData);
      loadingEl.style.display = 'none';
      // 显示成功提示
      errorMsg.style.display = 'block';
      errorMsg.style.color = '#52c41a';
      errorMsg.textContent = '解析成功，可以点击下载按钮下载视频';
      setTimeout(() => {
        errorMsg.style.display = 'none';
        errorMsg.style.color = '#ff4d4f';
      }, 3000);
    } catch (error) {
      loadingEl.style.display = 'none';
      errorMsg.textContent = error.message;
      errorMsg.style.display = 'block';
      videoInfo.style.display = 'none';
    }
  }

  parseBtn.addEventListener('click', () => {
    const shareText = shareTextInput.value.trim();
    if (!shareText) {
      errorMsg.textContent = '请输入分享文本';
      errorMsg.style.display = 'block';
      return;
    }
    parseVideo(shareText);
  });

  playBtn.addEventListener('click', () => {
    if (videoPlayer.paused) {
      videoPlayer.play();
      playBtn.textContent = '暂停';
    } else {
      videoPlayer.pause();
      playBtn.textContent = '播放';
    }
  });

  downloadBtn.addEventListener('click', async () => {
    if (!currentVideoUrl) {
      errorMsg.textContent = '没有可下载的视频';
      errorMsg.style.display = 'block';
      return;
    }
    
    downloadBtn.disabled = true;
    downloadBtn.textContent = '准备下载...';
    errorMsg.style.display = 'none';

    const downloadProgress = document.getElementById('downloadProgress');
    const downloadSize = document.getElementById('downloadSize');
    const downloadPercent = document.getElementById('downloadPercent');
    const progressBar = document.getElementById('progressBar');

    downloadProgress.style.display = 'block';
    downloadSize.textContent = '正在去除水印...';
    downloadPercent.textContent = '';
    progressBar.style.width = '0';
    
    let fileName = '';
    if (currentVideoData) {
      const nickname = currentVideoData.nickname || '';
      const desc = currentVideoData.desc || '';
      fileName = `${nickname}-${desc}`.slice(0, 100).replace(/[/:*?"<>|]/g, '_');
    }
    if (!fileName) {
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
      fileName = `douyin_${timestamp}`;
    }

    downloadManager.addToQueue(
      currentVideoUrl,
      fileName,
      (progress) => {
        downloadBtn.textContent = '下载中...';
        downloadSize.textContent = `${progress.sizeText} / ${progress.totalSizeText}`;
        downloadPercent.textContent = `${progress.percent}%`;
        progressBar.style.width = `${progress.percent}%`;
      },
      () => {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '下载视频';
        downloadProgress.style.display = 'none';
        errorMsg.style.display = 'none';
      },
      (error) => {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '下载视频';
        downloadProgress.style.display = 'none';
        errorMsg.textContent = '下载失败：' + (error.message || '网络错误');
        errorMsg.style.display = 'block';
      }
    );
  });

  // 复制视频地址
  document.getElementById('copyUrlBtn').addEventListener('click', async () => {
    if (!currentVideoUrl) {
      errorMsg.textContent = '没有可复制的视频地址';
      errorMsg.style.display = 'block';
      return;
    }

    const copyUrlBtn = document.getElementById('copyUrlBtn');
    const originalText = copyUrlBtn.textContent;

    try {
      await navigator.clipboard.writeText(currentVideoUrl);
      copyUrlBtn.textContent = '已复制';
      setTimeout(() => {
        copyUrlBtn.textContent = originalText;
      }, 3000);
    } catch (error) {
      errorMsg.textContent = '复制失败：' + (error.message || '剪贴板访问被拒绝');
      errorMsg.style.display = 'block';
    }
  });

  // 视频播放状态变化监听
  videoPlayer.addEventListener('play', () => {
    playBtn.textContent = '暂停';
  });

  videoPlayer.addEventListener('pause', () => {
    playBtn.textContent = '播放';
  });

  // 支持全屏播放
  videoPlayer.addEventListener('dblclick', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoPlayer.requestFullscreen();
    }
  });

  // 历史记录弹窗相关事件
  historyBtn.addEventListener('click', () => {
    historyModal.style.display = 'block';
  });

  closeHistory.addEventListener('click', () => {
    historyModal.style.display = 'none';
  });

  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
      historyModal.style.display = 'none';
    }
  });

  clearHistory.addEventListener('click', async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      historyRecords = [];
      try {
        await chrome.storage.local.remove('douyinHistory');
        renderHistory();
      } catch (err) {
        console.error('清空历史记录失败:', err);
        errorMsg.textContent = '清空历史记录失败';
        errorMsg.style.display = 'block';
      }
    }
  });

  // 添加分页按钮事件监听
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderHistory();
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(historyRecords.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderHistory();
    }
  });

  // 页面加载时加载历史记录
  loadHistory();
});

// 打赏功能已禁用
// const donateBtn = document.getElementById('donateBtn');
// const donateModal = document.getElementById('donateModal');
// const closeDonate = document.getElementById('closeDonate');

// donateBtn.addEventListener('click', () => {
//   donateModal.style.display = 'block';
// });

// closeDonate.addEventListener('click', () => {
//   donateModal.style.display = 'none';
// });

// donateModal.addEventListener('click', (e) => {
//   if (e.target === donateModal) {
//     donateModal.style.display = 'none';
//   }
// });