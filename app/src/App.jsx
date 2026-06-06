import { useEffect, useMemo, useState } from 'react';

const statuses = ['想法池', '待立项', '验证中', '执行中', '暂停', '完成', '放弃'];
const activeStatuses = ['待立项', '验证中', '执行中'];
const priorities = ['低', '中', '高', '最高'];
const taskStatuses = ['待办', '进行中', '已完成'];
const aiSources = ['ChatGPT', 'WorkBuddy', 'Codex', '飞书CEO', '市场调研', '产品经理', '内容运营'];

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

function createItem(fields) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...fields
  };
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function daysSince(value) {
  if (!value) return '-';
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function getScore(project) {
  const score = project.score ?? emptyProject.score;
  const values = [
    score.moneySpeed,
    score.successProbability,
    score.costEfficiency,
    score.interest,
    score.longTermValue
  ].map((value) => Number(value) || 0);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function priorityWeight(priority) {
  return { 最高: 4, 高: 3, 中: 2, 低: 1 }[priority] ?? 0;
}

function withTimeline(project, event, content) {
  return {
    ...project,
    timeline: [
      createItem({ event, content }),
      ...(project.timeline ?? [])
    ]
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
    score: {
      ...emptyProject.score,
      ...(project.score ?? {})
    },
    decisions: project.decisions ?? [],
    tasks: (project.tasks ?? []).map((task) => ({
      ...task,
      status: task.status ?? (task.done ? '已完成' : '待办')
    })),
    discussions: project.discussions ?? [],
    aiSuggestions: (project.aiSuggestions ?? []).map((suggestion) => ({
      ...suggestion,
      source: suggestion.source ?? 'Codex',
      adopted: Boolean(suggestion.adopted)
    })),
    timeline: project.timeline ?? []
  };
}

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState('overview');
  const [form, setForm] = useState(emptyProject);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '全部', sort: 'score' });
  const [drafts, setDrafts] = useState({
    decision: '',
    task: '',
    discussion: '',
    aiSuggestion: '',
    aiSource: 'Codex'
  });

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId),
    [projects, selectedId]
  );

  const visibleProjects = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();
    return projects
      .filter((project) => {
        const matchKeyword = !keyword || [project.name, project.description, project.owner, project.nextAction]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
        const matchStatus = filters.status === '全部' || project.status === filters.status;
        return matchKeyword && matchStatus;
      })
      .sort((first, second) => {
        if (filters.sort === 'updated') {
          return new Date(second.updatedAt ?? 0) - new Date(first.updatedAt ?? 0);
        }
        if (filters.sort === 'priority') {
          return priorityWeight(second.priority) - priorityWeight(first.priority);
        }
        if (filters.sort === 'name') {
          return first.name.localeCompare(second.name, 'zh-CN');
        }
        return getScore(second) - getScore(first);
      });
  }, [projects, filters]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => activeStatuses.includes(project.status)).length,
    paused: projects.filter((project) => project.status === '暂停').length,
    completed: projects.filter((project) => project.status === '完成').length,
    ideas: projects.filter((project) => project.status === '想法池').length
  }), [projects]);

  const todayFocus = useMemo(() => {
    const candidates = projects
      .filter((project) => !['完成', '放弃'].includes(project.status))
      .sort((first, second) => {
        const scoreDiff = getScore(second) - getScore(first);
        if (scoreDiff) return scoreDiff;
        return priorityWeight(second.priority) - priorityWeight(first.priority);
      });
    return candidates[0];
  }, [projects]);

  const recent = useMemo(() => ({
    created: [...projects].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))[0],
    updated: [...projects].sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0))[0],
    completed: [...projects]
      .filter((project) => project.status === '完成')
      .sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0))[0]
  }), [projects]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    setForm(selectedProject ? normalizeProject(selectedProject) : emptyProject);
  }, [selectedProject]);

  async function loadProjects() {
    const nextProjects = (await window.soloOS.listProjects()).map(normalizeProject);
    setProjects(nextProjects);
  }

  function selectProject(projectId) {
    setSelectedId(projectId);
    setView('detail');
    setMessage('');
  }

  function createProject() {
    setSelectedId('');
    setForm(emptyProject);
    setView('detail');
    setMessage('正在新增项目');
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateScore(key, value) {
    setForm((current) => ({
      ...current,
      score: {
        ...current.score,
        [key]: Number(value)
      }
    }));
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
        setProjects((current) => current.map((project) => (project.id === updated.id ? normalizeProject(updated) : project)));
        setSelectedId(updated.id);
        setMessage(notice);
        return updated;
      }

      const payload = withTimeline(normalizeProject(nextForm), '创建项目', nextForm.name || '未命名项目');
      const created = await window.soloOS.createProject(payload);
      setProjects((current) => [normalizeProject(created), ...current]);
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
    const first = window.confirm(`确认删除「${selectedProject.name}」吗？`);
    if (!first) return;
    const second = window.confirm('删除后只能通过 Git 历史恢复。请再次确认删除。');
    if (!second) return;
    await window.soloOS.deleteProject(selectedProject.id);
    setProjects((current) => current.filter((project) => project.id !== selectedProject.id));
    setSelectedId('');
    setView('overview');
    setMessage('项目已删除');
  }

  function updateDraft(key, value) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  function addRecord(key, item, timelineEvent, timelineContent) {
    const primaryContent = String(item.content ?? item.title ?? '').trim();
    if (!primaryContent) return;
    setForm((current) => withTimeline({
      ...current,
      [key]: [createItem(item), ...(current[key] ?? [])]
    }, timelineEvent, timelineContent));
  }

  function addTask() {
    if (!drafts.task.trim()) return;
    addRecord('tasks', { title: drafts.task, status: '待办' }, '新增任务', drafts.task);
    updateDraft('task', '');
  }

  function updateTask(taskId, key, value) {
    setForm((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      const next = {
        ...current,
        tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, [key]: value } : item))
      };
      if (key === 'status' && value === '已完成' && task?.status !== '已完成') {
        return withTimeline(next, '完成任务', task.title);
      }
      return next;
    });
  }

  function updateAiSuggestion(suggestionId, key, value) {
    setForm((current) => ({
      ...current,
      aiSuggestions: current.aiSuggestions.map((suggestion) => (
        suggestion.id === suggestionId ? { ...suggestion, [key]: value } : suggestion
      ))
    }));
  }

  async function moveProject(project, status) {
    if (project.status === status) return;
    const payload = withTimeline({ ...project, status }, '修改状态', `${project.status} → ${status}`);
    const updated = await window.soloOS.updateProject(project.id, payload);
    setProjects((current) => current.map((item) => (item.id === project.id ? normalizeProject(updated) : item)));
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">S</span>
          <div>
            <h1>SoloOS</h1>
            <p>一人公司操作系统</p>
          </div>
        </div>

        <nav className="nav">
          <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>项目总览</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>项目列表</button>
          <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>项目看板</button>
        </nav>

        <button className="primary full" onClick={createProject}>+ 新增项目</button>

        <ProjectFilters filters={filters} setFilters={setFilters} compact />

        <div className="project-list">
          {visibleProjects.length === 0 ? (
            <p className="muted">没有匹配项目。</p>
          ) : (
            visibleProjects.map((project) => (
              <button
                className={`project-card ${project.id === selectedId ? 'active' : ''}`}
                key={project.id}
                onClick={() => selectProject(project.id)}
              >
                <strong>{project.name}</strong>
                <span>{project.status} · {project.priority}优先级 · {getScore(project)}分</span>
                <small>{formatDateTime(project.updatedAt)} · {project.owner || '未指定负责人'}</small>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace">
        {message && <div className="notice">{message}</div>}
        {view === 'overview' && (
          <Overview
            stats={stats}
            todayFocus={todayFocus}
            recent={recent}
            selectProject={selectProject}
            createProject={createProject}
          />
        )}
        {view === 'list' && (
          <ProjectList
            projects={visibleProjects}
            filters={filters}
            setFilters={setFilters}
            selectProject={selectProject}
          />
        )}
        {view === 'board' && (
          <ProjectBoard
            projects={visibleProjects}
            selectProject={selectProject}
            moveProject={moveProject}
          />
        )}
        {view === 'detail' && (
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
          />
        )}
      </section>
    </main>
  );
}

function ProjectFilters({ filters, setFilters, compact = false }) {
  return (
    <div className={`filters ${compact ? 'compact' : ''}`}>
      <input
        value={filters.search}
        onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
        placeholder="搜索项目、负责人、下一步"
      />
      <select
        value={filters.status}
        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
      >
        <option>全部</option>
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
      <select
        value={filters.sort}
        onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
      >
        <option value="score">按总分</option>
        <option value="priority">按优先级</option>
        <option value="updated">按更新时间</option>
        <option value="name">按名称</option>
      </select>
    </div>
  );
}

function Overview({ stats, todayFocus, recent, selectProject, createProject }) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>项目总览</h2>
        </div>
        <button className="primary" onClick={createProject}>新增项目</button>
      </header>

      <section className="stats">
        <StatCard label="项目总数" value={stats.total} />
        <StatCard label="进行中项目" value={stats.active} />
        <StatCard label="暂停项目" value={stats.paused} />
        <StatCard label="已完成项目" value={stats.completed} />
        <StatCard label="想法池项目" value={stats.ideas} />
      </section>

      <section className="overview-grid">
        <article className="panel hero-panel">
          <p className="eyebrow">今日重点</p>
          {todayFocus ? (
            <>
              <div className="score-ring">{getScore(todayFocus)}分</div>
              <h3>{todayFocus.name}</h3>
              <p>{todayFocus.currentGoal || todayFocus.description || '暂无当前目标'}</p>
              <div className="next-action">
                <span>唯一最重要任务</span>
                <strong>{todayFocus.nextAction || '请补充下一步行动'}</strong>
                <small>距离上次更新 {daysSince(todayFocus.updatedAt)} 天</small>
              </div>
              <button className="secondary" onClick={() => selectProject(todayFocus.id)}>进入项目</button>
            </>
          ) : (
            <EmptyState title="还没有今日重点" action="新增项目" onAction={createProject} />
          )}
        </article>

        <article className="panel">
          <h3>最近活动</h3>
          <RecentItem label="最近新增项目" project={recent.created} selectProject={selectProject} />
          <RecentItem label="最近更新项目" project={recent.updated} selectProject={selectProject} />
          <RecentItem label="最近完成项目" project={recent.completed} selectProject={selectProject} />
        </article>
      </section>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function RecentItem({ label, project, selectProject }) {
  return (
    <button className="recent-item" disabled={!project} onClick={() => project && selectProject(project.id)}>
      <span>{label}</span>
      <strong>{project?.name ?? '暂无'}</strong>
      <small>{project ? `${project.status} · ${formatDateTime(project.updatedAt)}` : '-'}</small>
    </button>
  );
}

function ProjectList({ projects, filters, setFilters, selectProject }) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>项目列表</h2>
        </div>
      </header>
      <ProjectFilters filters={filters} setFilters={setFilters} />
      <section className="table panel">
        <div className="table-row table-head">
          <span>项目</span>
          <span>状态</span>
          <span>优先级</span>
          <span>总分</span>
          <span>更新时间</span>
          <span>负责人</span>
        </div>
        {projects.map((project) => (
          <button className="table-row" key={project.id} onClick={() => selectProject(project.id)}>
            <strong>{project.name}</strong>
            <span><Badge>{project.status}</Badge></span>
            <span>{project.priority}优先级</span>
            <span>{getScore(project)}分</span>
            <span>{formatDateTime(project.updatedAt)}</span>
            <span>{project.owner || '-'}</span>
          </button>
        ))}
      </section>
    </>
  );
}

function ProjectBoard({ projects, selectProject, moveProject }) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Kanban</p>
          <h2>项目看板</h2>
        </div>
      </header>
      <section className="board">
        {statuses.map((status) => (
          <div
            className="board-column"
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const projectId = event.dataTransfer.getData('text/plain');
              const project = projects.find((item) => item.id === projectId);
              if (project) moveProject(project, status);
            }}
          >
            <h3>{status}<span>{projects.filter((project) => project.status === status).length}</span></h3>
            {projects.filter((project) => project.status === status).map((project) => (
              <button
                className="kanban-card"
                draggable
                key={project.id}
                onDragStart={(event) => event.dataTransfer.setData('text/plain', project.id)}
                onClick={() => selectProject(project.id)}
              >
                <strong>{project.name}</strong>
                <span>{project.priority}优先级 · {getScore(project)}分</span>
                <small>{project.nextAction || '暂无下一步行动'}</small>
              </button>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}

function ProjectDetail({
  project,
  form,
  updateForm,
  updateScore,
  saveProject,
  deleteProject,
  drafts,
  updateDraft,
  addRecord,
  addTask,
  updateTask
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Project Detail</p>
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
          <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="例如：AI主题商店" />
        </label>
        <label>
          负责人
          <input value={form.owner} onChange={(event) => updateForm('owner', event.target.value)} placeholder="Owner / Codex / WorkBuddy" />
        </label>
        <label className="wide">
          一句话描述
          <input value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="这个项目解决什么问题？" />
        </label>
        <label>
          当前状态
          <select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          优先级
          <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value)}>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label className="wide">
          当前目标
          <textarea value={form.currentGoal} onChange={(event) => updateForm('currentGoal', event.target.value)} placeholder="项目当前最重要目标是什么？" />
        </label>
        <label className="wide next-action-field">
          下一步行动
          <textarea value={form.nextAction} onChange={(event) => updateForm('nextAction', event.target.value)} placeholder="下一步最小可执行动作是什么？" />
        </label>
        <label>
          截止时间
          <input type="date" value={form.nextActionDueDate} onChange={(event) => updateForm('nextActionDueDate', event.target.value)} />
        </label>
        <div className="meta">
          <span>创建：{formatDateTime(form.createdAt)}</span>
          <span>更新：{formatDateTime(form.updatedAt)}</span>
        </div>
      </section>

      <section className="detail-grid">
        <ScorePanel form={form} updateScore={updateScore} />
        <TasksPanel form={form} drafts={drafts} updateDraft={updateDraft} addTask={addTask} updateTask={updateTask} />
        <RecordPanel
          title="决策记录"
          placeholder="记录为什么开始、暂停、放弃或继续"
          value={drafts.decision}
          setValue={(value) => updateDraft('decision', value)}
          onAdd={() => {
            addRecord('decisions', { content: drafts.decision }, '新增决策', drafts.decision);
            updateDraft('decision', '');
          }}
          items={form.decisions}
          render={(item) => <p>{item.content}</p>}
        />
        <AiPanel
          form={form}
          drafts={drafts}
          updateDraft={updateDraft}
          addRecord={addRecord}
          updateAiSuggestion={updateAiSuggestion}
        />
        <RecordPanel
          title="项目聊天记录"
          placeholder="保存我说过什么、AI说过什么、最终决定"
          value={drafts.discussion}
          setValue={(value) => updateDraft('discussion', value)}
          onAdd={() => {
            addRecord('discussions', { author: 'Owner', content: drafts.discussion }, '新增聊天记录', drafts.discussion);
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
          <input min="0" max="100" type="range" value={form.score[key]} onChange={(event) => updateScore(key, event.target.value)} />
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
        <input value={drafts.task} onChange={(event) => updateDraft('task', event.target.value)} placeholder="添加一个任务" />
        <button onClick={addTask}>添加</button>
      </div>
      <div className="records">
        {form.tasks.length === 0 ? <p className="muted">暂无任务</p> : form.tasks.map((task) => (
          <article className="task-row" key={task.id}>
            <span>{task.title}</span>
            <select value={task.status} onChange={(event) => updateTask(task.id, 'status', event.target.value)}>
              {taskStatuses.map((status) => <option key={status}>{status}</option>)}
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
        <select value={drafts.aiSource} onChange={(event) => updateDraft('aiSource', event.target.value)}>
          {aiSources.map((source) => <option key={source}>{source}</option>)}
        </select>
        <input value={drafts.aiSuggestion} onChange={(event) => updateDraft('aiSuggestion', event.target.value)} placeholder="保存 AI 给出的建议" />
        <button onClick={() => {
          addRecord(
            'aiSuggestions',
            { source: drafts.aiSource, content: drafts.aiSuggestion, adopted: false },
            '新增AI建议',
            `${drafts.aiSource}：${drafts.aiSuggestion}`
          );
          updateDraft('aiSuggestion', '');
        }}>添加</button>
      </div>
      <div className="records">
        {form.aiSuggestions.length === 0 ? <p className="muted">暂无建议</p> : form.aiSuggestions.map((item) => (
          <article key={item.id} className="record-item">
            <p><strong>{item.source}：</strong>{item.content}</p>
            <div className="adoption-row">
              <small>{formatDate(item.createdAt)}</small>
              <select
                value={item.adopted ? '已采纳' : '未采纳'}
                onChange={(event) => updateAiSuggestion(item.id, 'adopted', event.target.value === '已采纳')}
              >
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
        {items.length === 0 ? <p className="muted">暂无自动记录</p> : items.map((item) => (
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
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} />
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

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function EmptyState({ title, action, onAction }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      <button className="secondary" onClick={onAction}>{action}</button>
    </div>
  );
}
