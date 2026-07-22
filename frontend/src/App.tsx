import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createTodo, deleteTodo, fetchTodos, login, register, updateTodo } from './api'
import type { AuthMode, Todo, User } from './types'

const emptyForm = { title: '', description: '' }

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' })
  const [authError, setAuthError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoForm, setTodoForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [todoLoading, setTodoLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser')
    const storedToken = localStorage.getItem('authToken')

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
      void loadTodos()
    }
  }, [])

  async function loadTodos() {
    setTodoLoading(true)
    try {
      const data = await fetchTodos(
        filter === 'completed' ? true : filter === 'active' ? false : undefined,
        query || undefined,
      )
      setTodos(data)
      setStatusMessage('')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load todos')
    } finally {
      setTodoLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      void loadTodos()
    }
  }, [filter, query, user])

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setAuthError('')

    try {
      if (authMode === 'register') {
        // Register first
        await register(authForm.email, authForm.password, authForm.name)
        // Then auto-login
        const response = await login(authForm.email, authForm.password)
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('authUser', JSON.stringify(response.user))
        setUser(response.user)
        setStatusMessage('Account created successfully')
        setAuthForm({ email: '', password: '', name: '' })
      } else {
        // Login
        const response = await login(authForm.email, authForm.password)
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('authUser', JSON.stringify(response.user))
        setUser(response.user)
        setStatusMessage('Welcome back!')
        setAuthForm({ email: '', password: '', name: '' })
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleTodoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!todoForm.title.trim()) {
      setStatusMessage('Please add a title for your todo.')
      return
    }

    setTodoLoading(true)
    try {
      const created = await createTodo(todoForm.title.trim(), todoForm.description.trim())
      setTodos((current) => [created, ...current])
      setTodoForm(emptyForm)
      setStatusMessage('Todo created successfully')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create todo')
    } finally {
      setTodoLoading(false)
    }
  }

  async function toggleTodo(todo: Todo) {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed })
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)))
      setStatusMessage('Todo updated')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update todo')
    }
  }

  async function removeTodo(id: string) {
    try {
      await deleteTodo(id)
      setTodos((current) => current.filter((todo) => todo.id !== id))
      setStatusMessage('Todo removed')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete todo')
    }
  }

  const completedCount = useMemo(() => todos.filter((todo) => todo.completed).length, [todos])

  function logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    setUser(null)
    setTodos([])
    setTodoForm(emptyForm)
    setStatusMessage('Signed out')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Frontend product</p>
          <h1>Stay on top of every task</h1>
          <p className="hero-copy">
            A polished todo workspace for managing auth, creating tasks, filtering progress, and keeping the experience responsive.
          </p>
        </div>
        <div className="hero-card">
          <h2>{user ? `Welcome, ${user.name}` : 'Secure access'}</h2>
          <p>{user ? 'Your todo board is ready for the next task.' : 'Login or create an account to begin.'}</p>
          {!user ? (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="field-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                />
              </div>
              <div className="field-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                />
              </div>
              {authMode === 'register' && (
                <div className="field-group">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                  />
                </div>
              )}
              {authError ? <p className="error-text">{authError}</p> : null}
              <button type="submit" disabled={loading}>
                {loading ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError('')
                }}
              >
                {authMode === 'login' ? 'Need an account?' : 'Back to login'}
              </button>
            </form>
          ) : (
            <div className="user-actions">
              <button type="button" className="secondary" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </header>

      {user ? (
        <main className="content-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Todo workspace</p>
                <h2>Create and organize</h2>
              </div>
              <div className="pill">{completedCount}/{todos.length} done</div>
            </div>
            <form className="todo-form" onSubmit={handleTodoSubmit}>
              <div className="field-group">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  value={todoForm.title}
                  onChange={(event) => setTodoForm({ ...todoForm, title: event.target.value })}
                  placeholder="Finish dashboard polish"
                />
              </div>
              <div className="field-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={todoForm.description}
                  onChange={(event) => setTodoForm({ ...todoForm, description: event.target.value })}
                  placeholder="Add details for this task"
                  rows={4}
                />
              </div>
              <button type="submit" disabled={todoLoading}>
                {todoLoading ? 'Saving…' : 'Add todo'}
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Today’s progress</p>
                <h2>Task list</h2>
              </div>
              <div className="filters">
                <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
                <button type="button" className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active</button>
                <button type="button" className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
              </div>
            </div>
            <div className="search-box">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search todos" />
            </div>
            {statusMessage ? <p className="status-text">{statusMessage}</p> : null}
            {todoLoading ? <p className="status-text">Loading tasks…</p> : null}
            <ul className="todo-list">
              {todos.map((todo) => (
                <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                  <label className="todo-main">
                    <input type="checkbox" checked={todo.completed} onChange={() => void toggleTodo(todo)} />
                    <div>
                      <strong>{todo.title}</strong>
                      {todo.description ? <p>{todo.description}</p> : null}
                    </div>
                  </label>
                  <button type="button" className="delete" onClick={() => void removeTodo(todo.id)}>Remove</button>
                </li>
              ))}
              {!todoLoading && todos.length === 0 ? <li className="empty-state">No todos match this view yet.</li> : null}
            </ul>
          </section>
        </main>
      ) : null}
    </div>
  )
}

export default App
