import { useEffect, useMemo, useState } from 'react';

const statuses = ['想法池', '待立项', '验证中', '执行中', '暂停', '完成', '放弃'];
const activeStatuses = ['待立项', '验证中', '执行中'];
const priorities = ['低', '中', '高', '最高'];
const taskStatuses = ['待办', '进行中', '已完成'];
const aiSources = ['ChatGPT', 'WorkBuddy', 'Codex', 'Claude', '飞书CEO'];

const emptyProject = {
  name: '',
  description: '',
  status: '想法池',
  priority: '中',
  currentGoal: '',
  nextAction: '',
  nextActionDueDate: '',
  owner: '',
  score: {
    moneySpeed: 50,
    successProbability: 50,
    costEfficiency: 50,
    interest: 50,
    longTermValue: 50
  },
  decisions: [],
  tasks: [],
  discussions: [],
  aiSuggestions: [],
  timeline: []
};

/* ───────── helpers ───────── */

function createItem(fields) {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...fields };
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(value));
}

function daysSince(value) {
  if (!value) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

function getScore(project) {
  const score = project.score ?? emptyProject.score;
  const values = [
    score.moneySpeed, score.successProbability,
    score.costEfficiency, score.interest, score.longTermValue
  ].map((v) => Number(v) || 0);
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function priorityWeight(priority) {
  return { 最高: 4, 高: 3, 中: 2, 低: 1 }[priority] ?? 0;
}

function getMoneyProbability(project) {
  const score = project.score ?? emptyProject.score;
  return Math.round(((Number(score.moneySpeed) || 0) + (Number(score.successProbability) || 0)) / 2);
}

function getProjectRisk(project) {
  if (project.status === '暂停') return '项目已暂停，需要明确继续/放弃条件';
  if (!project.nextAction) return '缺少下一步行动，项目无法推进';
  if (daysSince(project.updatedAt) > 7) return '超过 7 天未更新，可能已经失焦';
  if ((project.score?.costEfficiency ?? 50) < 35) return '投入成本偏高，需要缩小验证范围';
  if ((project.score?.successProbability ?? 50) < 35) return '成功概率偏低，需要重新验证假设';
  return '';
}

function buildAIAdvice(projects) {
  const activeProjects = projects.filter((p) => !['完成', '放弃'].includes(p.status));
  const top = [...activeProjects].sort((a, b) => getScore(b) - getScore(a))[0];
  const risky = activeProjects.find((p) => getProjectRisk(p));
  const noAction = activeProjects.find((p) => !p.nextAction);
  const fastMoney = [...activeProjects].sort((a, b) => (b.score?.moneySpeed ?? 0) - (a.score?.moneySpeed ?? 0))[0];

  return [
    {
      role: 'CEO',
      suggestion: risky ? `暂停或重判「${risky.name}」` : top ? `集中资源推进「${top.name}」` : '先创建一个核心项目',
      reason: risky ? getProjectRisk(risky) : top ? `综合评分 ${getScore(top)} 分，是当前最高价值项目` : '没有项目就无法形成经营闭环',
      nextStep: risky ? '今天做出继续/暂停/放弃决定' : top?.nextAction || '补齐项目名称、目标和下一步行动',
      projectId: risky?.id ?? top?.id
    },
    {
      role: 'PM',
      suggestion: noAction ? `为「${noAction.name}」补充下一步行动` : '把今日任务控制在 3 件以内',
      reason: noAction ? '没有下一步行动的项目无法进入执行态' : '个人创业最怕任务分散',
      nextStep: noAction ? '写一个 30 分钟内能完成的动作' : '从驾驶舱下一步行动中选择最关键任务',
      projectId: noAction?.id
    },
    {
      role: '市场',
      suggestion: fastMoney ? `优先验证「${fastMoney.name}」的付费信号` : '先找一个最快能产生现金流的项目',
      reason: fastMoney ? `赚钱速度评分 ${fastMoney.score?.moneySpeed ?? 0}` : '没有现金流信号，项目优先级会失真',
      nextStep: fastMoney?.nextAction || '设计一个最小付费验证动作',
      projectId: fastMoney?.id
    },
    {
      role: '运营',
      suggestion: '每天只维护最新更新和风险提醒',
      reason: 'SoloOS 应该推进项目，而不是制造填表负担',
      nextStep: '更新今天完成了什么、卡在哪里、下一步做什么',
      projectId: top?.id
    }
  ];
}

function withTimeline(project, event, content) {
  return {
    ...project,
    timeline: [createItem({ event, content }), ...(project.timeline ?? [])]
  };
}

function normalizeProject(project) {
  return {
    ...emptyProject,
    ...project,
    status: statuses.includes(project.status) ? project.status : '想法池',
    priority: priorities.includes(project.priority) ? project.priority : '中',
    currentGoal: project.currentGoal ?? '',
    nextActionDueDate: project.nextActionDueDate ?? '',
    score: { ...emptyProject.score, ...(project.score ?? {}) },
    decisions: project.decisions ?? [],
    tasks: (project.tasks ?? []).map((t) => ({ ...t, status: t.status ?? (t.done ? '已完成' : '待办') })),
    discussions: project.discussions ?? [],
    aiSuggestions: (project.aiSuggestions ?? []).map((s) => ({
      ...s, source: s.source ?? 'Codex', adopted: Boolean(s.adopted)
    })),
    timeline: project.timeline ?? []
  };
}

/* ───────── App ───────── */

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState('dashboard');
  const [form, setForm] = useState(emptyProject);
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState({
    decision: '', decisionReason: '', decisionResult: '', task: '', discussion: '',
    aiSuggestion: '', aiSource: 'Codex'
  });
  const [todayTasks, setTodayTasks] = useState([]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId),
    [projects, selectedId]
  );

  /* ── computed ── */

  const rankedProjects = useMemo(() =>
    [...projects]
      .filter((p) => !['完成', '放弃'].includes(p.status))
      .sort((a, b) => {
        const sa = getScore(a), sb = getScore(b);
        if (sb !== sa) return sb - sa;
        return priorityWeight(b.priority) - priorityWeight(a.priority);
      }),
    [projects]
  );

  const topProject = rankedProjects[0];

  const moneyRanked = useMemo(() =>
    [...projects]
      .filter((p) => !['完成', '放弃'].includes(p.status))
      .sort((a, b) => (b.score?.moneySpeed ?? 0) - (a.score?.moneySpeed ?? 0)),
    [projects]
  );

  const blockedDecisions = useMemo(() =>
    projects
      .filter((p) => p.status === '暂停' || daysSince(p.updatedAt) > 3)
      .filter((p) => !['完成', '放弃'].includes(p.status))
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        days: daysSince(p.updatedAt),
        nextAction: p.nextAction
      })),
    [projects]
  );

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => activeStatuses.includes(p.status)).length,
    paused: projects.filter((p) => p.status === '暂停').length,
    completed: projects.filter((p) => p.status === '完成').length,
    ideas: projects.filter((p) => p.status === '想法池').length
  }), [projects]);

  /* ── lifecycle ── */

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    setForm(selectedProject ? normalizeProject(selectedProject) : emptyProject);
  }, [selectedProject]);

  async function loadProjects() {
    const next = (await window.soloOS.listProjects()).map(normalizeProject);
    setProjects(next);
  }

  function selectProject(projectId) {
    setSelectedId(projectId);
    setView('project');
    setMessage('');
  }

  function createProject() {
    setSelectedId('');
    setForm(emptyProject);
    setView('project');
    setMessage('正在新增项目');
  }

  function updateForm(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  function updateScore(key, value) {
    setForm((c) => ({ ...c, score: { ...c.score, [key]: Number(value) } }));
  }

  async function saveProject(nextForm = form, notice = '项目已保存') {
    setMessage('');
    try {
      if (selectedProject) {
        let payload = normalizeProject(nextForm);
        if (selectedProject.status !== payload.status) {
          payload = withTimeline(payload, '修改状态', `${selectedProject.status} → ${payload.status}`);
        }
        const updated = await window.soloOS.updateProject(selectedProject.id, payload);
        setProjects((c) => c.map((p) => (p.id === updated.id ? normalizeProject(updated) : p)));
        setSelectedId(updated.id);
        setMessage(notice);
        return updated;
      }
      const payload = withTimeline(normalizeProject(nextForm), '创建项目', nextForm.name || '未命名项目');
      const created = await window.soloOS.createProject(payload);
      setProjects((c) => [normalizeProject(created), ...c]);
      setSelectedId(created.id);
      setMessage('项目已新增');
      return created;
    } catch (error) {
      setMessage(error.message);
      return null;
    }
  }

  async function deleteProject() {
    if (!selectedProject) return;
    if (!window.confirm(`确认删除「${selectedProject.name}」吗？`)) return;
    if (!window.confirm('删除后只能通过 Git 历史恢复。再次确认删除。')) return;
    await window.soloOS.deleteProject(selectedProject.id);
    setProjects((c) => c.filter((p) => p.id !== selectedProject.id));
    setSelectedId('');
    setView('dashboard');
    setMessage('项目已删除');
  }

  function updateDraft(key, value) {
    setDrafts((c) => ({ ...c, [key]: value }));
  }

  function addRecord(key, item, event, content) {
    const text = String(item.content ?? item.title ?? '').trim();
    if (!text) return;
    setForm((c) => withTimeline({
      ...c, [key]: [createItem(item), ...(c[key] ?? [])]
    }, event, content));
  }

  function addTask() {
    if (!drafts.task.trim()) return;
    addRecord('tasks', { title: drafts.task, status: '待办' }, '新增任务', drafts.task);
    updateDraft('task', '');
  }

  function updateTask(taskId, key, value) {
    setForm((c) => {
      const task = c.tasks.find((t) => t.id === taskId);
      const next = {
        ...c,
        tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, [key]: value } : t))
      };
      if (key === 'status' && value === '已完成' && task?.status !== '已完成') {
        return withTimeline(next, '完成任务', task.title);
      }
      return next;
    });
  }

  function updateAiSuggestion(suggestionId, key, value) {
    setForm((c) => ({
      ...c,
      aiSuggestions: c.aiSuggestions.map((s) =>
        s.id === suggestionId ? { ...s, [key]: value } : s
      )
    }));
  }

  /* ── render ── */

  return (
    <main className="shell">
      <Sidebar
        view={view} setView={setView}
        createProject={createProject}
        rankedProjects={rankedProjects}
        selectedId={selectedId}
        selectProject={selectProject}
      />
      <section className="workspace">
        {message && <div className="notice">{message}</div>}
        {view === 'dashboard' && (
          <Dashboard
            projects={projects}
            stats={stats}
            topProject={topProject}
            moneyRanked={moneyRanked}
            rankedProjects={rankedProjects}
            blockedDecisions={blockedDecisions}
            selectProject={selectProject}
            createProject={createProject}
            todayTasks={todayTasks}
            setTodayTasks={setTodayTasks}
          />
        )}
        {view === 'advice' && (
          <AIAdviceCenter
            projects={projects}
            selectProject={selectProject}
          />
        )}
        {view === 'project' && (
          <ProjectDetail
            project={selectedProject}
            form={form}
            updateForm={updateForm}
            updateScore={updateScore}
            saveProject={saveProject}
            deleteProject={deleteProject}
            drafts={drafts}
            updateDraft={updateDraft}
            addRecord={addRecord}
            addTask={addTask}
            updateTask={updateTask}
            updateAiSuggestion={updateAiSuggestion}
          />
        )}
        {view === 'today' && (
          <TodayWorkbench
            rankedProjects={rankedProjects}
            blockedDecisions={blockedDecisions}
            selectProject={selectProject}
            todayTasks={todayTasks}
            setTodayTasks={setTodayTasks}
          />
        )}
        {view === 'ai' && (
          <AICenter
            projects={projects}
            selectProject={selectProject}
          />
        )}
      </section>
    </main>
  );
}

/* ────────── Sidebar ────────── */

function Sidebar({ view, setView, createProject, rankedProjects, selectedId, selectProject }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo">S</span>
        <div>
          <h1>SoloOS</h1>
          <p>一人公司操作系统</p>
        </div>
      </div>

      <nav className="nav">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
          <span className="nav-icon">🏠</span> 驾驶舱
        </button>
        <button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>
          <span className="nav-icon">📋</span> 今日工作台
        </button>
        <button className={view === 'ai' ? 'active' : ''} onClick={() => setView('ai')}>
          <span className="nav-icon">🤖</span> AI 员工中心
        </button>
        <button className={view === 'advice' ? 'active' : ''} onClick={() => setView('advice')}>
          <span className="nav-icon">🧠</span> AI 建议中心
        </button>
      </nav>

      <button className="primary full" onClick={createProject}>+ 新增项目</button>

      <div className="sidebar-projects">
        <p className="sidebar-label">活跃项目</p>
        {rankedProjects.slice(0, 6).map((p) => (
          <button
            key={p.id}
            className={`sidebar-project ${p.id === selectedId ? 'active' : ''}`}
            onClick={() => selectProject(p.id)}
          >
            <span className="status-dot" data-status={p.status} />
            <span className="sp-name">{p.name}</span>
            <span className="sp-score">{getScore(p)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ────────── Dashboard ────────── */

function Dashboard({
  projects, stats, topProject, moneyRanked, rankedProjects,
  blockedDecisions, selectProject, createProject,
  todayTasks, setTodayTasks
}) {
  const today = new Date();
  const dateStr = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }).format(today);
  const aiAdvice = buildAIAdvice(projects);
  const riskAlerts = rankedProjects
    .map((project) => ({ ...project, risk: getProjectRisk(project) }))
    .filter((project) => project.risk)
    .slice(0, 4);
  const recentUpdates = [...projects]
    .sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0))
    .slice(0, 5);
  const primaryTask = todayTasks[0] ?? (topProject?.nextAction ? {
    title: topProject.nextAction,
    project: topProject.name,
    estimate: '今日推进'
  } : null);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">BOSS DASHBOARD</p>
          <h2>{dateStr}</h2>
        </div>
        <div className="topbar-stats">
          <span className="topstat">{stats.active} 活跃</span>
          <span className="topstat warn">{stats.paused} 暂停</span>
          <span className="topstat ok">{stats.completed} 完成</span>
        </div>
      </header>

      <section className="dash-grid">
        {/* ── 今日焦点 ── */}
        <article className="dash-card dash-focus">
          <div className="card-header">
            <h3>🎯 今日最重要任务</h3>
            <span className="card-badge">聚焦</span>
          </div>
          {!primaryTask ? (
            <div className="focus-empty">
              <p>还没有今日任务</p>
              <p className="muted">从下方「下一步行动」中选择任务</p>
            </div>
          ) : (
            <div className="focus-list">
              <div className="focus-item priority-0">
                <span className="focus-num">1</span>
                <div>
                  <strong>{primaryTask.title}</strong>
                  <small>{primaryTask.project} · {primaryTask.estimate || '今日推进'}</small>
                </div>
                {todayTasks.length > 0 && (
                  <button className="focus-done" onClick={() =>
                    setTodayTasks((prev) => prev.slice(1))
                  }>✓</button>
                )}
              </div>
              {todayTasks.slice(1, 3).map((t, i) => (
                <div key={t.title} className={`focus-item priority-${i + 1}`}>
                  <span className="focus-num">{i + 2}</span>
                  <div>
                    <strong>{t.title}</strong>
                    <small>{t.project} · 预计 {t.estimate || '?'}</small>
                  </div>
                  <button className="focus-done" onClick={() =>
                    setTodayTasks((prev) => prev.filter((_, j) => j !== i))
                  }>✓</button>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* ── 项目雷达 ── */}
        <article className="dash-card dash-radar">
          <div className="card-header">
            <h3>📊 项目雷达</h3>
          </div>
          <ProjectRadar2D projects={rankedProjects} selectProject={selectProject} />
          <div className="radar-hint">
            <span>X轴：赚钱速度</span>
            <span>Y轴：成功概率</span>
          </div>
        </article>

        {/* ── 项目状态快照 ── */}
        <article className="dash-card dash-snapshot">
          <div className="card-header">
            <h3>⚡ 项目状态</h3>
          </div>
          <div className="snapshot-grid">
            {rankedProjects.slice(0, 6).map((p) => (
              <button key={p.id} className="snapshot-item" onClick={() => selectProject(p.id)}>
                <span className={`snapshot-dot ${p.status === '暂停' ? 'red' : p.status === '想法池' ? 'yellow' : 'green'}`} />
                <span className="snap-name">{p.name}</span>
                <span className="snap-status">{p.status}</span>
                <span className="snap-days">{daysSince(p.updatedAt) === 0 ? '今天' : `${daysSince(p.updatedAt)}天前`}</span>
              </button>
            ))}
          </div>
        </article>

        {/* ── 下一步行动 ── */}
        <article className="dash-card dash-actions">
          <div className="card-header">
            <h3>⚡ 下一步行动</h3>
          </div>
          <div className="action-list">
            {rankedProjects
              .filter((p) => p.nextAction)
              .slice(0, 5)
              .map((p) => (
                <div key={p.id} className="action-item">
                  <button className="action-btn" onClick={() => {
                    const exists = todayTasks.find((t) => t.title === p.nextAction);
                    if (!exists && todayTasks.length < 3) {
                      setTodayTasks((prev) => [...prev, { title: p.nextAction, project: p.name, estimate: '?' }]);
                    }
                  }}>+</button>
                  <div className="action-body">
                    <strong>{p.nextAction}</strong>
                    <small>{p.name} · {p.status}</small>
                  </div>
                  <button className="action-goto" onClick={() => selectProject(p.id)}>→</button>
                </div>
              ))}
          </div>
        </article>

        {/* ── AI 建议 ── */}
        <article className="dash-card dash-ai-advice">
          <div className="card-header">
            <h3>🧠 AI 建议中心</h3>
            <span className="card-badge">自动</span>
          </div>
          <div className="advice-list compact">
            {aiAdvice.map((advice) => (
              <button
                key={advice.role}
                className="advice-item"
                onClick={() => advice.projectId && selectProject(advice.projectId)}
              >
                <span className="advice-role">{advice.role}</span>
                <div>
                  <strong>{advice.suggestion}</strong>
                  <small>原因：{advice.reason}</small>
                  <small>下一步：{advice.nextStep}</small>
                </div>
              </button>
            ))}
          </div>
        </article>

        {/* ── 需要决策 ── */}
        <article className="dash-card dash-decisions">
          <div className="card-header">
            <h3>⚠️ 需要决策</h3>
            <span className="card-badge warn">{blockedDecisions.length}</span>
          </div>
          {blockedDecisions.length === 0 ? (
            <p className="muted">所有项目都在正常推进</p>
          ) : (
            blockedDecisions.map((b) => (
              <button key={b.id} className="decision-item" onClick={() => selectProject(b.id)}>
                <span className={`snapshot-dot ${b.days > 7 ? 'red' : 'yellow'}`} />
                <div>
                  <strong>{b.name}</strong>
                  <small>{b.status === '暂停' ? '已暂停' : `${b.days}天未更新`} · {b.nextAction || '无下一步行动'}</small>
                </div>
                <span className="decision-arrow">→</span>
              </button>
            ))
          )}
        </article>

        {/* ── 风险提醒 ── */}
        <article className="dash-card dash-risks">
          <div className="card-header">
            <h3>🚨 风险提醒</h3>
            <span className="card-badge warn">{riskAlerts.length}</span>
          </div>
          {riskAlerts.length === 0 ? (
            <p className="muted">暂无明显风险</p>
          ) : (
            riskAlerts.map((project) => (
              <button key={project.id} className="risk-item" onClick={() => selectProject(project.id)}>
                <strong>{project.name}</strong>
                <small>{project.risk}</small>
              </button>
            ))
          )}
        </article>

        {/* ── 本周概览 ── */}
        <article className="dash-card dash-weekly">
          <div className="card-header">
            <h3>📈 本周概览</h3>
          </div>
          <div className="weekly-stats">
            <div className="wstat">
              <span className="wstat-num">{stats.total}</span>
              <span className="wstat-label">总项目</span>
            </div>
            <div className="wstat">
              <span className="wstat-num green">{stats.active}</span>
              <span className="wstat-label">进行中</span>
            </div>
            <div className="wstat">
              <span className="wstat-num yellow">{stats.paused}</span>
              <span className="wstat-label">暂停</span>
            </div>
            <div className="wstat">
              <span className="wstat-num">{stats.ideas}</span>
              <span className="wstat-label">想法池</span>
            </div>
          </div>
          <div className="weekly-tip">
            {topProject && (
              <p>💡 建议优先推进 <strong>{topProject.name}</strong> — 综合评分最高 ({getScore(topProject)}分)</p>
            )}
          </div>
        </article>

        {/* ── 最近更新 ── */}
        <article className="dash-card dash-recent">
          <div className="card-header">
            <h3>🕘 最近更新</h3>
          </div>
          <div className="recent-list">
            {recentUpdates.length === 0 ? <p className="muted">暂无项目更新</p> : recentUpdates.map((project) => (
              <button key={project.id} className="recent-row" onClick={() => selectProject(project.id)}>
                <span>{project.name}</span>
                <small>{project.status} · {formatDateTime(project.updatedAt)} · {project.owner || '未指定负责人'}</small>
              </button>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function ProjectRadar2D({ projects, selectProject }) {
  const visibleProjects = projects.slice(0, 8);
  return (
    <div className="radar-2d">
      <span className="axis x-axis">赚钱速度 →</span>
      <span className="axis y-axis">成功概率 ↑</span>
      <span className="quadrant q1">快钱高胜率</span>
      <span className="quadrant q2">慢钱高胜率</span>
      <span className="quadrant q3">慢钱低胜率</span>
      <span className="quadrant q4">快钱低胜率</span>
      {visibleProjects.map((project) => {
        const x = Math.max(8, Math.min(92, project.score?.moneySpeed ?? 50));
        const y = Math.max(8, Math.min(92, project.score?.successProbability ?? 50));
        return (
          <button
            key={project.id}
            className="radar-dot"
            style={{ left: `${x}%`, bottom: `${y}%` }}
            onClick={() => selectProject(project.id)}
            title={`${project.name}：赚钱速度 ${x} / 成功概率 ${y}`}
          >
            {project.name.slice(0, 4)}
          </button>
        );
      })}
    </div>
  );
}

/* ────────── TodayWorkbench ────────── */

function TodayWorkbench({ rankedProjects, blockedDecisions, selectProject, todayTasks, setTodayTasks }) {
  const aiEmployees = [
    { name: 'Codex', role: '首席开发', status: '🟢 就绪', task: '等待任务分配' },
    { name: 'ChatGPT', role: '内容策略', status: '🟢 就绪', task: '等待任务分配' },
    { name: 'Claude', role: '深度分析', status: '🟢 就绪', task: '等待任务分配' },
    { name: 'WorkBuddy', role: '自动化执行', status: '🟡 待命', task: '等待确认' },
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">TODAY WORKBENCH</p>
          <h2>今日工作台</h2>
        </div>
      </header>

      <section className="today-grid">
        {/* 今天只做3件事 */}
        <article className="dash-card today-focus-card">
          <div className="card-header">
            <h3>🎯 今天只做这 3 件事</h3>
            <span className="card-badge">{todayTasks.length}/3</span>
          </div>
          {todayTasks.length === 0 ? (
            <div className="focus-empty">
              <p>从驾驶舱「下一步行动」中添加任务</p>
              <p className="muted">每天最多 3 件，保持聚焦</p>
            </div>
          ) : (
            <div className="focus-list">
              {todayTasks.map((t, i) => (
                <div key={i} className={`focus-item priority-${i}`}>
                  <span className="focus-num">{i + 1}</span>
                  <div>
                    <strong>{t.title}</strong>
                    <small>{t.project} · 预计 {t.estimate || '?'}</small>
                  </div>
                  <button className="focus-done" onClick={() =>
                    setTodayTasks((prev) => prev.filter((_, j) => j !== i))
                  }>✓</button>
                </div>
              ))}
            </div>
          )}
          <p className="today-estimate">
            今日总预计: {todayTasks.length > 0 ? `${todayTasks.length * 1.5}h` : '—'}
          </p>
        </article>

        {/* 卡住的决策 */}
        <article className="dash-card today-decisions">
          <div className="card-header">
            <h3>⚠️ 卡住我的决策</h3>
          </div>
          {blockedDecisions.length === 0 ? (
            <p className="muted">没有阻塞的决策，很好！</p>
          ) : (
            blockedDecisions.map((b) => (
              <button key={b.id} className="decision-item" onClick={() => selectProject(b.id)}>
                <span className={`snapshot-dot ${b.days > 7 ? 'red' : 'yellow'}`} />
                <div>
                  <strong>{b.name}</strong>
                  <small>阻塞 {b.days} 天</small>
                </div>
                <span className="decision-action">现在决定 →</span>
              </button>
            ))
          )}
        </article>

        {/* AI 今日任务 */}
        <article className="dash-card today-ai">
          <div className="card-header">
            <h3>🤖 今天 AI 在做什么</h3>
          </div>
          <div className="ai-today-list">
            {aiEmployees.map((ai) => (
              <div key={ai.name} className="ai-today-item">
                <span className="ai-status-icon">{ai.status.split(' ')[0]}</span>
                <div>
                  <strong>{ai.name}</strong>
                  <small>{ai.role}</small>
                </div>
                <span className="ai-today-task">{ai.task}</span>
              </div>
            ))}
          </div>
        </article>

        {/* 今日笔记 */}
        <article className="dash-card today-notes">
          <div className="card-header">
            <h3>📝 今日随手记</h3>
          </div>
          <textarea className="notes-area" placeholder="想到什么就记下来，自动保存..." />
          <p className="muted" style={{ marginTop: 8 }}>自动保存 ✅ · 关联到今日</p>
        </article>

        {/* 有余力 */}
        <article className="dash-card today-extra">
          <div className="card-header">
            <h3>📋 有余力再做</h3>
          </div>
          <div className="extra-list">
            {rankedProjects
              .filter((p) => p.nextAction)
              .slice(0, 4)
              .map((p) => (
                <div key={p.id} className="extra-item">
                  <span className="extra-dot" />
                  <span>{p.nextAction}</span>
                  <small>{p.name}</small>
                </div>
              ))}
          </div>
        </article>
      </section>
    </>
  );
}

/* ────────── AI Center ────────── */

function AIAdviceCenter({ projects, selectProject }) {
  const aiAdvice = buildAIAdvice(projects);
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI ADVICE CENTER</p>
          <h2>AI 建议中心</h2>
        </div>
        <div className="topbar-stats">
          <span className="topstat">CEO / PM / 市场 / 运营</span>
        </div>
      </header>

      <section className="advice-center-grid">
        {aiAdvice.map((advice) => (
          <article key={advice.role} className="dash-card advice-card">
            <div className="card-header">
              <h3>{advice.role}</h3>
              <span className="card-badge">建议</span>
            </div>
            <h4>{advice.suggestion}</h4>
            <div className="advice-detail">
              <span>原因</span>
              <p>{advice.reason}</p>
            </div>
            <div className="advice-detail">
              <span>下一步</span>
              <p>{advice.nextStep}</p>
            </div>
            <button className="secondary" onClick={() => advice.projectId && selectProject(advice.projectId)}>
              查看相关项目
            </button>
          </article>
        ))}
      </section>
    </>
  );
}

function AICenter({ projects, selectProject }) {
  const fallbackProject = projects[0];
  const employees = [
    {
      name: 'CEO', status: '决策中', project: projects[0]?.name || 'SoloOS', task: '判断今天最该推进的项目', progress: 70,
      updatedAt: '刚刚', log: ['读取项目评分', '识别暂停风险', '输出经营建议']
    },
    {
      name: 'PM', status: '执行中', project: projects[1]?.name || fallbackProject?.name || 'SoloOS', task: '拆解下一步行动', progress: 55,
      updatedAt: '10分钟前', log: ['检查缺失下一步行动', '标记阻塞项目', '生成任务拆解']
    },
    {
      name: '市场', status: '待验证', project: projects[2]?.name || fallbackProject?.name || 'AI机会雷达', task: '验证赚钱速度与需求信号', progress: 35,
      updatedAt: '25分钟前', log: ['扫描高赚钱速度项目', '准备市场验证动作']
    },
    {
      name: '运营', status: '待命', project: projects[3]?.name || fallbackProject?.name || '百家号自动化', task: '整理最近更新和执行日志', progress: 20,
      updatedAt: '1小时前', log: ['等待老板分配任务', '同步项目更新时间']
    }
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI EMPLOYEE CENTER</p>
          <h2>AI 员工中心</h2>
        </div>
        <div className="topbar-stats">
          <span className="topstat">4个AI员工</span>
          <span className="topstat ok">假数据联调版</span>
        </div>
      </header>

      <section className="employee-grid">
        {employees.map((employee) => {
          const relatedProject = projects.find((project) => project.name === employee.project) || fallbackProject;
          return (
            <article key={employee.name} className="dash-card employee-card">
              <div className="employee-head">
                <div>
                  <h3>{employee.name}</h3>
                  <small>{employee.status}</small>
                </div>
                <span className="employee-updated">{employee.updatedAt}</span>
              </div>

              <div className="employee-row">
                <span>当前项目</span>
                <strong>{employee.project}</strong>
              </div>
              <div className="employee-row">
                <span>当前任务</span>
                <strong>{employee.task}</strong>
              </div>
              <div className="employee-progress">
                <span style={{ width: `${employee.progress}%` }} />
              </div>
              <p className="employee-progress-text">进度 {employee.progress}%</p>

              <div className="employee-log">
                <p>执行日志</p>
                {employee.log.map((item) => <small key={item}>• {item}</small>)}
              </div>

              <div className="employee-actions">
                <button className="secondary" onClick={() => relatedProject && selectProject(relatedProject.id)}>查看项目</button>
                <button className="secondary" onClick={() => window.alert(`${employee.name} 日志：\n${employee.log.join('\n')}`)}>查看日志</button>
                <button className="primary" onClick={() => window.alert(`已模拟发送任务给 ${employee.name}：${employee.task}`)}>发送任务</button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

/* ────────── ProjectDetail ────────── */

function ProjectDetail({
  project, form, updateForm, updateScore, saveProject, deleteProject,
  drafts, updateDraft, addRecord, addTask, updateTask, updateAiSuggestion
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">PROJECT DETAIL</p>
          <h2>{project ? project.name : '新增项目'}</h2>
        </div>
        <div className="actions">
          {project && <button className="danger" onClick={deleteProject}>删除</button>}
          <button className="primary" onClick={() => saveProject()}>保存</button>
        </div>
      </header>

      <section className="panel grid two">
        <label>
          项目名称
          <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="例如：AI主题商店" />
        </label>
        <label>
          负责人
          <input value={form.owner} onChange={(e) => updateForm('owner', e.target.value)} placeholder="Owner / Codex / WorkBuddy" />
        </label>
        <label className="wide">
          一句话描述
          <input value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="这个项目解决什么问题？" />
        </label>
        <label>
          当前状态
          <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          优先级
          <select value={form.priority} onChange={(e) => updateForm('priority', e.target.value)}>
            {priorities.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <div className="project-kpi">
          <span>赚钱概率</span>
          <strong>{getMoneyProbability(form)}%</strong>
          <small>由赚钱速度 + 成功概率自动计算</small>
        </div>
        <div className="project-kpi">
          <span>最后更新</span>
          <strong>{formatDateTime(form.updatedAt)}</strong>
          <small>{form.status} · {form.owner || '未指定负责人'}</small>
        </div>
        <label className="wide">
          当前目标
          <textarea value={form.currentGoal} onChange={(e) => updateForm('currentGoal', e.target.value)} placeholder="项目当前最重要目标是什么？" />
        </label>
        <label className="wide next-action-field">
          下一步行动
          <textarea value={form.nextAction} onChange={(e) => updateForm('nextAction', e.target.value)} placeholder="下一步最小可执行动作是什么？" />
        </label>
        <label>
          截止时间
          <input type="date" value={form.nextActionDueDate} onChange={(e) => updateForm('nextActionDueDate', e.target.value)} />
        </label>
        <div className="meta">
          <span>创建：{formatDateTime(form.createdAt)}</span>
          <span>更新：{formatDateTime(form.updatedAt)}</span>
        </div>
      </section>

      <section className="detail-grid">
        <ScorePanel form={form} updateScore={updateScore} />
        <TasksPanel form={form} drafts={drafts} updateDraft={updateDraft} addTask={addTask} updateTask={updateTask} />
        <DecisionPanel
          form={form}
          drafts={drafts}
          updateDraft={updateDraft}
          addRecord={addRecord}
        />
        <AiPanel
          form={form} drafts={drafts} updateDraft={updateDraft}
          addRecord={addRecord} updateAiSuggestion={updateAiSuggestion}
        />
        <RecordPanel
          title="讨论记录"
          placeholder="保存对话和决定"
          value={drafts.discussion}
          setValue={(v) => updateDraft('discussion', v)}
          onAdd={() => {
            addRecord('discussions', { author: 'Owner', content: drafts.discussion }, '新增讨论', drafts.discussion);
            updateDraft('discussion', '');
          }}
          items={form.discussions}
          render={(item) => <p><strong>{item.author}：</strong>{item.content}</p>}
        />
        <TimelinePanel items={form.timeline} />
      </section>
    </>
  );
}

function DecisionPanel({ form, drafts, updateDraft, addRecord }) {
  return (
    <section className="panel record">
      <h3>决策记录</h3>
      <div className="decision-form">
        <input
          value={drafts.decision}
          onChange={(e) => updateDraft('decision', e.target.value)}
          placeholder="决策内容，例如：暂停AI机会雷达"
        />
        <input
          value={drafts.decisionReason}
          onChange={(e) => updateDraft('decisionReason', e.target.value)}
          placeholder="决策原因，例如：投入过高"
        />
        <input
          value={drafts.decisionResult}
          onChange={(e) => updateDraft('decisionResult', e.target.value)}
          placeholder="结果，例如：待验证"
        />
        <button onClick={() => {
          addRecord('decisions', {
            content: drafts.decision,
            reason: drafts.decisionReason,
            result: drafts.decisionResult
          }, '新增决策', drafts.decision);
          updateDraft('decision', '');
          updateDraft('decisionReason', '');
          updateDraft('decisionResult', '');
        }}>添加决策</button>
      </div>
      <div className="records">
        {form.decisions.length === 0 ? <p className="muted">暂无决策</p> : form.decisions.map((item) => (
          <article key={item.id} className="record-item decision-record">
            <p><strong>{formatDate(item.createdAt)}</strong> · {item.content}</p>
            <small>原因：{item.reason || '未记录'}</small>
            <small>结果：{item.result || '未记录'}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScorePanel({ form, updateScore }) {
  const fields = [
    ['moneySpeed', '赚钱速度'],
    ['successProbability', '成功概率'],
    ['costEfficiency', '投入成本'],
    ['interest', '兴趣度'],
    ['longTermValue', '长期价值']
  ];
  return (
    <section className="panel score-panel">
      <h3>项目评分</h3>
      <div className="total-score">{getScore(form)}分</div>
      {fields.map(([key, label]) => (
        <label key={key}>
          {label}
          <input min="0" max="100" type="range" value={form.score[key]} onChange={(e) => updateScore(key, e.target.value)} />
          <span>{form.score[key]}</span>
        </label>
      ))}
    </section>
  );
}

function TasksPanel({ form, drafts, updateDraft, addTask, updateTask }) {
  return (
    <section className="panel record">
      <h3>任务列表</h3>
      <div className="inline-form">
        <input value={drafts.task} onChange={(e) => updateDraft('task', e.target.value)} placeholder="添加一个任务" />
        <button onClick={addTask}>添加</button>
      </div>
      <div className="records">
        {form.tasks.length === 0 ? <p className="muted">暂无任务</p> : form.tasks.map((t) => (
          <article className="task-row" key={t.id}>
            <span>{t.title}</span>
            <select value={t.status} onChange={(e) => updateTask(t.id, 'status', e.target.value)}>
              {taskStatuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}

function AiPanel({ form, drafts, updateDraft, addRecord, updateAiSuggestion }) {
  return (
    <section className="panel record">
      <h3>AI建议</h3>
      <div className="inline-form ai-form">
        <select value={drafts.aiSource} onChange={(e) => updateDraft('aiSource', e.target.value)}>
          {aiSources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={drafts.aiSuggestion} onChange={(e) => updateDraft('aiSuggestion', e.target.value)} placeholder="保存 AI 给出的建议" />
        <button onClick={() => {
          addRecord('aiSuggestions', { source: drafts.aiSource, content: drafts.aiSuggestion, adopted: false }, '新增AI建议', `${drafts.aiSource}：${drafts.aiSuggestion}`);
          updateDraft('aiSuggestion', '');
        }}>添加</button>
      </div>
      <div className="records">
        {form.aiSuggestions.length === 0 ? <p className="muted">暂无建议</p> : form.aiSuggestions.map((item) => (
          <article key={item.id} className="record-item">
            <p><strong>{item.source}：</strong>{item.content}</p>
            <div className="adoption-row">
              <small>{formatDate(item.createdAt)}</small>
              <select value={item.adopted ? '已采纳' : '未采纳'} onChange={(e) => updateAiSuggestion(item.id, 'adopted', e.target.value === '已采纳')}>
                <option>未采纳</option>
                <option>已采纳</option>
              </select>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelinePanel({ items }) {
  return (
    <section className="panel record">
      <h3>时间轴</h3>
      <div className="timeline">
        {items.length === 0 ? <p className="muted">暂无记录</p> : items.map((item) => (
          <article className="timeline-item" key={item.id}>
            <strong>{item.event}</strong>
            <p>{item.content}</p>
            <small>{formatDateTime(item.createdAt)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecordPanel({ title, placeholder, value, setValue, onAdd, items, render }) {
  return (
    <section className="panel record">
      <h3>{title}</h3>
      <div className="inline-form">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
        <button onClick={onAdd}>添加</button>
      </div>
      <div className="records">
        {(items ?? []).length === 0 ? (
          <p className="muted">暂无记录</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="record-item">
              {render(item)}
              <small>{formatDateTime(item.createdAt)}</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
