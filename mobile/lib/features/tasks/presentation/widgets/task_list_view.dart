/// Displays task-list states and task completion controls.
library;

import 'package:flutter/material.dart';

import '../../domain/task.dart';

/// Renders an asynchronous task-list result.
class TaskListView extends StatelessWidget {
  /// Creates a task list view.
  const TaskListView({
    super.key,
    required this.loading,
    required this.tasks,
    required this.errorMessage,
    required this.onRetry,
    required this.onToggle,
    required this.onDelete,
    required this.onEdit,
  });

  /// Whether the repository is loading tasks.
  final bool loading;

  /// Tasks to display after a successful load.
  final List<Task> tasks;

  /// Safe error message, if the request failed.
  final String? errorMessage;

  /// Callback to retry loading.
  final VoidCallback onRetry;

  /// Callback for completion changes.
  final ValueChanged<Task> onToggle;

  /// Callback for deletion.
  final ValueChanged<Task> onDelete;

  /// Callback for editing.
  final ValueChanged<Task> onEdit;

  @override
  Widget build(BuildContext context) {
    if (loading && tasks.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (errorMessage != null && tasks.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(
                errorMessage!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.task_alt, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            const Text(
              'No tasks yet. Add your first task.',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => onRetry(),
      child: ListView.builder(
        itemCount: tasks.length,
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemBuilder: (context, index) {
          final task = tasks[index];

          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            child: ListTile(
              leading: Checkbox(
                value: task.completed,
                onChanged: (_) => onToggle(task),
              ),
              title: Text(
                task.title,
                style: TextStyle(
                  decoration: task.completed
                      ? TextDecoration.lineThrough
                      : TextDecoration.none,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: task.description == null || task.description!.isEmpty
                  ? null
                  : Text(
                      task.description!,
                      style: TextStyle(
                        decoration: task.completed
                            ? TextDecoration.lineThrough
                            : TextDecoration.none,
                      ),
                    ),
              onTap: () => onEdit(task),
              trailing: IconButton(
                tooltip: 'Delete task',
                icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                onPressed: () => _confirmDelete(context, task),
              ),
            ),
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, Task task) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Task'),
        content: Text('Are you sure you want to delete "${task.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.of(ctx).pop();
              onDelete(task);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
