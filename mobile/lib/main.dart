import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/auth/presentation/auth_controller.dart';
import 'features/auth/presentation/auth_state.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/tasks/presentation/task_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: SecureTaskManagerApp()));
}

class SecureTaskManagerApp extends ConsumerWidget {
  const SecureTaskManagerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    Widget homeWidget;
    switch (authState.status) {
      case AuthStatus.authenticated:
        homeWidget = const TaskPage();
        break;
      case AuthStatus.unauthenticated:
        homeWidget = const LoginPage();
        break;
      case AuthStatus.initial:
        homeWidget = const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
        break;
    }

    return MaterialApp(
      title: 'Secure Task Manager',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.indigo,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.indigo,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system,
      home: homeWidget,
    );
  }
}
