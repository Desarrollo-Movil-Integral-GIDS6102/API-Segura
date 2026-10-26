import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/tasks/domain/task.dart';

void main() {
  group('Task model', () {
    test('correctly deserializes from JSON', () {
      final json = {
        'id': 'task-123',
        'title': 'Test Task',
        'description': 'Test Description',
        'completed': true,
      };

      final task = Task.fromJson(json);

      expect(task.id, 'task-123');
      expect(task.title, 'Test Task');
      expect(task.description, 'Test Description');
      expect(task.completed, true);
    });

    test('toWriteJson excludes internal fields like id and ownerId', () {
      const task = Task(
        id: 'task-123',
        title: 'Save Payload',
        description: 'Details',
        completed: false,
      );

      final json = task.toWriteJson();

      expect(json, {
        'title': 'Save Payload',
        'description': 'Details',
        'completed': false,
      });
      expect(json.containsKey('id'), false);
      expect(json.containsKey('ownerId'), false);
    });

    test('copyWith updates properties properly', () {
      const task = Task(
        id: 'task-1',
        title: 'Original Title',
        description: null,
        completed: false,
      );

      final updated = task.copyWith(
        title: 'New Title',
        completed: true,
      );

      expect(updated.id, 'task-1');
      expect(updated.title, 'New Title');
      expect(updated.completed, true);
    });
  });
}
