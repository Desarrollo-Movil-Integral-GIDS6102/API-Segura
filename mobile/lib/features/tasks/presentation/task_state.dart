library;

import '../domain/task.dart';

/// Holds the list and loading state for tasks.
class TaskState {
  const TaskState({
    this.tasks = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  final List<Task> tasks;
  final bool isLoading;
  final String? errorMessage;

  TaskState copyWith({
    List<Task>? tasks,
    bool? isLoading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return TaskState(
      tasks: tasks ?? this.tasks,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
