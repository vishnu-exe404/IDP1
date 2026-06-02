window.switchPanel = function (panel) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(panel + '-panel').classList.add('active');
};
window.clearActivePanel = function () {
  if (document.getElementById('output-panel').classList.contains('active')) clearOutput();
  if (document.getElementById('emotion-panel').classList.contains('active')) clearEmotionFeed();
  if (document.getElementById('feedback-panel').classList.contains('active')) document.getElementById('feedback-log').innerHTML = '';
};

const origSwitchLang = switchLang;
window.switchLang = function (lang) {
  origSwitchLang(lang);
  document.getElementById('sb-lang').textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
  const ex = { javascript: 'main.js', python: 'main.py', html: 'index.html', cpp: 'main.cpp', c: 'main.c', css: 'style.css' };
  document.getElementById('bc-filename').textContent = ex[lang] || 'file';
};

document.querySelectorAll('.file-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const lang = e.currentTarget.dataset.lang;
    document.getElementById('bc-filename').textContent = e.currentTarget.textContent.replace('×', '').trim();
    switchLang(lang);
  });
});


/* ═══════════════════════════════════════════
   FILE SYSTEM MANAGER
═══════════════════════════════════════════ */
class FileSystemManager {
  constructor() {
    this.files = new Map();
    this.folders = new Map();
    this.openTabs = [];
    this.activeTab = null;
    this.expandedFolders = new Set();
    this.loadFromStorage();
    this.initializeFileSystem();
  }

  initializeFileSystem() {
    const sampleFiles = {
      'main.js': 'console.log("Hello, World!");',
      'index.html': '<!DOCTYPE html>\n<html>\n<head><title>Home</title></head>\n<body></body>\n</html>',
      'style.css': 'body { font-family: sans-serif; }'
    };

    Object.entries(sampleFiles).forEach(([name, content]) => {
      if (!this.files.has(name)) {
        this.files.set(name, { name, content, modified: false, path: name });
      }
    });

    if (!this.folders.has('src')) {
      this.folders.set('src', { name: 'src', path: 'src', children: new Map() });
    }
    if (!this.folders.has('public')) {
      this.folders.set('public', { name: 'public', path: 'public', children: new Map() });
    }
  }

  createFile(name, path = '', content = '') {
    const fullPath = path ? `${path}/${name}` : name;
    this.files.set(fullPath, { name, content, modified: false, path: fullPath });
    this.saveToStorage();
    return fullPath;
  }

  createFolder(name, parentPath = '') {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    if (!this.folders.has(fullPath)) {
      this.folders.set(fullPath, { name, path: fullPath, children: new Map() });
      this.expandedFolders.add(fullPath);
      this.saveToStorage();
    }
    return fullPath;
  }

  deleteFile(path) {
    this.files.delete(path);
    this.openTabs = this.openTabs.filter(t => t.path !== path);
    if (this.activeTab?.path === path) {
      this.activeTab = this.openTabs[0] || null;
    }
    this.saveToStorage();
  }

  deleteFolder(path) {
    this.folders.delete(path);
    this.expandedFolders.delete(path);
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path + '/')) {
        this.files.delete(filePath);
      }
    }
    this.saveToStorage();
  }

  renameFile(oldPath, newName) {
    const file = this.files.get(oldPath);
    if (file) {
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      file.name = newName;
      file.path = newPath;
      this.files.set(newPath, file);
      this.files.delete(oldPath);
      
      const tab = this.openTabs.find(t => t.path === oldPath);
      if (tab) {
        tab.path = newPath;
        tab.name = newName;
      }
      this.saveToStorage();
    }
  }

  saveFile(path, content) {
    const file = this.files.get(path);
    if (file) {
      file.content = content;
      file.modified = false;
      this.saveToStorage();
    }
  }

  getFile(path) {
    return this.files.get(path);
  }

  getAllFiles() {
    return this.files;
  }

  getAllFolders() {
    return this.folders;
  }

  toggleFolder(path) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
  }

  isFolderExpanded(path) {
    return this.expandedFolders.has(path);
  }

  saveToStorage() {
    const data = {
      files: Array.from(this.files.entries()),
      folders: Array.from(this.folders.entries()),
      expandedFolders: Array.from(this.expandedFolders),
      openTabs: this.openTabs,
      activeTab: this.activeTab
    };
    localStorage.setItem('mitra-fs', JSON.stringify(data));
  }

  loadFromStorage() {
    const data = localStorage.getItem('mitra-fs');
    if (data) {
      const parsed = JSON.parse(data);
      this.files = new Map(parsed.files);
      this.folders = new Map(parsed.folders);
      this.expandedFolders = new Set(parsed.expandedFolders);
      this.openTabs = parsed.openTabs || [];
      this.activeTab = parsed.activeTab;
    }
  }
}

/* ═══════════════════════════════════════════
   MITRAIDE STATE
═══════════════════════════════════════════ */
const Z = {
  lang: 'javascript',
  theme: 'dark',
  voice: false,
  cameraOn: false,
  mood: 85,
  confidence: 60,
  focus: 85,
  errorsFixed: 0,
  repeatErrors: 0,
  analysisCount: 0,
  sameCodeRuns: 0,
  lastCode: '',
  sessionStart: Date.now(),
  typingTs: Date.now(),
  idleTimer: null,
  saveTimer: null,
  camStream: null,
  camInterval: null,
  emotionHistory: [],
  currentEmotion: 'neutral',
  lastEmotionTip: 0,
  frustrated: false,
  errorLog: [],
  fileSystem: null
};

const LANG_MAP = {
  javascript: 'main.js', html: 'index.html', css: 'style.css',
  python: 'main.py', c: 'main.c', cpp: 'main.cpp'
};

/* ═══════════════════════════════════════════
   FILE EXPLORER FUNCTIONS
═══════════════════════════════════════════ */
function renderFileExplorer() {
  const explorer = document.getElementById('file-explorer');
  if (!explorer) return;

  explorer.innerHTML = '';
  const tree = document.createElement('div');
  tree.className = 'file-tree';

  // Render root files
  for (const [path, file] of Z.fileSystem.getAllFiles()) {
    if (!path.includes('/')) {
      tree.appendChild(createFileElement(file));
    }
  }

  // Render folders
  for (const [path, folder] of Z.fileSystem.getAllFolders()) {
    if (!path.includes('/')) {
      tree.appendChild(createFolderElement(folder));
    }
  }

  explorer.appendChild(tree);
}

function createFileElement(file) {
  const div = document.createElement('div');
  div.className = 'explorer-file-item';
  
  const icon = getFileIcon(file.name);
  const isOpen = Z.fileSystem.openTabs.some(t => t.path === file.path);

  div.innerHTML = `
    <span class="file-icon">${icon}</span>
    <span class="file-name">${file.name}</span>
    ${isOpen ? '<span class="file-open-indicator">●</span>' : ''}
  `;

  div.addEventListener('click', () => {
    openFileInTab(file);
  });

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showFileContextMenu(e, file);
  });

  return div;
}

function createFolderElement(folder) {
  const div = document.createElement('div');
  div.className = 'explorer-folder-container';

  const header = document.createElement('div');
  header.className = 'explorer-folder-header';

  const isExpanded = Z.fileSystem.isFolderExpanded(folder.path);
  const arrow = document.createElement('span');
  arrow.className = 'folder-arrow';
  arrow.textContent = isExpanded ? '▼' : '▶';

  const icon = document.createElement('span');
  icon.textContent = '📁 ';

  const name = document.createElement('span');
  name.textContent = folder.name;

  header.appendChild(arrow);
  header.appendChild(icon);
  header.appendChild(name);

  header.addEventListener('click', () => {
    Z.fileSystem.toggleFolder(folder.path);
    renderFileExplorer();
  });

  header.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showFolderContextMenu(e, folder);
  });

  div.appendChild(header);

  if (isExpanded) {
    const content = document.createElement('div');
    content.className = 'explorer-folder-content';

    for (const [path, file] of Z.fileSystem.getAllFiles()) {
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      if (parentPath === folder.path) {
        const fileEl = createFileElement(file);
        fileEl.style.marginLeft = '16px';
        content.appendChild(fileEl);
      }
    }

    div.appendChild(content);
  }

  return div;
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'js': '📜', 'json': '📋', 'html': '🌐', 'css': '🎨',
    'md': '📝', 'py': '🐍', 'txt': '📄', 'ts': '🔷', 
    'jsx': '⚛️', 'tsx': '⚛️'
  };
  return icons[ext] || '📄';
}

function openFileInTab(file) {
  const existing = Z.fileSystem.openTabs.find(t => t.path === file.path);
  if (!existing) {
    Z.fileSystem.openTabs.push({ name: file.name, path: file.path });
  }
  Z.fileSystem.activeTab = { name: file.name, path: file.path };
  renderTabs();
  loadFileInEditor(file.path);
  Z.fileSystem.saveToStorage();
}

function renderTabs() {
  const tabBar = document.getElementById('custom-file-tabs');
  if (!tabBar) return;

  tabBar.innerHTML = '';

  if (Z.fileSystem.openTabs.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'tab-placeholder';
    placeholder.textContent = 'No files open';
    tabBar.appendChild(placeholder);
  } else {
    Z.fileSystem.openTabs.forEach(tab => {
      const tabEl = document.createElement('div');
      tabEl.className = 'custom-tab' + (Z.fileSystem.activeTab?.path === tab.path ? ' active' : '');

      const icon = getFileIcon(tab.name);
      tabEl.innerHTML = `
        <span class="tab-icon">${icon}</span>
        <span class="tab-name">${tab.name}</span>
        <button class="tab-close" data-path="${tab.path}">✕</button>
      `;

      tabEl.addEventListener('click', () => {
        Z.fileSystem.activeTab = tab;
        renderTabs();
        loadFileInEditor(tab.path);
      });

      const closeBtn = tabEl.querySelector('.tab-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.path);
      });

      tabBar.appendChild(tabEl);
    });
  }
}

function closeTab(path) {
  Z.fileSystem.openTabs = Z.fileSystem.openTabs.filter(t => t.path !== path);
  if (Z.fileSystem.activeTab?.path === path) {
    Z.fileSystem.activeTab = Z.fileSystem.openTabs[0] || null;
  }
  Z.fileSystem.saveToStorage();
  renderTabs();
  if (Z.fileSystem.activeTab) {
    loadFileInEditor(Z.fileSystem.activeTab.path);
  }
}

function loadFileInEditor(path) {
  const file = Z.fileSystem.getFile(path);
  if (!file) return;

  const editor = document.getElementById('code-editor');
  if (editor) {
    editor.value = file.content;
    updateLineNums();
    
    // Detect language from file extension
    const ext = path.split('.').pop().toLowerCase();
    const langMap = { 'js': 'javascript', 'py': 'python', 'html': 'html', 'css': 'css', 'cpp': 'cpp', 'c': 'c' };
    const lang = langMap[ext] || 'javascript';
    
    if (Z.lang !== lang) {
      switchLang(lang);
    }
  }
}

function createNewFile() {
  const name = prompt('Enter file name (e.g., app.js):');
  if (name) {
    const path = Z.fileSystem.createFile(name, '', '');
    renderFileExplorer();
    openFileInTab(Z.fileSystem.getFile(path));
  }
}

function createNewFolder() {
  const name = prompt('Enter folder name:');
  if (name) {
    Z.fileSystem.createFolder(name);
    renderFileExplorer();
  }
}

function showFileContextMenu(e, file) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';

  const actions = [
    { label: 'Open', action: () => openFileInTab(file) },
    { label: 'Rename', action: () => renameFile(file) },
    { label: 'Delete', action: () => deleteFile(file.path) },
    { label: 'Duplicate', action: () => duplicateFile(file) }
  ];

  actions.forEach(action => {
    const option = document.createElement('div');
    option.className = 'context-menu-item';
    option.textContent = action.label;
    option.addEventListener('click', () => {
      action.action();
      document.body.removeChild(menu);
    });
    menu.appendChild(option);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', () => {
      if (menu.parentNode) document.body.removeChild(menu);
    }, { once: true });
  }, 0);
}

function showFolderContextMenu(e, folder) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';

  const actions = [
    { label: 'New File', action: () => createFileInFolder(folder) },
    { label: 'New Folder', action: () => createSubFolder(folder) },
    { label: 'Rename', action: () => renameFolder(folder) },
    { label: 'Delete', action: () => deleteFolder(folder.path) }
  ];

  actions.forEach(action => {
    const option = document.createElement('div');
    option.className = 'context-menu-item';
    option.textContent = action.label;
    option.addEventListener('click', () => {
      action.action();
      document.body.removeChild(menu);
    });
    menu.appendChild(option);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', () => {
      if (menu.parentNode) document.body.removeChild(menu);
    }, { once: true });
  }, 0);
}

function createFileInFolder(folder) {
  const name = prompt('Enter file name:');
  if (name) {
    const path = Z.fileSystem.createFile(name, folder.path, '');
    renderFileExplorer();
  }
}

function createSubFolder(folder) {
  const name = prompt('Enter folder name:');
  if (name) {
    Z.fileSystem.createFolder(name, folder.path);
    renderFileExplorer();
  }
}

function renameFile(file) {
  const newName = prompt('New name:', file.name);
  if (newName && newName !== file.name) {
    Z.fileSystem.renameFile(file.path, newName);
    renderFileExplorer();
  }
}

function deleteFile(path) {
  if (confirm('Delete this file?')) {
    Z.fileSystem.deleteFile(path);
    renderFileExplorer();
  }
}

function duplicateFile(file) {
  const newName = file.name.replace(/(\.[^.]*)?$/, ' copy$1');
  Z.fileSystem.createFile(newName, '', file.content);
  renderFileExplorer();
}

function renameFolder(folder) {
  const newName = prompt('New name:', folder.name);
  if (newName && newName !== folder.name) {
    Z.fileSystem.renameFile(folder.path, newName);
    renderFileExplorer();
  }
}

function deleteFolder(path) {
  if (confirm('Delete this folder and all files inside?')) {
    Z.fileSystem.deleteFolder(path);
    renderFileExplorer();
  }
}

const STARTER = {
  javascript: `// ✨ Welcome to MitraIDE — मित्र — Your Friendly Code Companion!
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function greet(name) {
  return "Hello, " + name + "! 🌿";
}

// Arrays & Loops
const languages = ["JavaScript", "Python", "C++"];
languages.forEach((lang, index) => {
  console.log(\`\${index + 1}. \${lang}\`);
});

// Async example
async function fetchData() {
  try {
    const data = await Promise.resolve({ status: "ok" });
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

fetchData();
console.log(greet("World"));`,

  python: `# ✨ Welcome to MitraIDE — मित्र Python Mode! 🐍
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def greet(name: str) -> str:
    return f"Hello, {name}! 🌿"

# List comprehension
numbers = [x ** 2 for x in range(1, 6)]
print("Squares:", numbers)

# Class example
class MitraCoder:
    def __init__(self, name):
        self.name = name
        self.mood = "happy"
    
    def code(self):
        return f"{self.name} is coding with joy!"

coder = MitraCoder("You")
print(coder.code())
print(greet("World"))`,

  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My MitraIDE — मित्र Project</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0d0f14;
      color: #f0f4ff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    h1 { color: #7ee8a2; }
  </style>
</head>
<body>
  <div>
    <h1>Hello, MitraIDE — मित्र! 🌿</h1>
    <p>Start building something amazing.</p>
  </div>
</body>
</html>`,

  css: `/* ✨ MitraIDE — मित्र CSS Mode */
/* ━━━━━━━━━━━━━━━━━━━ */

:root {
  --primary: #7ee8a2;
  --bg: #09090f;
  --text: #f0f4ff;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Outfit', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: var(--primary);
  font-size: clamp(1.5rem, 4vw, 3rem);
}`,

  c: `/* ✨ MitraIDE — मित्र C Mode */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Greet function */
void greet(const char* name) {
    printf("Hello, %s! Welcome to MitraIDE — मित्र!\\n", name);
}

/* Factorial with recursion */
long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    greet("Coder");
    
    /* Print factorials */
    for (int i = 1; i <= 10; i++) {
        printf("%d! = %lld\\n", i, factorial(i));
    }
    
    return 0;
}`,

  cpp: `// ✨ MitraIDE — मित्र C++ Mode
#include <iostream>
#include <vector>
#include <string>
using namespace std;

class MitraCoder {
private:
    string name;
    int level;

public:
    MitraCoder(string n, int l) : name(n), level(l) {}
    
    void introduce() {
        cout << "Hi! I am " << name 
             << " at level " << level << endl;
    }
    
    void upgrade() { level++; }
};

int main() {
    MitraCoder coder("Beginner", 1);
    coder.introduce();
    coder.upgrade();
    coder.introduce();
    
    // Modern C++ features
    vector<string> langs = {"C++", "Python", "JS"};
    for (const auto& lang : langs) {
        cout << "🌿 " << lang << endl;
    }
    return 0;
}`
};

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // Try loading Face API models without blocking the UI
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
  ]).then(() => {
    console.log("Face API models loaded");
  }).catch(e => {
    console.warn("Face API models not found or failed to load. Emotion detection will run in fallback mode.", e);
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('zc-theme') || 'dark';
  Z.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.querySelector('[title*="Theme"]');
  if (themeBtn) themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="codicon codicon-color-mode"></i>' : '<i class="codicon codicon-color-mode"></i>';

  setTimeout(() => {
    document.getElementById('loader').classList.add('done');
    setTimeout(() => document.getElementById('loader').remove(), 700);
  }, 1600);

  loadCode();
  updateLineNums();
  drawMoodArc(Z.mood);
  startSessionTimer();
  startMoodDecay();
  setInterval(autoSuggestTip, 30000);

  const ed = document.getElementById('code-editor');
  ed.addEventListener('input', onInput);
  ed.addEventListener('keydown', onKeyDown);
  ed.addEventListener('scroll', syncScroll);
  ed.addEventListener('click', updateCursor);
  ed.addEventListener('keyup', updateCursor);

  document.getElementById('file-tabs').addEventListener('click', e => {
    if (e.target.classList.contains('lt')) switchLang(e.target.dataset.lang);
  });

  // 1. Initialize Sidebar Accordions
  document.querySelectorAll('.sb-section-title').forEach(title => {
    title.addEventListener('click', () => {
      const content = title.nextElementSibling;
      const icon = title.querySelector('i');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
      } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
      }
    });
  });

  // 2. Initialize Top Menu Bar
  document.querySelectorAll('.tb-menu span').forEach(menu => {
    menu.addEventListener('click', (e) => {
      const action = e.target.textContent;
      if (action === 'Run') analyzeCode();
      else if (action === 'File') saveCode();
      else if (action === 'View') document.getElementById('bottom-area').style.display = document.getElementById('bottom-area').style.display === 'none' ? 'flex' : 'none';
      else showToast(`Menu: ${action} - Action not supported in web version.`);
    });
  });

  // 3. Initialize Search
  const searchInput = document.querySelector('.search-input-wrapper input');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      showToast('Search palette opening...');
    });
    searchInput.addEventListener('input', (e) => {
      // Highlight code feature mockup
      if (e.target.value.length > 2) showToast(`Searching for: ${e.target.value}`);
    });
  }

  // 4. Initialize Activity Bar
  const icons = document.querySelectorAll('.ab-icon');
  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const title = icon.getAttribute('title');
      if (title === 'Explorer') {
        document.getElementById('sidebar').classList.remove('collapsed');
        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      } else if (title === 'Emotion Tracker') {
        document.getElementById('sidebar').classList.remove('collapsed');
        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        showToast('Emotion Tracker focused');
      } else {
        showToast(`${title} requires Premium+ integration`);
      }
    });
  });

});

/* ═══════════════════════════════════════════
   CAMERA & EMOTION DETECTION
═══════════════════════════════════════════ */
async function startCamera() {
  document.getElementById('cam-modal').classList.add('hidden');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Camera API not supported in this browser/environment. Use HTTPS.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });
    Z.camStream = stream;
    Z.cameraOn = true;
    const vid = document.getElementById('cam-video');
    vid.srcObject = stream;
    document.getElementById('cam-dot').classList.add('active');
    document.getElementById('sb-cam').textContent = '📷 Camera: ON';
    document.getElementById('cam-confidence').textContent = 'Detecting emotion...';

    // Start emotion analysis every 3 seconds
    vid.onloadedmetadata = () => {
      Z.camInterval = setInterval(analyzeEmotion, 3000);
    };
    showToast('📷 Camera started successfully!');
  } catch (err) {
    document.getElementById('cam-confidence').textContent = 'Camera blocked';

    if (err.name === 'NotAllowedError') {
      showToast('Camera access denied. Please allow permissions in your browser.');
    } else if (err.name === 'NotFoundError') {
      showToast('No camera device found.');
    } else {
      showToast(`Camera error: ${err.message}`);
    }
  }
}

window.stopCamera = function () {
  if (Z.camStream) {
    Z.camStream.getTracks().forEach(track => track.stop());
    Z.camStream = null;
  }
  if (Z.camInterval) {
    clearInterval(Z.camInterval);
    Z.camInterval = null;
  }
  Z.cameraOn = false;

  const vid = document.getElementById('cam-video');
  vid.srcObject = null;

  document.getElementById('cam-dot').classList.remove('active');
  document.getElementById('sb-cam').textContent = '📷 Camera: Off';
  document.getElementById('cam-emotion-name').textContent = 'Camera stopped';
  document.getElementById('cam-confidence').textContent = 'Click Start';
  showToast('Camera stopped and resources freed.');
};

window.capturePhoto = function () {
  if (!Z.cameraOn || !Z.camStream) {
    showToast('Please start the camera first!');
    return;
  }

  const vid = document.getElementById('cam-video');
  const canvas = document.getElementById('cam-canvas');

  // Ensure dimensions match the video feed
  canvas.width = vid.videoWidth || 640;
  canvas.height = vid.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  document.getElementById('captured-photo').src = dataUrl;
  document.getElementById('photo-modal').classList.remove('hidden');
};

window.closePhotoModal = function () {
  document.getElementById('photo-modal').classList.add('hidden');
  document.getElementById('captured-photo').src = '';
};

window.downloadPhoto = function () {
  const dataUrl = document.getElementById('captured-photo').src;
  if (!dataUrl) return;

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `mitraide_capture_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Photo downloaded successfully!');
};

function denyCamera() {
  document.getElementById('cam-modal').classList.add('hidden');
  document.getElementById('cam-confidence').textContent = 'Camera skipped';
  document.getElementById('sb-cam').textContent = '📷 Camera: Off';
  showToast('Running without camera. You can enable it later.');
}

/* ─── Emotion Analysis via Claude AI (vision) ─── */
async function analyzeEmotion() {
  if (!Z.cameraOn) return;
  const vid = document.getElementById('cam-video');
  if (!vid.videoWidth) return;

  try {
    const detection = await faceapi.detectSingleFace(vid, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();

    if (detection) {
      const expressions = detection.expressions;
      const scores = {
        happy: Math.round(expressions.happy * 100),
        sad: Math.round(expressions.sad * 100),
        frustrated: Math.round(expressions.angry * 100),
        focused: Math.round((expressions.neutral * 0.7 + expressions.surprised * 0.3) * 100),
        neutral: Math.round(expressions.neutral * 100)
      };

      let domEmotion = 'neutral';
      let maxScore = 0;
      for (const [e, s] of Object.entries(scores)) {
        if (s > maxScore) { maxScore = s; domEmotion = e; }
      }

      const tips = {
        frustrated: 'Take a breath. Try breaking the problem into smaller steps.',
        sad: 'Remember, every bug is a learning opportunity.',
        happy: 'Great energy! Keep this momentum going!',
        focused: 'You\'re in the zone! Stay with it.',
        neutral: 'You\'re steady — great foundation to build on.'
      };

      updateEmotionUI({
        emotion: domEmotion,
        confidence: Math.round(detection.detection.score * 100),
        scores: scores,
        tip: tips[domEmotion] || tips.neutral
      });
    } else {
      document.getElementById('cam-confidence').textContent = 'No face detected';
    }
  } catch (e) {
    console.error(e);
    simulateEmotion();
  }
}

function updateEmotionUI(result) {
  const em = result.emotion || 'neutral';
  Z.currentEmotion = em;
  Z.emotionHistory.push({ emotion: em, ts: Date.now() });
  if (Z.emotionHistory.length > 20) Z.emotionHistory.shift();

  const faces = { happy: '😊', sad: '😟', frustrated: '😤', focused: '🎯', neutral: '😐', confused: '😕', tired: '😴' };
  const colors = { happy: '#7ee8a2', sad: '#79b8ff', frustrated: '#ff6b6b', focused: '#ffb347', neutral: '#7888aa', confused: '#ff9de2', tired: '#a0a8cc' };
  const face = faces[em] || '😐';
  const color = colors[em] || '#7888aa';

  document.getElementById('cam-emotion-name').textContent = em.charAt(0).toUpperCase() + em.slice(1);
  document.getElementById('cam-confidence').textContent = `Confidence: ${result.confidence || 0}%`;

  // Emotion badge
  const badge = document.getElementById('emotion-badge');
  badge.className = 'emotion-badge ' + em;
  document.querySelector('#emotion-badge .e-face').textContent = face;
  document.getElementById('eb-emotion').textContent = em.charAt(0).toUpperCase() + em.slice(1);

  // Emotion bars
  const scores = result.scores || {};
  const emos = ['happy', 'sad', 'frustrated', 'focused', 'neutral'];
  emos.forEach(e => {
    const val = scores[e] || 0;
    const bar = document.getElementById(`eb-${e}`);
    const pct = document.getElementById(`ep-${e}`);
    if (bar) { bar.style.width = val + '%'; bar.style.background = colors[e]; }
    if (pct) pct.textContent = val + '%';
  });

  // Status bar
  document.getElementById('sb-mood').textContent = `${face} ${em.charAt(0).toUpperCase() + em.slice(1)}`;

  // Mood adjustment based on emotion
  const moodDelta = { happy: +5, sad: -5, frustrated: -10, focused: +3, neutral: 0, confused: -3, tired: -6 };
  adjustMood(moodDelta[em] || 0);

  // Add to emotion feed
  addEmotionFeed(face, em, result.tip || '', result.confidence || 0);

  // Trigger special behaviors
  triggerEmotionResponse(em, result.tip);

  // Update main emotion badge color
  badge.style.borderColor = color.replace(')', ',0.3)').replace('rgb', 'rgba');
}

function addEmotionFeed(face, emotion, tip, confidence) {
  const now = Date.now();
  if (now - Z.lastEmotionTip < 8000) return; // throttle
  Z.lastEmotionTip = now;

  const feed = document.getElementById('emotion-feed');
  const card = document.createElement('div');
  card.className = 'emo-feed-card';
  card.innerHTML = `
    <div class="emo-row">
      <div class="emo-big-face">${face}</div>
      <div class="emo-text">
        <div class="emo-detected">${emotion.charAt(0).toUpperCase() + emotion.slice(1)} — ${confidence}%</div>
        <div class="emo-tip">${tip}</div>
      </div>
    </div>
    <div class="conf-bar"><div class="conf-fill" style="width:${confidence}%"></div></div>
  `;
  feed.insertBefore(card, feed.firstChild);
  if (feed.children.length > 15) feed.removeChild(feed.lastChild);
}

function triggerEmotionResponse(emotion, tip) {
  const responses = {
    frustrated: () => {
      if (!Z.frustrated) {
        Z.frustrated = true;
        addFeedback('emotion', '😤 I see you\'re frustrated', 'Frustration means you\'re pushing your limits — that\'s growth! Try reading your code aloud, or take a 2-minute walk. Come back fresh. You\'ve got this! 💪');
        if (Z.voice) speak('I can see you seem frustrated. That\'s completely normal! Every programmer gets stuck sometimes. Take a breath, and let\'s try a different approach.');
        setTimeout(() => Z.frustrated = false, 60000);
      }
    },
    sad: () => {
      addFeedback('emotion', '😟 Feeling down?', 'Coding can feel overwhelming. Remember: every expert was once a confused beginner. Your struggle today is your skill tomorrow. 🌱');
    },
    tired: () => {
      addFeedback('break', '⏸ You look tired!', 'Your eyes and brain need rest. Step away for 5 minutes — grab water, stretch, look at something 20 feet away for 20 seconds. You\'ll code better after!');
    },
    happy: () => {
      if (Math.random() > 0.7) {
        addFeedback('motivate', '😊 You\'re on fire!', 'Your positive energy is amazing! Harness it — tackle that tricky part of your code right now while you\'re feeling great! ✨');
      }
    }
  };
  if (responses[emotion]) responses[emotion]();
}

function simulateEmotion() {
  // Behavioral simulation when camera API fails
  const errorRate = Z.errorLog.filter(e => Date.now() - e < 60000).length;
  const idle = (Date.now() - Z.typingTs) / 1000;

  let em = 'neutral', scores = { happy: 20, sad: 10, frustrated: 15, focused: 35, neutral: 20 };
  if (errorRate > 3) { em = 'frustrated'; scores = { happy: 5, sad: 15, frustrated: 60, focused: 10, neutral: 10 }; }
  else if (idle > 30) { em = 'tired'; scores = { happy: 10, sad: 20, frustrated: 10, focused: 15, neutral: 45 }; }
  else if (Z.mood > 80) { em = 'happy'; scores = { happy: 65, sad: 5, frustrated: 5, focused: 15, neutral: 10 }; }
  else if (Z.analysisCount > 2) { em = 'focused'; scores = { happy: 15, sad: 5, frustrated: 10, focused: 55, neutral: 15 }; }

  const tips = {
    frustrated: 'Try breaking the problem into smaller steps.',
    tired: 'Take a short break to refresh your focus.',
    happy: 'Great energy! Keep this momentum going!',
    focused: 'You\'re in the zone! Stay with it.',
    neutral: 'You\'re steady — great foundation to build on.'
  };

  updateEmotionUI({
    emotion: em, confidence: 70 + Math.floor(Math.random() * 20),
    scores, tip: tips[em] || tips.neutral
  });
}

/* ═══════════════════════════════════════════
   CODE INPUT
═══════════════════════════════════════════ */
let typingTimer;
function onInput() {
  updateLineNums();
  updateCursor();
  autoSave();
  trackTyping();

  // Typing light effect
  const light = document.getElementById('typing-light');
  light.classList.add('show');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => light.classList.remove('show'), 600);

  // Idle reset
  clearTimeout(Z.idleTimer);
  Z.idleTimer = setTimeout(onIdle, 50000);

  // Lines stat
  const lines = document.getElementById('code-editor').value.split('\n').length;
  document.getElementById('s-lines').textContent = lines;
  const prog = Math.min(100, Math.floor(lines * 1.8));
  document.getElementById('bar-prog').style.width = prog + '%';
  document.getElementById('pct-prog').textContent = prog + '%';
}

function trackTyping() {
  const now = Date.now();
  const gap = now - Z.typingTs;
  Z.typingTs = now;
  if (gap < 300) adjustMood(+0.1);
  else if (gap > 3000) adjustMood(-0.2);
}

function onIdle() {
  adjustMood(-6);
  if (Z.mood < 55) {
    addFeedback('break', '⏰ Long Idle Detected', 'You\'ve been away for a while. Jumping back in can feel hard — start by reading your last few lines and run the analyzer. Baby steps! 🌱');
  }
}

function onKeyDown(e) {
  const ed = e.target;
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = ed.selectionStart, end = ed.selectionEnd;
    ed.value = ed.value.substring(0, s) + '  ' + ed.value.substring(end);
    ed.selectionStart = ed.selectionEnd = s + 2;
    updateLineNums();
  }
  // Auto-close brackets
  const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  if (pairs[e.key] && !e.ctrlKey && !e.metaKey) {
    const s = ed.selectionStart, end = ed.selectionEnd;
    if (s === end) {
      e.preventDefault();
      const before = ed.value.substring(0, s);
      const after = ed.value.substring(end);
      ed.value = before + e.key + pairs[e.key] + after;
      ed.selectionStart = ed.selectionEnd = s + 1;
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); analyzeCode(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCode(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); clearOutput(); }
  if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); toggleTheme(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'm') { e.preventDefault(); toggleVoice(); }
}

/* ═══════════════════════════════════════════
   LINE NUMBERS
═══════════════════════════════════════════ */
function updateLineNums() {
  const ed = document.getElementById('code-editor');
  const n = ed.value.split('\n').length;
  let html = '';
  for (let i = 1; i <= Math.max(n, 1); i++) html += i + '\n';
  document.getElementById('line-nums').textContent = html;
}
function syncScroll() {
  document.getElementById('line-nums').scrollTop = document.getElementById('code-editor').scrollTop;
}
function updateCursor() {
  const ed = document.getElementById('code-editor');
  const text = ed.value.substring(0, ed.selectionStart);
  const lines = text.split('\n');
  document.getElementById('sb-cursor').textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
}

/* ═══════════════════════════════════════════
   LANGUAGE SWITCHING
═══════════════════════════════════════════ */
function switchLang(lang) {
  saveCode(true);
  Z.lang = lang;
  document.querySelectorAll('.lt').forEach(t => t.classList.toggle('active', t.dataset.lang === lang));
  document.getElementById('sb-lang').textContent = '⬡ ' + lang.charAt(0).toUpperCase() + lang.slice(1);

  // Update file tab
  const tab = document.querySelector('.file-tab.active');
  if (tab) tab.innerHTML = `<div class="dot"></div>${LANG_MAP[lang]}<span class="close" onclick="closeTab(event,'${LANG_MAP[lang]}')">×</span>`;

  loadCode(lang);
  updateLineNums();
}

/* ═══════════════════════════════════════════
   AI CODE ANALYSIS
═══════════════════════════════════════════ */
async function analyzeCode() {
  const code = document.getElementById('code-editor').value.trim();
  if (!code) {
    addFeedback('motivate', '✏️ Write Some Code First!', 'Start with something simple — even `console.log("Hello!")` is a great first step. Every program begins with a single line!');
    return;
  }

  Z.analysisCount++;
  const isSame = code === Z.lastCode;
  if (isSame) {
    Z.sameCodeRuns++;
    Z.repeatErrors++;
    document.getElementById('s-repeat').textContent = Z.repeatErrors;
    adjustMood(-7);
    if (Z.sameCodeRuns >= 2) showFrustBanner();
  } else {
    Z.sameCodeRuns = 0;
    Z.lastCode = code;
  }

  const thinking = document.getElementById('ai-thinking');
  thinking.classList.add('show');
  logOutput('info', `⟳ Analyzing ${Z.lang} code...`);

  try {
    const result = await callClaude(code);
    thinking.classList.remove('show');
    processAnalysis(result);
  } catch (err) {
    thinking.classList.remove('show');
    fallbackAnalysis(code);
  }
}

async function callClaude(code) {
  const emotionCtx = Z.cameraOn ? `Student's current emotion: ${Z.currentEmotion}. ` : '';
  const frustCtx = Z.sameCodeRuns > 1 ? `IMPORTANT: Student has run the SAME code ${Z.sameCodeRuns} times — they are likely frustrated. Be extra gentle and encouraging. ` : '';

  const prompt = `You are MitraIDE — मित्र, a warm empathetic AI tutor for beginner programmers.
${emotionCtx}${frustCtx}
Analyze this ${Z.lang} code for a beginner student:

\`\`\`${Z.lang}
${code}
\`\`\`

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "hasErrors": true/false,
  "errors": [
    {
      "line": number or null,
      "type": "syntax" | "logic" | "style" | "best-practice",
      "friendly": "very beginner-friendly explanation — no jargon, warm tone (2-3 sentences)",
      "hint": "a tiny nudge toward the solution — NOT the full answer (1 sentence)",
      "severity": "critical" | "warning" | "suggestion"
    }
  ],
  "whatWentWell": "1 thing they did right (always find something positive)",
  "motivation": "warm 2-sentence encouraging message based on their emotion and progress",
  "nextStep": "one concrete tiny next step they can take",
  "moodBoost": true/false
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  const text = data.content?.map(c => c.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

function processAnalysis(result) {
  if (result.hasErrors && result.errors?.length > 0) {
    result.errors.forEach(err => {
      const lineStr = err.line ? `Line ${err.line}: ` : '';
      const icon = { critical: '✗', warning: '⚠', suggestion: '→' }[err.severity] || '⚠';
      logOutput(err.severity === 'critical' ? 'err' : 'warn',
        `${icon} ${lineStr}[${err.type}] ${err.friendly}`);
      addFeedback('error', `${icon} ${err.type.charAt(0).toUpperCase() + err.type.slice(1)} Issue — ${lineStr.trim()}`, err.friendly);
      if (err.hint) setTimeout(() => addFeedback('hint', '💡 Hint (no spoilers!)', err.hint), 400);
      Z.errorLog.push(Date.now());
    });
    document.getElementById('sb-errors').textContent = `${result.errors.length} issue${result.errors.length > 1 ? 's' : ''}`;
    adjustMood(-4 * result.errors.length);
  } else {
    logOutput('suc', '✓ No errors found! Code looks great!');
    document.getElementById('sb-errors').textContent = '0 issues';
    Z.errorsFixed++;
    document.getElementById('s-fixed').textContent = Z.errorsFixed;
    adjustMood(+18);
    adjustConfidence(+10);
    Z.sameCodeRuns = 0;
  }

  if (result.whatWentWell) addFeedback('motivate', '🌟 What You Did Well!', result.whatWentWell);
  if (result.motivation) {
    setTimeout(() => {
      addFeedback('motivate', '💬 Coach Says', result.motivation);
      if (Z.voice) speak(result.motivation);
    }, 600);
  }
  if (result.nextStep) setTimeout(() => addFeedback('hint', '👣 Next Step', result.nextStep), 900);
  if (result.moodBoost) { adjustMood(+8); adjustConfidence(+5); }
}

/* ─── Fallback local analysis ─── */
function fallbackAnalysis(code) {
  logOutput('warn', '⚠ AI offline — running local analysis...');
  const errs = [];
  const lang = Z.lang;

  if (['javascript', 'css', 'c', 'cpp'].includes(lang)) {
    const o = (code.match(/\{/g) || []).length, c = (code.match(/\}/g) || []).length;
    if (o !== c) errs.push({
      friendly: `You have ${o} opening curly brace${o !== 1 ? 's' : ''} but ${c} closing one${c !== 1 ? 's' : ''}. Every { needs a matching }!`,
      hint: 'Count your braces carefully — editors usually highlight matched pairs.'
    });
  }
  if (lang === 'javascript') {
    if (code.includes('console.log') && code.match(/console\.log\s*\([^)]*$/m)) {
      errs.push({ friendly: 'Your console.log() might be missing a closing parenthesis ).', hint: 'Check that every opening ( has a matching ) on the same line.' });
    }
  }
  if (lang === 'python') {
    if (code.match(/def\s+\w+[^:]*\n\s*[^\s]/)) {
      errs.push({ friendly: 'A function definition might be missing a colon : at the end.', hint: 'Python functions always end with a colon: `def my_function():`' });
    }
  }
  if (['c', 'cpp'].includes(lang)) {
    if (!code.includes('#include')) {
      errs.push({ friendly: 'C/C++ programs usually need #include statements at the top.', hint: 'Try adding `#include <stdio.h>` for C or `#include <iostream>` for C++.' });
    }
  }

  if (errs.length) {
    errs.forEach(e => {
      logOutput('err', `✗ ${e.friendly}`);
      addFeedback('error', '⚠ Potential Issue Found', e.friendly);
      if (e.hint) setTimeout(() => addFeedback('hint', '💡 Hint', e.hint), 300);
    });
    adjustMood(-5);
  } else {
    logOutput('suc', '✓ Basic checks passed! (AI unavailable — limited analysis)');
    addFeedback('motivate', '✅ Looks Good Locally!', 'No obvious issues detected. Connect to the internet for full AI-powered analysis!');
    adjustMood(+8);
  }

  const msgs = [
    'Debugging is detective work — and you\'re the detective! 🔍',
    'Every error you fix is a skill you\'ve built. Keep going!',
    'The code that frustrates you today will feel obvious tomorrow. 💪',
    'You\'re braver than you believe — you\'re still here coding!'
  ];
  setTimeout(() => addFeedback('motivate', '🌱 Remember This', msgs[Z.analysisCount % msgs.length]), 700);
}

/* ═══════════════════════════════════════════
   MOOD & EMOTION SYSTEM
═══════════════════════════════════════════ */
function adjustMood(d) {
  Z.mood = Math.max(5, Math.min(100, Z.mood + d));
  updateMoodUI();
}
function adjustConfidence(d) {
  Z.confidence = Math.max(5, Math.min(100, Z.confidence + d));
  document.getElementById('bar-conf').style.width = Z.confidence + '%';
  document.getElementById('pct-conf').textContent = Math.round(Z.confidence) + '%';
}
function startMoodDecay() {
  setInterval(() => { adjustMood(-0.4); }, 12000);
}

function updateMoodUI() {
  const s = Z.mood;
  drawMoodArc(s);
  document.getElementById('mood-num').textContent = Math.round(s);
  document.getElementById('sb-mood').textContent = getMoodEmoji(s) + ' Mood: ' + Math.round(s);

  let tag, color;
  if (s >= 80) { tag = 'Feeling Great! 🌟'; color = 'var(--acc)'; }
  else if (s >= 60) { tag = 'Doing Well 😊'; color = 'var(--acc)'; }
  else if (s >= 40) { tag = 'A Bit Tired 😐'; color = 'var(--warn)'; }
  else if (s >= 20) { tag = 'Getting Stressed 😟'; color = 'var(--danger)'; }
  else { tag = 'Need a Break! 😤'; color = 'var(--danger)'; }

  document.getElementById('mood-tag').textContent = tag;
  document.getElementById('mood-tag').style.color = color;
  document.getElementById('bar-focus').style.width = Math.min(100, s + 5) + '%';
  document.getElementById('pct-focus').textContent = Math.round(Math.min(100, s + 5)) + '%';
}

function getMoodEmoji(s) {
  if (s >= 80) return '😊'; if (s >= 60) return '🙂'; if (s >= 40) return '😐'; if (s >= 20) return '😟'; return '😤';
}

function drawMoodArc(score) {
  const canvas = document.getElementById('mood-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 110, 60);
  const cx = 55, cy = 58, r = 46;
  const startA = Math.PI, endA = 2 * Math.PI;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, endA);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg4').trim() || '#252840';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Filled arc
  const fillEnd = startA + (score / 100) * Math.PI;
  const grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  if (score >= 60) { grad.addColorStop(0, '#7ee8a2'); grad.addColorStop(1, '#79b8ff'); }
  else if (score >= 30) { grad.addColorStop(0, '#ffb347'); grad.addColorStop(1, '#ff9de2'); }
  else { grad.addColorStop(0, '#ff6b6b'); grad.addColorStop(1, '#ffb347'); }

  ctx.beginPath();
  ctx.arc(cx, cy, r, startA, fillEnd);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/* ═══════════════════════════════════════════
   FRUSTRATION BANNER
═══════════════════════════════════════════ */
function showFrustBanner() {
  const msgs = [
    '<strong>Stuck in a loop?</strong> That\'s brave persistence! Try reading the error message out loud — it often makes more sense that way.',
    '<strong>Same error again?</strong> That means you\'re close! Try commenting out part of your code to isolate the issue.',
    '<strong>Feeling stuck?</strong> Explain your code to a rubber duck — seriously, it works! Talk through what each line does.'
  ];
  document.querySelector('#frust-banner .fb-text').innerHTML = msgs[Z.sameCodeRuns % msgs.length];
  document.getElementById('frust-banner').classList.add('show');
  addFeedback('emotion', '🧘 Frustration Detected — You\'re Okay!',
    'Hitting the same wall repeatedly is a sign you\'re wrestling with something real. Take a 2-minute break, come back, and try reading the error message one word at a time. I believe in you!');
  if (Z.voice) speak('I can see you are stuck on the same issue. That is perfectly normal! Let me tell you a secret — even senior engineers get stuck for hours. Take a breath, and let us try a new approach together.');
}

/* ═══════════════════════════════════════════
   TIPS ENGINE
═══════════════════════════════════════════ */
const TIPS = {
  javascript: ['Arrow functions: `const fn = () => value` is shorthand for function.',
    'Use `const` by default, `let` when you need to reassign — avoid `var`.',
    'Optional chaining `?.` prevents "cannot read property of undefined" errors.',
    'Template literals `\`Hello ${name}\`` are cleaner than string concatenation.',
    'Destructuring: `const {a, b} = obj` extracts multiple values cleanly.'],
  python: ['Python uses indentation to define code blocks — be consistent!',
    'Use f-strings: `f"Hello {name}"` instead of format() for clarity.',
    'List comprehensions: `[x*2 for x in list]` are Pythonic and fast.',
    'Use `enumerate()` when you need both index and value in a loop.',
    'Virtual environments keep your project dependencies clean.'],
  html: ['Always add `alt` text to images for accessibility.',
    'Use semantic tags: `<header>`, `<main>`, `<footer>` instead of just `<div>`.',
    'Meta viewport tag makes your page mobile-friendly.',
    'Use `<label for="id">` to make form inputs more accessible.',
    '`<button>` has built-in keyboard accessibility — prefer it over `<div onclick>`.'],
  css: ['CSS custom properties `--primary: #fff` make themes easy to change.',
    'Flexbox `display:flex` solves most layout problems elegantly.',
    'Mobile-first design: write base CSS for mobile, then add media queries.',
    '`box-sizing: border-box` makes sizing intuitive — apply globally.',
    'CSS Grid is powerful for 2D layouts — `grid-template-columns: repeat(3, 1fr)`.'],
  c: ['Always initialize variables — uninitialized variables can have garbage values.',
    'Free heap memory with `free()` for every `malloc()` to prevent memory leaks.',
    'Use `sizeof()` instead of hardcoding type sizes for portability.',
    'Null-terminate strings: C strings need \'\\0\' at the end.',
    'Check return values of functions like `scanf()` — they can fail.'],
  cpp: ['Prefer `std::string` over `char[]` arrays for safer string handling.',
    'Use RAII: resource acquisition in constructor, release in destructor.',
    'Smart pointers (`unique_ptr`, `shared_ptr`) prevent memory leaks.',
    'Range-based for loops: `for(auto& item : vec)` are clean and safe.',
    'Mark functions `const` if they don\'t modify the object state.']
};

function autoSuggestTip() {
  const tips = TIPS[Z.lang] || TIPS.javascript;
  const tip = tips[Math.floor(Math.random() * tips.length)];
  document.getElementById('smart-tip').innerHTML = '💡 ' + tip;
}

/* ═══════════════════════════════════════════
   OUTPUT & FEEDBACK
═══════════════════════════════════════════ */
function logOutput(type, msg) {
  const log = document.getElementById('output-log');
  const div = document.createElement('div');
  div.className = 'll';
  const icons = { err: '✗', suc: '✓', warn: '⚠', info: '›' };
  const cls = { err: 'll-err', suc: 'll-suc', warn: 'll-warn', info: 'll-info' };
  div.innerHTML = `<span class="ll-p">${icons[type] || '›'}</span><span class="ll-t ${cls[type] || 'll-info'}">${esc(msg)}</span>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  if (log.children.length > 100) log.removeChild(log.children[0]);
}
function clearOutput() {
  document.getElementById('output-log').innerHTML = '<div class="ll"><span class="ll-p">›</span><span class="ll-t ll-info">Output cleared.</span></div>';
}

function addFeedback(type, title, body) {
  const log = document.getElementById('feedback-log');
  const card = document.createElement('div');
  const typeMap = { error: 'type-error', motivate: 'type-motivate', hint: 'type-hint', break: 'type-break', emotion: 'type-emotion' };
  const badgeMap = { error: 'b-err', motivate: 'b-mot', hint: 'b-hint', break: 'b-brk', emotion: 'b-emo' };
  const labelMap = { error: '⚠ Error Help', motivate: '✨ Encouragement', hint: '💡 Hint', break: '⏸ Break Time', emotion: '😊 Emotion Support' };
  card.className = `fb-card ${typeMap[type] || 'type-motivate'}`;
  card.innerHTML = `<div class="fb-badge ${badgeMap[type] || 'b-mot'}">${labelMap[type] || 'Note'}</div><div class="fb-title">${esc(title)}</div><div class="fb-body">${esc(body)}</div>`;
  log.appendChild(card);
  log.scrollTop = log.scrollHeight;
  if (log.children.length > 30) log.removeChild(log.children[0]);
}

function clearEmotionFeed() {
  document.getElementById('emotion-feed').innerHTML = '<div class="emo-feed-card"><div class="emo-row"><div class="emo-big-face">📷</div><div class="emo-text"><div class="emo-detected">Watching...</div><div class="emo-tip">Emotion feed cleared.</div></div></div></div>';
}

/* ═══════════════════════════════════════════
   VOICE ASSISTANT
═══════════════════════════════════════════ */
function toggleVoice() {
  Z.voice = !Z.voice;
  const btn = document.getElementById('voice-btn');
  document.getElementById('sb-voice').textContent = Z.voice ? '🔊 Voice On' : '🔇 Voice Off';
  btn.textContent = Z.voice ? '🔊' : '🔇';
  btn.style.background = Z.voice ? 'rgba(126,232,162,0.12)' : '';
  btn.style.borderColor = Z.voice ? 'var(--acc)' : '';
  if (Z.voice) speak('Hello! MitraIDE — मित्र voice assistant is active. I\'ll guide you with audio support while you code!');
}
function speak(text) {
  if (!Z.voice || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92; u.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
function toggleTheme() {
  Z.theme = Z.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', Z.theme);
  const themeBtn = document.querySelector('[title*="Theme"]');
  if (themeBtn) themeBtn.innerHTML = Z.theme === 'dark' ? '<i class="codicon codicon-color-mode"></i>' : '<i class="codicon codicon-color-mode"></i>';
  localStorage.setItem('zc-theme', Z.theme);
  setTimeout(() => drawMoodArc(Z.mood), 50);
}

/* ═══════════════════════════════════════════
   SAVE / LOAD
═══════════════════════════════════════════ */
function autoSave() {
  clearTimeout(Z.saveTimer);
  Z.saveTimer = setTimeout(() => saveCode(true), 2500);
}
function saveCode(silent = false) {
  const code = document.getElementById('code-editor').value;
  localStorage.setItem(`zc-code-${Z.lang}`, code);
  if (!silent) showToast('💾 Code saved!');
}
function loadCode(lang) {
  lang = lang || Z.lang;
  const saved = localStorage.getItem(`zc-code-${lang}`);
  document.getElementById('code-editor').value = saved || STARTER[lang] || '';
  updateLineNums();
}

/* ═══════════════════════════════════════════
   SESSION TIMER
═══════════════════════════════════════════ */
function startSessionTimer() {
  setInterval(() => {
    const m = Math.floor((Date.now() - Z.sessionStart) / 60000);
    document.getElementById('s-time').textContent = m >= 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}m`;
    if (m > 0 && m % 25 === 0) {
      addFeedback('break', '⏱ Pomodoro Break Time!', 'You\'ve coded for 25 minutes! Take a 5-minute break — stand up, look out a window, hydrate. Breaks make you a better programmer!');
      if (Z.voice) speak('Time for a quick break! You\'ve been coding for 25 minutes. Stand up, stretch, and come back fresh!');
    }
  }, 60000);
}

/* ═══════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════ */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}
function closeTab(e, name) {
  e.stopPropagation();
  const tab = e.target.closest('.file-tab');
  if (tab) {
    // If it's active, switch to another tab first
    if (tab.classList.contains('active')) {
      const nextTab = tab.nextElementSibling || tab.previousElementSibling;
      if (nextTab && nextTab.classList.contains('lt')) {
        switchLang(nextTab.dataset.lang);
        nextTab.classList.add('active');
      } else {
        // No tabs left
        document.getElementById('code-editor').value = '// No files open';
        document.getElementById('bc-filename').textContent = 'Welcome';
      }
    }
    tab.remove();
  }
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}