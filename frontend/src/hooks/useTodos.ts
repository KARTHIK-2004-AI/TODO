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

  // Sprint 5 filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [dueFilter, setDueFilter] = useState<string>('all')

  const loadTodos = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    setTodoLoading(true)
    try {
      const teamId = workspace.kind === 'team' ? workspace.teamId : undefined
      const data = await fetchTodos(
        filter === 'completed' ? true : filter === 'active' ? false : undefined,
        query || undefined,
        teamId,
        priorityFilter === 'all' ? undefined : priorityFilter,
        statusFilter === 'all' ? undefined : statusFilter,
        assigneeFilter === 'all' ? undefined : assigneeFilter
      )
      setTodos(data)
      setStatusMessage('')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load todos')
    } finally {
      setTodoLoading(false)
    }
  }, [filter, query, workspace, priorityFilter, statusFilter, assigneeFilter])

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
      const updated = await updateTodo(todoId, { assignedToUserId: assignedUserId })
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
      // Completed status tab filter
      if (filter === 'active' && todo.completed) return false
      if (filter === 'completed' && !todo.completed) return false

      // Due Date relative filter
      if (dueFilter !== 'all') {
        if (!todo.dueDate) return false
        const d = new Date(todo.dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const target = new Date(d)
        target.setHours(0, 0, 0, 0)

        const diffTime = target.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (dueFilter === 'overdue' && diffDays >= 0) return false
        if (dueFilter === 'today' && diffDays !== 0) return false
        if (dueFilter === 'tomorrow' && diffDays !== 1) return false
        if (dueFilter === 'future' && diffDays <= 1) return false
      }

      return true
    })
  }, [todos, filter, dueFilter])

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
    priorityFilter,
    setPriorityFilter,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    dueFilter,
    setDueFilter,
  }
}
export default useTodos;
