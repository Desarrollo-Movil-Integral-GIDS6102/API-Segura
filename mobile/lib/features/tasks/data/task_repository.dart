/// Implements task operations using the remote Task Manager API.
library;

import '../../../core/network/api_client.dart';
import '../domain/task.dart';

/// Separates UI state management from HTTP details.
class TaskRepository {
  /// Creates a repository using [_client].
  TaskRepository(this._client);

  final ApiClient _client;

  /// Fetches one page of the current user's tasks.
  Future<List<Task>> list({int page = 1, int limit = 50}) async {
    final result = await _client.send(
      'GET',
      'tasks?page=$page&limit=$limit',
    );
    final items = result['items'] as List<dynamic>? ?? [];
    return items
        .map((item) => Task.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Creates a task using its editable fields.
  Future<Task> create(String title, String? description) async {
    final result = await _client.send('POST', 'tasks', body: {
      'title': title.trim(),
      'description': description?.trim(),
    });
    return Task.fromJson(result['item'] as Map<String, dynamic>);
  }

  /// Updates editable fields (title, description, completed) on a task.
  Future<Task> update(
    String taskId, {
    String? title,
    String? description,
    bool? completed,
  }) async {
    final body = <String, dynamic>{};
    if (title != null) body['title'] = title.trim();
    if (description != null) body['description'] = description.trim();
    if (completed != null) body['completed'] = completed;

    final result = await _client.send(
      'PATCH',
      'tasks/${Uri.encodeComponent(taskId)}',
      body: body,
    );
    return Task.fromJson(result['item'] as Map<String, dynamic>);
  }

  /// Updates a task's completion state.
  Future<Task> setCompleted(Task task, bool completed) {
    return update(task.id, completed: completed);
  }

  /// Deletes a task by its identifier.
  Future<void> delete(String taskId) async {
    await _client.send('DELETE', 'tasks/${Uri.encodeComponent(taskId)}');
  }
}
