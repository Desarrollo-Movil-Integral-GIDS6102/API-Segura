library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_store.dart';
import '../data/auth_repository.dart';
import 'auth_state.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) {
  return TokenStore();
});

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  final httpClient = ref.watch(httpClientProvider);
  final tokens = ref.watch(tokenStoreProvider);
  return ApiClient(
    httpClient,
    tokens,
    onSessionExpired: () {
      ref.read(authStateProvider.notifier).signOutLocally();
    },
  );
});

final Provider<AuthRepository> authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  final tokens = ref.watch(tokenStoreProvider);
  return AuthRepository(client, tokens);
});

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(() => checkInitialSession());
    return const AuthState(status: AuthStatus.initial);
  }

  AuthRepository get _repository => ref.read(authRepositoryProvider);

  Future<void> checkInitialSession() async {
    final hasSession = await _repository.hasValidSession();
    state = state.copyWith(
      status: hasSession ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    );
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repository.login(email, password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        isLoading: false,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'An unexpected error occurred.',
      );
      return false;
    }
  }

  Future<bool> register(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repository.register(email, password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        isLoading: false,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      return false;
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'An unexpected error occurred.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void signOutLocally() {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authStateProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
