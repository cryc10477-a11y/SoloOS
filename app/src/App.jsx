import { useEffect, useMemo, useState } from 'react';

const statuses = ['想法池', '待立项', '验证中', '暂停', '放弃', '完成'];
const priorities = ['低', '中', '高'];

const emptyForm = {
  name: '',
  description: '',
  status: '想法池',
  priority: '中',
  nextAction: '',
  owner: '',
  decisions: [],
  tasks: [],
  discussions: [],
  aiSuggestions: []
};

function createItem(fields) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...fields
  };
}

function formatTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [discussionText, setDiscussionText] = useState('');
  const [aiSuggestionText, setAiSuggestionText] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId),
    [projects, selectedId]
  );

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    setForm(selectedProject ?? emptyForm);
  }, [selectedProject]);

  async function loadProjects() {
    const nextProjects = await window.soloOS.listProjects();
    setProjects(nextProjects);
    if (!selectedId && nextProjects.length > 0) {
      setSelectedId(nextProjects[0].id);
    }
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProject() {
    setMessage('');
    try {
      if (selectedProject) {
        const updated = await window.soloOS.updateProject(selectedProject.id, form);
        setProjects((current) => current.map((project) => (project.id === updated.id ? updated : project)));
        setSelectedId(updated.id);
        setMessage('项目已保存');
      } else {
        const created = await window.soloOS.createProject(form);
        setProjects((current) => [created, ...current]);
        setSelectedId(created.id);
        setMessage('项目已新增');
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeProject() {
    if (!selectedProject) return;
    const confirmed = window.confirm(`确认删除「${selectedProject.name}」吗？`);
    if (!confirmed) return;
    await window.soloOS.deleteProject(selectedProject.id);
    const nextProjects = projects.filter((project) => project.id !== selectedProject.id);
    setProjects(nextProjects);
    setSelectedId(nextProjects[0]?.id ?? '');
    setMessage('项目已删除');
  }

  function newProject() {
    setSelectedId('');
    setForm(emptyForm);
    setMessage('正在新增项目');
  }

  function addArrayItem(key, item, clear) {
    if (!item) return;
    setForm((current) => ({
      ...current,
      [key]: [createItem(item), ...(current[key] ?? [])]
    }));
    clear('');
  }

  function toggleTask(taskId) {
    setForm((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
    }));
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
        <button className="primary full" onClick={newProject}>+ 新增项目</button>
        <div className="project-list">
          {projects.length === 0 ? (
            <p className="muted">还没有项目，先新增一个。</p>
          ) : (
            projects.map((project) => (
              <button
                className={`project-card ${project.id === selectedId ? 'active' : ''}`}
                key={project.id}
                onClick={() => setSelectedId(project.id)}
              >
                <strong>{project.name}</strong>
                <span>{project.status} · {project.priority}优先级</span>
                <small>{project.nextAction || '暂无下一步行动'}</small>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">项目库</p>
            <h2>{selectedProject ? selectedProject.name : '新增项目'}</h2>
          </div>
          <div className="actions">
            {selectedProject && <button className="danger" onClick={removeProject}>删除</button>}
            <button className="primary" onClick={saveProject}>保存</button>
          </div>
        </header>

        {message && <div className="notice">{message}</div>}

        <section className="panel grid two">
          <label>
            项目名称
            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="例如：SoloOS v0.1" />
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
            下一步行动
            <textarea value={form.nextAction} onChange={(event) => updateForm('nextAction', event.target.value)} placeholder="下一步最小可执行动作是什么？" />
          </label>
          <div className="meta wide">
            <span>创建：{formatTime(form.createdAt)}</span>
            <span>更新：{formatTime(form.updatedAt)}</span>
          </div>
        </section>

        <section className="columns">
          <RecordPanel
            title="决策记录"
            placeholder="记录一个关键决策"
            value={decisionText}
            setValue={setDecisionText}
            onAdd={() => addArrayItem('decisions', { content: decisionText }, setDecisionText)}
            items={form.decisions}
            render={(item) => <p>{item.content}</p>}
          />
          <RecordPanel
            title="任务列表"
            placeholder="添加一个任务"
            value={taskText}
            setValue={setTaskText}
            onAdd={() => addArrayItem('tasks', { title: taskText, done: false }, setTaskText)}
            items={form.tasks}
            render={(item) => (
              <label className="task">
                <input type="checkbox" checked={item.done} onChange={() => toggleTask(item.id)} />
                <span>{item.title}</span>
              </label>
            )}
          />
          <RecordPanel
            title="聊天 / 讨论记录"
            placeholder="添加讨论记录"
            value={discussionText}
            setValue={setDiscussionText}
            onAdd={() => addArrayItem('discussions', { author: 'Owner', content: discussionText }, setDiscussionText)}
            items={form.discussions}
            render={(item) => <p><strong>{item.author}：</strong>{item.content}</p>}
          />
          <RecordPanel
            title="AI 建议"
            placeholder="保存 AI 给出的建议"
            value={aiSuggestionText}
            setValue={setAiSuggestionText}
            onAdd={() => addArrayItem('aiSuggestions', { source: 'AI', content: aiSuggestionText }, setAiSuggestionText)}
            items={form.aiSuggestions}
            render={(item) => <p><strong>{item.source}：</strong>{item.content}</p>}
          />
        </section>
      </section>
    </main>
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
              <small>{formatTime(item.createdAt)}</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

