library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/task_repository.dart';
import '../domain/task.dart';
import 'task_state.dart';

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(ref.watch(apiClientProvider));
});

class TaskController extends Notifier<TaskState> {
  @override
  TaskState build() {
    Future.microtask(() => loadTasks());
    return const TaskState();
  }

  TaskRepository get _repository => ref.read(taskRepositoryProvider);

  Future<void> loadTasks() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final items = await _repository.list();
      state = state.copyWith(tasks: items, isLoading: false);
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load tasks. Check connection.',
      );
    }
  }

  Future<bool> createTask(String title, String? description) async {
    try {
      final created = await _repository.create(title, description);
      state = state.copyWith(tasks: [created, ...state.tasks]);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(errorMessage: 'Failed to create task.');
      return false;
    }
  }

  Future<bool> updateTask(
    String taskId, {
    String? title,
    String? description,
    bool? completed,
  }) async {
    try {
      final updated = await _repository.update(
        taskId,
        title: title,
        description: description,
        completed: completed,
      );
      final newTasks = state.tasks.map((t) => t.id == taskId ? updated : t).toList();
      state = state.copyWith(tasks: newTasks);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(errorMessage: 'Failed to update task.');
      return false;
    }
  }

  Future<void> toggleCompleted(Task task) async {
    final originalState = state.tasks;
    final updatedOpt = task.copyWith(completed: !task.completed);
    state = state.copyWith(
      tasks: state.tasks.map((t) => t.id == task.id ? updatedOpt : t).toList(),
    );

    try {
      final serverUpdated = await _repository.setCompleted(task, !task.completed);
      state = state.copyWith(
        tasks: state.tasks.map((t) => t.id == task.id ? serverUpdated : t).toList(),
      );
    } catch (e) {
      state = state.copyWith(
        tasks: originalState,
        errorMessage: 'Failed to update status.',
      );
    }
  }

  Future<bool> deleteTask(String taskId) async {
    final originalState = state.tasks;
    state = state.copyWith(
      tasks: state.tasks.where((t) => t.id != taskId).toList(),
    );

    try {
      await _repository.delete(taskId);
      return true;
    } catch (e) {
      state = state.copyWith(
        tasks: originalState,
        errorMessage: 'Failed to delete task.',
      );
      return false;
    }
  }
}

final taskControllerProvider =
    NotifierProvider<TaskController, TaskState>(TaskController.new);
