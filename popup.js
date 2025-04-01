// 版本检查配置
const GITHUB_OWNER = 'duzhenxun';
const GITHUB_REPO = 'chrome-douyin';
const VERSION_CHECK_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const CURRENT_VERSION = '1.0';
const UPDATE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

// 检查新版本
async function checkUpdate() {
  try {
    const response = await fetch(VERSION_CHECK_URL);
    const data = await response.json();
    
    // GitHub Releases API返回数据结构：
    // {
    //   "tag_name": "v1.1",
    //   "name": "Version 1.1",
    //   "published_at": "2024-01-20T00:00:00Z",
    //   "body": "更新内容：\n1. 修复视频下载问题\n2. 优化界面交互\n3. 新增批量下载功能"
    // }
    
    if (data.tag_name) {
      const latestVersion = data.tag_name.replace('v', '');
      if (latestVersion !== CURRENT_VERSION) {
        // 显示更新提示
        const updateModal = document.getElementById('updateModal');
        const updateMessage = updateModal.querySelector('.update-message');
        updateMessage.innerHTML = `最新版本：${latestVersion}<br>发布时间：${new Date(data.published_at).toLocaleDateString()}<br><br>更新内容：<br>${data.body.replace(/\n/g, '<br>')}`;
        updateModal.style.display = 'block';
        
        // 如果版本差距过大，隐藏"稍后提醒"按钮
        const updateLater = document.getElementById('updateLater');
        const versionGap = parseFloat(latestVersion) - parseFloat(CURRENT_VERSION);
        if (versionGap >= 1.0) {
          updateLater.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
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
  const MAX_HISTORY = 20;
  const historyItems = document.getElementById('historyItems');

  // 渲染历史记录列表
  function renderHistory() {
    historyItems.innerHTML = '';
    historyRecords.forEach(record => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      const videoData = record.videoData;
      const additionalData = videoData.additional_data[0];
      
      const title = document.createElement('div');
      title.className = 'history-item-title';
      title.textContent = additionalData.desc || '无标题';
      
      const meta = document.createElement('div');
      meta.className = 'history-item-meta';
      const date = new Date(record.timestamp);
      meta.textContent = `作者：${additionalData.nickname} · ${date.toLocaleString()}`;
      
      item.appendChild(title);
      item.appendChild(meta);
      
      // 点击历史记录项重新加载视频
      item.addEventListener('click', () => {
        shareTextInput.value = record.shareText;
        displayVideoInfo(record.videoData);
      });
      
      historyItems.appendChild(item);
    });
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
  
  // 输入框获得焦点时自动触发粘贴操作
  shareTextInput.addEventListener('focus', handlePaste);

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
    
    try {
      const response = await fetch(currentVideoUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const reader = response.body.getReader();
      const chunks = [];
      let receivedSize = 0;
      
      while (true) {
        const {done, value} = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedSize += value.length;
        
        if (receivedSize < 1024 * 1024) {
          const sizeKB = (receivedSize / 1024).toFixed(1);
          downloadBtn.textContent = `已下载 ${sizeKB}KB`;
        } else {
          const sizeMB = (receivedSize / (1024 * 1024)).toFixed(1);
          downloadBtn.textContent = `已下载 ${sizeMB}MB`;
        }
      }
      
      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let fileName = '';
      if (currentVideoData) {
        const nickname = currentVideoData.nickname || '';
        const desc = currentVideoData.desc || '';
        fileName = `${nickname}-${desc}`.slice(0, 100).replace(/[\/:*?"<>|]/g, '_');
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
      a.download = `${fileName}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载失败:', error);
      errorMsg.textContent = '下载失败：' + (error.message || '网络错误');
      errorMsg.style.display = 'block';
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '下载视频';
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

  // 页面加载时加载历史记录
  loadHistory();
});