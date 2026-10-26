import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/tasks/domain/task.dart';
import 'package:mobile/features/tasks/presentation/widgets/task_list_view.dart';

void main() {
  group('TaskListView Widget', () {
    testWidgets('renders loading indicator when loading and list is empty', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListView(
              loading: true,
              tasks: const [],
              errorMessage: null,
              onRetry: () {},
              onToggle: (_) {},
              onDelete: (_) {},
              onEdit: (_) {},
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('renders empty message when tasks are empty', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListView(
              loading: false,
              tasks: const [],
              errorMessage: null,
              onRetry: () {},
              onToggle: (_) {},
              onDelete: (_) {},
              onEdit: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('No tasks yet. Add your first task.'), findsOneWidget);
    });

    testWidgets('renders error message and retry button on failure', (tester) async {
      var retried = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListView(
              loading: false,
              tasks: const [],
              errorMessage: 'Network timeout occurred',
              onRetry: () => retried = true,
              onToggle: (_) {},
              onDelete: (_) {},
              onEdit: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('Network timeout occurred'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      await tester.tap(find.text('Retry'));
      expect(retried, true);
    });

    testWidgets('renders task item and triggers toggle on check', (tester) async {
      Task? toggledTask;
      const testTask = Task(
        id: '1',
        title: 'Complete documentation',
        description: 'Write README and API guide',
        completed: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TaskListView(
              loading: false,
              tasks: const [testTask],
              errorMessage: null,
              onRetry: () {},
              onToggle: (task) => toggledTask = task,
              onDelete: (_) {},
              onEdit: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('Complete documentation'), findsOneWidget);
      expect(find.text('Write README and API guide'), findsOneWidget);

      await tester.tap(find.byType(Checkbox));
      expect(toggledTask?.id, '1');
    });
  });
}
