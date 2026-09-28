// 기술 분류표 — 프로젝트 케이스의 `관련 기술:` 항목을 능력치 분야로 나눈다.
// (기획 docs/01-planning/profile-and-life.md §4.3 · §4.4)
//
//   [분야, 종류, 표시 이름?]
//   분야  backend · frontend · ai · data · infra · security · null(능력치에 넣지 않음)
//   종류  tool     — 스킬 배지로 보여 준다 (React, Docker …)
//         language — 언어 배지 줄에 보여 준다
//         concept  — 배지로는 안 보이고 능력치 계산에만 쓴다 (회귀, 키 관리 …)
//         skip     — 어디에도 쓰지 않는다 (프로젝트 이름, 알고리즘 문제 유형 등)
//
// 표에 없는 항목이 `관련 기술:` 에 나타나면 빌드가 경고한다. 여기에 한 줄 추가하면 된다.
// 키는 경로를 뗀 끝 이름 그대로 (예: 01 Knowledge DB/…/Docker → Docker).

export const DOMAINS = {
  backend: '백엔드',
  frontend: '프론트엔드',
  ai: 'AI · ML',
  data: '데이터',
  infra: '인프라',
  security: '보안',
}

export const SKILLS = {
  // ── 백엔드 ──────────────────────────────────────────
  'FastAPI': ['backend', 'tool'],
  'Django': ['backend', 'tool'],
  'Spring Boot': ['backend', 'tool'],
  'PostgreSQL': ['backend', 'tool'],
  'MariaDB': ['backend', 'tool'],
  'SQLite': ['backend', 'tool'],
  'Redis': ['backend', 'tool'],
  'SQLAlchemy': ['backend', 'tool'],
  'Alembic': ['backend', 'tool'],
  'Supabase': ['backend', 'tool'],
  'JWT': ['backend', 'tool'],
  'API': ['backend', 'concept'],
  'Database Transaction': ['backend', 'concept'],
  'Schema Migration': ['backend', 'concept'],
  'FastAPI Streaming': ['backend', 'concept'],
  'Streaming Response Normalization': ['backend', 'concept'],
  'Fallback Strategy': ['backend', 'concept'],

  // ── 프론트엔드 ──────────────────────────────────────
  'React': ['frontend', 'tool'],
  'Next.js': ['frontend', 'tool'],
  'Vite': ['frontend', 'tool'],
  'Redux': ['frontend', 'tool'],
  'Zustand': ['frontend', 'tool'],
  'Tailwind CSS': ['frontend', 'tool'],
  'Android': ['frontend', 'tool'],
  'Frontend': ['frontend', 'concept'],
  'Android Activity': ['frontend', 'concept'],
  'Android Local Database': ['frontend', 'concept'],
  'Android Widget': ['frontend', 'concept'],

  // ── AI · ML ─────────────────────────────────────────
  'PyTorch': ['ai', 'tool'],
  'Scikit-Learn Pipeline': ['ai', 'tool', 'scikit-learn'],
  'ONNX Runtime': ['ai', 'tool'],
  'Triton Inference Server': ['ai', 'tool'],
  'NVIDIA NeMo': ['ai', 'tool'],
  'Ollama': ['ai', 'tool'],
  'OpenRouter': ['ai', 'tool'],
  'Anthropic Claude API': ['ai', 'tool', 'Claude API'],
  'Claude Code': ['ai', 'tool'],
  'MLflow Model Registry': ['ai', 'tool', 'MLflow'],
  'NVIDIA Stack': ['ai', 'concept'],
  'LLM': ['ai', 'concept'],
  'RAG': ['ai', 'concept'],
  'Embedding Model': ['ai', 'concept'],
  'Document Chunking': ['ai', 'concept'],
  'Local LLM Runtime': ['ai', 'concept'],
  'Agent Runtime': ['ai', 'concept'],
  'Classification and Evaluation': ['ai', 'concept'],
  'Regression': ['ai', 'concept'],
  'Neural Networks': ['ai', 'concept'],
  'CNN': ['ai', 'concept'],
  'LSTM': ['ai', 'concept'],
  'GRU': ['ai', 'concept'],
  'Decision Tree': ['ai', 'concept'],
  'Random Forest': ['ai', 'concept'],
  'Support Vector Machine': ['ai', 'concept'],
  'SMOTE': ['ai', 'concept'],
  'AutoML': ['ai', 'concept'],
  'Computer Vision': ['ai', 'concept'],
  'Image Segmentation': ['ai', 'concept'],
  'Segmentation Metrics': ['ai', 'concept'],
  'Data Augmentation': ['ai', 'concept'],
  'Text Classification': ['ai', 'concept'],
  'Korean Text Analysis': ['ai', 'concept'],
  'Time Series Forecasting': ['ai', 'concept'],
  'Recommendation System': ['ai', 'concept'],
  'Experiment Tracking': ['ai', 'concept'],
  'Model Artifact': ['ai', 'concept'],
  'Model Optimization': ['ai', 'concept'],

  // ── 데이터 ──────────────────────────────────────────
  'Pandas': ['data', 'tool'],
  'NumPy': ['data', 'tool'],
  'Matplotlib': ['data', 'tool'],
  'Seaborn': ['data', 'tool'],
  'Plotly': ['data', 'tool'],
  'BeautifulSoup': ['data', 'tool'],
  'Selenium': ['data', 'tool'],
  'RDKit': ['data', 'tool'],
  'PubChem': ['data', 'tool'],
  'Python Data Analysis Stack': ['data', 'concept'],
  'Data Preprocessing': ['data', 'concept'],
  'Exploratory Data Analysis': ['data', 'concept'],
  'Feature Scaling': ['data', 'concept'],
  'Feature Engineering': ['data', 'concept'],
  'Data Visualization': ['data', 'concept'],
  'Descriptive Statistics': ['data', 'concept'],
  'Kaggle Workflow': ['data', 'concept'],
  'SQL Aggregation': ['data', 'concept'],
  'SQL JOIN': ['data', 'concept'],
  'Web Crawling': ['data', 'concept'],
  'Word Cloud': ['data', 'concept'],
  'JSONL': ['data', 'concept'],
  'Data Engineering': ['data', 'concept'],
  'Customer Analytics': ['data', 'concept'],
  'User Segmentation': ['data', 'concept'],
  'Product Analytics': ['data', 'concept'],
  'Backtesting': ['data', 'concept'],
  'Technical Indicator': ['data', 'concept'],

  // ── 인프라 ──────────────────────────────────────────
  'Docker': ['infra', 'tool'],
  'Kubernetes': ['infra', 'tool'],
  'Kubeflow': ['infra', 'tool'],
  'Nginx': ['infra', 'tool'],
  'MinIO': ['infra', 'tool'],
  'LakeFS': ['infra', 'tool'],
  'Cloudflare': ['infra', 'tool'],
  'Cloudflare R2': ['infra', 'tool'],
  'Vercel': ['infra', 'tool'],
  'n8n Queue Mode': ['infra', 'tool', 'n8n'],
  'Linux Operations': ['infra', 'concept'],
  'MLOps Platform': ['infra', 'concept'],
  'Model Deployment': ['infra', 'concept'],
  'Object Storage': ['infra', 'concept'],
  'Structured Logging': ['infra', 'concept'],
  'Runbook': ['infra', 'concept'],
  'Workflow Automation': ['infra', 'concept'],

  // ── 보안 ────────────────────────────────────────────
  'Google OAuth': ['security', 'tool'],
  'Key Management': ['security', 'concept'],
  'Model Encryption': ['security', 'concept'],
  'Model Packaging': ['security', 'concept'],
  'Hash and Message Authentication': ['security', 'concept'],
  'Hybrid Cryptography': ['security', 'concept'],
  'TEE': ['security', 'concept'],
  'Access Control': ['security', 'concept'],
  'Audit Log': ['security', 'concept'],
  'Tool Allowlist': ['security', 'concept'],
  'Memory Allocation': ['security', 'concept'],

  // ── 언어 (능력치에는 넣지 않는다 — 한 언어가 여러 분야에 걸친다) ──
  'Python': [null, 'language'],
  'TypeScript': [null, 'language'],
  'Rust': [null, 'language'],
  'SQL': [null, 'language'],

  // ── 쓰지 않음 ───────────────────────────────────────
  'SecuAI Model Security Platform': [null, 'skip'],   // 프로젝트 이름
  'Product Strategy': [null, 'skip'],                 // 6개 분야 밖
  'Hash Table Lookup': [null, 'skip'],                // 코딩 테스트 문제 유형
  'Stable Sorting': [null, 'skip'],
  'Stack Pattern Matching': [null, 'skip'],
}
