/// Defines the task data used by the Flutter application.
library;

/// Represents a task owned by the signed-in user.
class Task {
  /// Creates a task value.
  const Task({
    required this.id,
    required this.title,
    this.description,
    required this.completed,
  });

  /// Server-generated task identifier.
  final String id;

  /// Short task title.
  final String title;

  /// Optional task details.
  final String? description;

  /// Completion state.
  final bool completed;

  /// Creates a copy of the task with modified fields.
  Task copyWith({
    String? id,
    String? title,
    String? description,
    bool? completed,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
    );
  }

  /// Creates a task from the API JSON response.
  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      completed: json['completed'] as bool? ?? false,
    );
  }

  /// Converts editable fields into a request payload.
  Map<String, dynamic> toWriteJson() => {
        'title': title,
        'description': description,
        'completed': completed,
      };
}
