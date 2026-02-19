// ===== Supabase 초기화 =====
const SUPABASE_URL = 'https://gwitlriweyvbkodmzaji.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FTdFkCz4e2g30OQ6yvyHNQ_bUkb4hha';

// Supabase 클라이언트 (전역)
const AppState = {
  supabase: null,
  sentences: [],
  folders: [],
  currentFolder: 'all',
  currentSearchQuery: '',
  currentlyPlayingId: null,
  expandedEnglish: {},
  isLoading: true
};

// Supabase 초기화
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && !AppState.supabase) {
    AppState.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase 클라이언트 초기화됨');
  } else if (!AppState.supabase) {
    console.error('❌ Supabase 라이브러리가 로드되지 않았습니다');
  }
}

// 변수 단축 (편의상)
let { sentences, folders, currentFolder, currentSearchQuery, currentlyPlayingId, expandedEnglish } = AppState;

function updateState(updates) {
  Object.assign(AppState, updates);
  ({supabase, sentences, folders, currentFolder, currentSearchQuery, currentlyPlayingId, expandedEnglish} = AppState);
}

// ===== PWA Service Worker 등록 =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    console.log('✅ Service Worker 등록됨');
  }).catch(err => {
    console.log('⚠️ Service Worker 등록 실패:', err);
  });
}

// ===== 초기화 =====
window.addEventListener('load', async () => {
  initSupabase();
  await loadAllData();
  renderFolders();
  renderSentences();
  setupEventListeners();
  AppState.isLoading = false;
  console.log('✅ 앱 초기화 완료');
});

// ===== Supabase에서 모든 데이터 로드 =====
async function loadAllData() {
  if (!AppState.supabase) {
    console.error('❌ Supabase가 초기화되지 않았습니다');
    return;
  }

  try {
    // 1. sentences 로드
    const { data: sentencesData, error: sentencesError } = await AppState.supabase
      .from('sentences')
      .select('*');

    console.log('📊 sentencesData:', sentencesData, 'error:', sentencesError);

    if (sentencesError) throw sentencesError;

    // 2. folders 로드
    const { data: foldersData, error: foldersError } = await AppState.supabase
      .from('folders')
      .select('*');

    console.log('📂 foldersData:', foldersData, 'error:', foldersError);

    if (foldersError) throw foldersError;

    // 3. sentence_folders 로드 (관계)
    const { data: sentenceFoldersData, error: relError } = await AppState.supabase
      .from('sentence_folders')
      .select('*');

    console.log('🔗 sentenceFoldersData:', sentenceFoldersData, 'error:', relError);

    if (relError) throw relError;

    // 4. 데이터 정리
    const processedSentences = (sentencesData || []).map(row => ({
      id: row.id,
      korean: row.korean || '',
      english: row.english || '',
      folders: (sentenceFoldersData || [])
        .filter(rel => rel.sentence_id === row.id)
        .map(rel => rel.folder_id)
    }));

    const processedFolders = (foldersData || []).map(row => ({
      id: row.id,
      name: row.id  // id가 폴더 이름으로 사용됨
    }));

    // 상태 업데이트
    updateState({
      sentences: processedSentences,
      folders: processedFolders
    });

    // localStorage에서 확장 상태 복원
    const saved = localStorage.getItem('expandedEnglish');
    if (saved) {
      AppState.expandedEnglish = JSON.parse(saved);
    }

    console.log(`✅ Supabase 데이터 로드: ${processedSentences.length}개 문장, ${processedFolders.length}개 폴더`);
  } catch (error) {
    console.error('❌ 데이터 로드 오류:', error);
    alert('데이터를 불러올 수 없습니다: ' + error.message);
  }
}

// ===== Supabase에 문장 저장 =====
async function saveSentence(sentence) {
  if (!AppState.supabase) return;
  
  try {
    // 1. sentences 테이블에 저장
    const { data: savedSentence, error: sentenceError } = await AppState.supabase
      .from('sentences')
      .upsert({
        id: sentence.id,
        korean: sentence.korean,
        english: sentence.english
      })
      .select();

    if (sentenceError) throw sentenceError;

    // 2. 기존 sentence_folders 삭제
    const { error: deleteError } = await AppState.supabase
      .from('sentence_folders')
      .delete()
      .eq('sentence_id', sentence.id);

    if (deleteError) throw deleteError;

    // 3. 새로운 sentence_folders 생성
    if (sentence.folders && sentence.folders.length > 0) {
      const folderRelations = sentence.folders.map(folderId => ({
        sentence_id: sentence.id,
        folder_id: folderId
      }));

      const { error: insertError } = await AppState.supabase
        .from('sentence_folders')
        .insert(folderRelations);

      if (insertError) throw insertError;
    }

    console.log('✅ 문장 저장:', sentence.korean);
  } catch (error) {
    console.error('❌ 문장 저장 오류:', error);
    alert('문장 저장 실패: ' + error.message);
  }
}

// ===== Supabase에 폴더 저장 =====
async function saveFolder(folder) {
  if (!AppState.supabase) return;
  
  try {
    const { data, error } = await AppState.supabase
      .from('folders')
      .upsert({
        id: folder.id
      })
      .select();

    if (error) throw error;

    console.log('✅ 폴더 저장:', folder.id);
    return data;
  } catch (error) {
    console.error('❌ 폴더 저장 오류:', error);
    alert('폴더 저장 실패: ' + error.message);
  }
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

  // 폴더 모달의 이벤트 위임
  document.getElementById('folderListModal').addEventListener('click', (e) => {
    const folderCheckItem = e.target.closest('.folder-check-item');
    if (folderCheckItem) {
      const folderId = folderCheckItem.getAttribute('data-folder-id');
      toggleFolderForSentence(folderId);
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

  AppState.folders.forEach(folder => {
    const count = AppState.sentences.filter(s => s.folders.includes(folder.id)).length;
    const isActive = AppState.currentFolder === folder.id;

    const folderItem = document.createElement('div');
    folderItem.className = `folder-item ${isActive ? 'active' : ''}`;
    folderItem.onclick = () => filterByFolder(folder.id);
    folderItem.innerHTML = `
      <span class="folder-icon">📁</span>
      <span>${escapeHtml(folder.name)}</span>
      <span style="font-size: 12px; margin-left: auto; color: #999;">${count}</span>
    `;
    folderList.appendChild(folderItem);
  });
}

// ===== 폴더 필터링 =====
function filterByFolder(folderId) {
  AppState.currentFolder = folderId;
  AppState.currentSearchQuery = '';
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

// ===== 문장 필터링 =====
function getFilteredSentences() {
  let filtered = AppState.sentences;

  // 폴더 필터링
  if (AppState.currentFolder !== 'all') {
    filtered = filtered.filter(s => s.folders.includes(AppState.currentFolder));
  }

  // 검색 필터링
  if (AppState.currentSearchQuery.trim()) {
    const query = AppState.currentSearchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.korean.toLowerCase().includes(query) ||
      s.english.toLowerCase().includes(query)
    );
  }

  return filtered;
}

// ===== 문장 렌더링 =====
function renderSentences() {
  const sentenceList = document.getElementById('sentenceList');
  const filtered = getFilteredSentences();

  if (filtered.length === 0) {
    sentenceList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">
          ${AppState.currentSearchQuery ? '검색 결과가 없습니다' : '폴더에 문장이 없습니다'}
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
          <span>${AppState.expandedEnglish[sentence.id] ? '▼ 영어 숨기기' : '▶ 영어 보기'}</span>
        </button>
        <button class="tts-btn" onclick="speakEnglish(${sentence.id})" title="발음 듣기">
          🔊
        </button>
        <button class="add-folder-btn" onclick="openFolderModal(${sentence.id})" title="폴더에 추가">
          📌
        </button>
      </div>

      <div class="english-text ${AppState.expandedEnglish[sentence.id] ? '' : 'english-hidden'}">
        ${escapeHtml(sentence.english)}
      </div>
    </div>
  `).join('');
}

// ===== 영어 보기 토글 =====
function toggleEnglish(sentenceId) {
  AppState.expandedEnglish[sentenceId] = !AppState.expandedEnglish[sentenceId];
  localStorage.setItem('expandedEnglish', JSON.stringify(AppState.expandedEnglish));
  renderSentences();
}

// ===== TTS 발음 듣기 =====
function speakEnglish(sentenceId) {
  const sentence = AppState.sentences.find(s => s.id === sentenceId);
  if (!sentence) return;

  // 기존 재생 중지
  if (AppState.currentlyPlayingId !== null && AppState.currentlyPlayingId !== sentenceId) {
    speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(sentence.english);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    AppState.currentlyPlayingId = sentenceId;
  };

  utterance.onend = () => {
    AppState.currentlyPlayingId = null;
  };

  speechSynthesis.speak(utterance);
}

// ===== 검색 기능 =====
function handleSearch() {
  AppState.currentSearchQuery = document.getElementById('searchInput').value;
  renderSentences();
}

// ===== 폴더 모달 =====
let currentSentenceForFolder = null;

function openFolderModal(sentenceId) {
  currentSentenceForFolder = sentenceId;
  const modalOverlay = document.getElementById('folderModal');
  const folderListModal = document.getElementById('folderListModal');

  const sentence = AppState.sentences.find(s => s.id === sentenceId);
  folderListModal.innerHTML = AppState.folders.map(folder => {
    const isChecked = sentence.folders.includes(folder.id);
    return `
      <div class="folder-check-item" data-folder-id="${folder.id}">
        <div class="checkbox ${isChecked ? 'checked' : ''}">
          ${isChecked ? '✓' : ''}
        </div>
        <span class="folder-check-label">${escapeHtml(folder.name)}</span>
      </div>
    `;
  }).join('');

  modalOverlay.classList.add('active');
}

async function toggleFolderForSentence(folderId) {
  const sentence = AppState.sentences.find(s => s.id === currentSentenceForFolder);
  if (!sentence) return;

  const index = sentence.folders.indexOf(folderId);
  if (index > -1) {
    sentence.folders.splice(index, 1);
  } else {
    sentence.folders.push(folderId);
  }

  // Supabase에 저장
  await saveSentence(sentence);

  // UI 업데이트
  renderFolders();
  renderSentences();
  openFolderModal(currentSentenceForFolder);
}

// ===== 새 폴더 생성 모달 =====
function openNewFolderModal() {
  const modalOverlay = document.getElementById('newFolderModal');
  const input = document.getElementById('newFolderInput');
  input.value = '';
  input.focus();
  modalOverlay.classList.add('active');
}

async function createNewFolder() {
  const input = document.getElementById('newFolderInput');
  const folderName = input.value.trim();

  if (!folderName) {
    alert('폴더 이름을 입력해주세요.');
    return;
  }

  if (folderName.length > 50) {
    alert('폴더 이름은 50자 이내여야 합니다.');
    return;
  }

  try {
    // Supabase에 새 폴더 생성
    const { data, error } = await AppState.supabase
      .from('folders')
      .insert({ id: folderName })
      .select();

    if (error) throw error;

    // 로컬 폴더 목록에 추가
    const newFolder = {
      id: data[0].id,
      name: data[0].id  // id를 name으로 사용 (기존 로드 방식과 일관성)
    };
    AppState.folders.push(newFolder);

    console.log('✅ 폴더 생성:', folderName);

    // UI 업데이트
    renderFolders();
    closeModal();
  } catch (error) {
    console.error('❌ 폴더 생성 오류:', error);
    alert('폴더 생성 실패: ' + error.message);
  }
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
  AppState.currentlyPlayingId = null;
});
