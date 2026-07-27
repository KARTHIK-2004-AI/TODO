import { useCallback, useMemo, useState } from 'react'
import { createTodo, deleteTodo, fetchTodos, updateTodo } from '../api'
import type { Todo, WorkspaceSelection } from '../types'

const emptyForm = { title: '', description: '', assignedUserId: '' }

export function useTodos(workspace: WorkspaceSelection) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoForm, setTodoForm] = useState(emptyForm)
  const [todoLoading, setTodoLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [statusMessage, setStatusMessage] = useState('')
  const [pendingDeleteTodoId, setPendingDeleteTodoId] = useState<string | null>(null)

  const loadTodos = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    setTodoLoading(true)
    try {
      const teamId = workspace.kind === 'team' ? workspace.teamId : undefined
      const data = await fetchTodos(
        filter === 'completed' ? true : filter === 'active' ? false : undefined,
        query || undefined,
        teamId
      )
      setTodos(data)
      setStatusMessage('')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load todos')
    } finally {
      setTodoLoading(false)
    }
  }, [filter, query, workspace])

  const submitTodo = async () => {
    if (!todoForm.title.trim()) {
      setStatusMessage('Please add a title for your todo.')
      return
    }

    setTodoLoading(true)
    try {
      const teamId = workspace.kind === 'team' ? workspace.teamId : undefined
      const created = await createTodo(
        todoForm.title.trim(),
        todoForm.description.trim(),
        teamId,
        todoForm.assignedUserId || null
      )
      setTodos((current) => [created, ...current])
      setStatusMessage(
        teamId ? 'Shared todo created successfully' : 'Todo created successfully'
      )
      setTodoForm(emptyForm)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create todo')
      throw error
    } finally {
      setTodoLoading(false)
    }
  }

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const updated = await updateTodo(todo.id, { completed: !todo.completed })
      setTodos((current) =>
        current
          .map((item) => (item.id === todo.id ? updated : item))
          .filter((item) => {
            if (filter === 'active') return !item.completed
            if (filter === 'completed') return item.completed
            return true
          })
      )
      setStatusMessage('Todo updated')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update todo')
    }
  }

  const handleUpdateAssignee = async (todoId: string, assignedUserId: string | null) => {
    try {
      const updated = await updateTodo(todoId, { assignedUserId })
      setTodos((current) =>
        current.map((item) => (item.id === todoId ? updated : item))
      )
      setStatusMessage('Task assignee updated successfully')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to assign task')
    }
  }

  const handleRemoveTodo = async (id: string) => {
    if (pendingDeleteTodoId === id) return
    setPendingDeleteTodoId(id)
    try {
      await deleteTodo(id)
      setTodos((current) => current.filter((todo) => todo.id !== id))
      setStatusMessage('Todo removed')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete todo')
    } finally {
      setPendingDeleteTodoId(null)
    }
  }

  const visibleTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'active') return !todo.completed
      if (filter === 'completed') return todo.completed
      return true
    })
  }, [todos, filter])

  const completedCount = useMemo(
    () => visibleTodos.filter((todo) => todo.completed).length,
    [visibleTodos]
  )

  return {
    todos,
    setTodos,
    todoForm,
    setTodoForm,
    todoLoading,
    query,
    setQuery,
    filter,
    setFilter,
    statusMessage,
    setStatusMessage,
    pendingDeleteTodoId,
    loadTodos,
    submitTodo,
    handleToggleTodo,
    handleUpdateAssignee,
    handleRemoveTodo,
    visibleTodos,
    completedCount,
  }
}
