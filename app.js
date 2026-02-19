// ===== 데이터 구조 =====
let sentences = [
  {
    id: 1,
    korean: "제 생각에는",
    english: "In my opinion,",
    folders: [1]
  },
  {
    id: 2,
    korean: "이것은 매우 중요합니다.",
    english: "This is very important.",
    folders: [1]
  },
  {
    id: 3,
    korean: "많은 사람들이 사용합니다.",
    english: "Many people use it.",
    folders: [1, 2]
  },
  {
    id: 4,
    korean: "시간과 비용을 절약할 수 있습니다.",
    english: "It can save time and money.",
    folders: [2]
  },
  {
    id: 5,
    korean: "더 자세히 설명해 주세요.",
    english: "Could you explain that in more detail?",
    folders: [1]
  },
  {
    id: 6,
    korean: "그것은 좋은 생각입니다.",
    english: "That's a great idea.",
    folders: [2]
  },
  {
    id: 7,
    korean: "저도 동의합니다.",
    english: "I agree with you.",
    folders: [1, 3]
  },
  {
    id: 8,
    korean: "어떻게 생각하세요?",
    english: "What do you think about it?",
    folders: [3]
  },
  {
    id: 9,
    korean: "실제로, 그런 경우가 많습니다.",
    english: "Actually, that's often the case.",
    folders: [2]
  },
  {
    id: 10,
    korean: "그래서 우리는 어떻게 해야 할까요?",
    english: "So what should we do then?",
    folders: [3]
  }
];

let folders = [
  { id: 1, name: "일상 회화" },
  { id: 2, name: "비즈니스" },
  { id: 3, name: "토론 표현" }
];

let currentFolder = 'all';
let currentSearchQuery = '';
let currentlyPlayingId = null;
let expandedEnglish = {};

// ===== 초기화 =====
window.addEventListener('load', () => {
  loadDataFromStorage();
  renderFolders();
  renderSentences();
  setupEventListeners();
});

// ===== 저장소 관리 =====
function loadDataFromStorage() {
  const savedSentences = localStorage.getItem('sentences');
  const savedFolders = localStorage.getItem('folders');
  const savedExpanded = localStorage.getItem('expandedEnglish');
  
  if (savedSentences) sentences = JSON.parse(savedSentences);
  if (savedFolders) folders = JSON.parse(savedFolders);
  if (savedExpanded) expandedEnglish = JSON.parse(savedExpanded);
}

function saveDataToStorage() {
  localStorage.setItem('sentences', JSON.stringify(sentences));
  localStorage.setItem('folders', JSON.stringify(folders));
  localStorage.setItem('expandedEnglish', JSON.stringify(expandedEnglish));
}

// ===== 이벤트 리스너 =====
function setupEventListeners() {
  document.getElementById('newFolderInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createNewFolder();
    }
  });

  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('searchInput').value = '';
      handleSearch();
    }
  });
}

// ===== 사이드패널 토글 =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('active');
  }
}

// ===== 폴더 렌더링 =====
function renderFolders() {
  const folderList = document.getElementById('folderList');
  folderList.innerHTML = '';

  folders.forEach(folder => {
    const count = sentences.filter(s => s.folders.includes(folder.id)).length;
    const isActive = currentFolder === folder.id;
    
    const folderItem = document.createElement('div');
    folderItem.className = `folder-item ${isActive ? 'active' : ''}`;
    folderItem.onclick = () => filterByFolder(folder.id);
    folderItem.innerHTML = `
      <span class="folder-icon">📁</span>
      <span>${folder.name}</span>
      <span style="font-size: 12px; margin-left: auto; color: #999;">${count}</span>
    `;
    folderList.appendChild(folderItem);
  });
}

// ===== 폴더 필터링 =====
function filterByFolder(folderId) {
  currentFolder = folderId;
  currentSearchQuery = '';
  document.getElementById('searchInput').value = '';
  
  // 사이드패널에서 활성 상태 업데이트
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('active');
  });

  if (folderId === 'all') {
    document.querySelector('.folder-item.all-sentences').classList.add('active');
  } else {
    event.currentTarget.classList.add('active');
  }

  renderFolders();
  renderSentences();
  closeSidebar();
}

// ===== 문장 필터링 및 렌더링 =====
function getFilteredSentences() {
  let filtered = sentences;

  // 폴더 필터링
  if (currentFolder !== 'all') {
    filtered = filtered.filter(s => s.folders.includes(currentFolder));
  }

  // 검색 필터링
  if (currentSearchQuery.trim()) {
    const query = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.korean.toLowerCase().includes(query) ||
      s.english.toLowerCase().includes(query)
    );
  }

  return filtered;
}

function renderSentences() {
  const sentenceList = document.getElementById('sentenceList');
  const filtered = getFilteredSentences();

  if (filtered.length === 0) {
    sentenceList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">
          ${currentSearchQuery ? '검색 결과가 없습니다' : '폴더에 문장이 없습니다'}
        </div>
      </div>
    `;
    return;
  }

  sentenceList.innerHTML = filtered.map(sentence => `
    <div class="sentence-card">
      <div class="korean-text">${escapeHtml(sentence.korean)}</div>
      
      <div class="sentence-actions">
        <button class="toggle-btn" onclick="toggleEnglish(${sentence.id})">
          <span>${expandedEnglish[sentence.id] ? '▼ 영어 숨기기' : '▶ 영어 보기'}</span>
        </button>
        <button class="tts-btn" onclick="speakEnglish(${sentence.id})" title="발음 듣기">
          🔊
        </button>
        <button class="add-folder-btn" onclick="openFolderModal(${sentence.id})" title="폴더에 추가">
          📌
        </button>
      </div>

      <div class="english-text ${expandedEnglish[sentence.id] ? '' : 'english-hidden'}">
        ${escapeHtml(sentence.english)}
      </div>
    </div>
  `).join('');
}

// ===== 영어 보기 토글 =====
function toggleEnglish(sentenceId) {
  expandedEnglish[sentenceId] = !expandedEnglish[sentenceId];
  saveDataToStorage();
  renderSentences();
}

// ===== TTS 발음 듣기 =====
function speakEnglish(sentenceId) {
  const sentence = sentences.find(s => s.id === sentenceId);
  if (!sentence) return;

  // 기존 재생 중지
  if (currentlyPlayingId !== null && currentlyPlayingId !== sentenceId) {
    speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(sentence.english);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    currentlyPlayingId = sentenceId;
  };

  utterance.onend = () => {
    currentlyPlayingId = null;
  };

  speechSynthesis.speak(utterance);
}

// ===== 검색 기능 =====
function handleSearch() {
  currentSearchQuery = document.getElementById('searchInput').value;
  renderSentences();
}

// ===== 폴더 모달 =====
let currentSentenceForFolder = null;

function openFolderModal(sentenceId) {
  currentSentenceForFolder = sentenceId;
  const modalOverlay = document.getElementById('folderModal');
  const folderListModal = document.getElementById('folderListModal');

  const sentence = sentences.find(s => s.id === sentenceId);
  folderListModal.innerHTML = folders.map(folder => {
    const isChecked = sentence.folders.includes(folder.id);
    return `
      <div class="folder-check-item" onclick="toggleFolderForSentence(${folder.id})">
        <div class="checkbox ${isChecked ? 'checked' : ''}">
          ${isChecked ? '✓' : ''}
        </div>
        <span class="folder-check-label">${folder.name}</span>
      </div>
    `;
  }).join('');

  modalOverlay.classList.add('active');
}

function toggleFolderForSentence(folderId) {
  const sentence = sentences.find(s => s.id === currentSentenceForFolder);
  if (!sentence) return;

  const index = sentence.folders.indexOf(folderId);
  if (index > -1) {
    sentence.folders.splice(index, 1);
  } else {
    sentence.folders.push(folderId);
  }

  saveDataToStorage();
  openFolderModal(currentSentenceForFolder);
  renderFolders();
}

// ===== 새 폴더 생성 모달 =====
function openNewFolderModal() {
  const modalOverlay = document.getElementById('newFolderModal');
  const input = document.getElementById('newFolderInput');
  input.value = '';
  input.focus();
  modalOverlay.classList.add('active');
}

function createNewFolder() {
  const input = document.getElementById('newFolderInput');
  const folderName = input.value.trim();

  if (!folderName) {
    alert('폴더 이름을 입력해주세요.');
    return;
  }

  if (folderName.length > 20) {
    alert('폴더 이름은 20자 이내여야 합니다.');
    return;
  }

  const newId = Math.max(...folders.map(f => f.id), 0) + 1;
  folders.push({ id: newId, name: folderName });

  saveDataToStorage();
  renderFolders();
  closeModal();
}

// ===== 모달 닫기 =====
function closeModal() {
  document.getElementById('folderModal').classList.remove('active');
  document.getElementById('newFolderModal').classList.remove('active');
}

// ===== 유틸리티 함수 =====
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ===== 모달 외부 클릭으로 닫기 =====
document.addEventListener('click', (e) => {
  const folderModal = document.getElementById('folderModal');
  const newFolderModal = document.getElementById('newFolderModal');

  if (e.target === folderModal) {
    folderModal.classList.remove('active');
  }

  if (e.target === newFolderModal) {
    newFolderModal.classList.remove('active');
  }
});

// ===== 백그라운드에서 탭 전환 시 음성 생성 중지 =====
window.addEventListener('blur', () => {
  speechSynthesis.cancel();
  currentlyPlayingId = null;
});
