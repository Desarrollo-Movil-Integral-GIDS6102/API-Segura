library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import 'task_controller.dart';
import 'task_state.dart';
import 'widgets/task_dialog.dart';
import 'widgets/task_list_view.dart';

class TaskPage extends ConsumerWidget {
  const TaskPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskState = ref.watch(taskControllerProvider);
    final taskController = ref.read(taskControllerProvider.notifier);
    final authController = ref.read(authStateProvider.notifier);

    ref.listen<TaskState>(taskControllerProvider, (previous, next) {
      final error = next.errorMessage;
      if (error != null && error != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Task Manager'),
        actions: [
          IconButton(
            tooltip: 'Refresh tasks',
            icon: const Icon(Icons.refresh),
            onPressed: () => taskController.loadTasks(),
          ),
          PopupMenuButton<String>(
            tooltip: 'Session options',
            onSelected: (value) async {
              if (value == 'logout_all') {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Revoke All Sessions'),
                    content: const Text(
                      'This will sign you out of all active devices. Continue?',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Revoke All'),
                      ),
                    ],
                  ),
                );
                if (confirm == true) {
                  await ref.read(authRepositoryProvider).logoutAll();
                  authController.signOutLocally();
                }
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'logout_all',
                child: Row(
                  children: [
                    Icon(Icons.devices_other, size: 20),
                    SizedBox(width: 8),
                    Text('Log out of all devices'),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            tooltip: 'Log out',
            icon: const Icon(Icons.logout),
            onPressed: () => authController.logout(),
          ),
        ],
      ),
      body: TaskListView(
        loading: taskState.isLoading,
        tasks: taskState.tasks,
        errorMessage: taskState.errorMessage,
        onRetry: () => taskController.loadTasks(),
        onToggle: (task) => taskController.toggleCompleted(task),
        onDelete: (task) => taskController.deleteTask(task.id),
        onEdit: (task) async {
          final result = await showDialog<Map<String, dynamic>>(
            context: context,
            builder: (_) => TaskDialog(task: task),
          );
          if (result != null) {
            await taskController.updateTask(
              task.id,
              title: result['title'] as String,
              description: result['description'] as String?,
            );
          }
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('New Task'),
        onPressed: () async {
          final result = await showDialog<Map<String, dynamic>>(
            context: context,
            builder: (_) => const TaskDialog(),
          );
          if (result != null) {
            await taskController.createTask(
              result['title'] as String,
              result['description'] as String?,
            );
          }
        },
      ),
    );
  }
}
