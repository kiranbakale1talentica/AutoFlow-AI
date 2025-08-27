import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as TaskIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    user_id: '',
    completed: false 
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksResponse, usersResponse] = await Promise.all([
        apiService.getTasks(),
        apiService.getUsers(),
      ]);
      setTasks(tasksResponse.data);
      setUsers(usersResponse.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setError('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      if (editMode && selectedTask) {
        await apiService.updateTask(selectedTask.id, formData);
      } else {
        await apiService.createTask(formData);
      }
      
      setFormData({ title: '', description: '', user_id: '', completed: false });
      setOpen(false);
      setEditMode(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      user_id: task.user_id || '',
      completed: Boolean(task.completed)
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await apiService.deleteTask(taskId);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setSelectedTask(null);
    setFormData({ title: '', description: '', user_id: '', completed: false });
    setError(null);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <Box className="flex items-center justify-center h-64">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Box>
          <Typography variant="h4" className="font-bold text-gray-800 mb-2">
            Tasks Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage tasks and track progress
          </Typography>
        </Box>
        <Box className="flex items-center space-x-2">
          <IconButton 
            onClick={fetchTasks} 
            className="bg-gray-50 hover:bg-gray-100 text-gray-600"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Task
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={fetchTasks}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold text-gray-700">ID</TableCell>
                  <TableCell className="font-semibold text-gray-700">Task</TableCell>
                  <TableCell className="font-semibold text-gray-700">Assigned To</TableCell>
                  <TableCell className="font-semibold text-gray-700">Status</TableCell>
                  <TableCell className="font-semibold text-gray-700">Created</TableCell>
                  <TableCell className="font-semibold text-gray-700">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">#{task.id}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" className="font-medium mb-1">
                            {task.title}
                          </Typography>
                          {task.description && (
                            <Typography variant="body2" color="textSecondary" className="text-sm">
                              {task.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {task.user_name ? (
                          <Box className="flex items-center space-x-2">
                            <Box className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <Typography className="text-blue-600 text-xs font-medium">
                                {task.user_name.charAt(0).toUpperCase()}
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {task.user_name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.completed ? 'Completed' : 'Pending'}
                          color={task.completed ? 'success' : 'warning'}
                          size="small"
                          icon={task.completed ? <CheckIcon /> : <ScheduleIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(task.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box className="flex items-center space-x-1">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(task.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <TaskIcon className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
                      <Typography variant="body1" color="textSecondary">
                        No tasks found
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                        className="mt-2"
                      >
                        Add First Task
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Task Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle className="text-gray-800 font-semibold">
          {editMode ? 'Edit Task' : 'Add New Task'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            <TextField
              autoFocus
              margin="dense"
              label="Task Title"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="mb-4"
            />
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mb-4"
            />
            <FormControl fullWidth variant="outlined" className="mb-4">
              <InputLabel>Assign to User</InputLabel>
              <Select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                label="Assign to User"
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {editMode && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.completed}
                    onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                    color="primary"
                  />
                }
                label="Mark as completed"
              />
            )}
          </DialogContent>
          <DialogActions className="p-6 pt-2">
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? <CircularProgress size={20} /> : (editMode ? 'Update Task' : 'Add Task')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
