/// Provides environment-specific API configuration.
///
/// Values passed with `--dart-define` are app configuration, not secret storage.
library;

/// Holds the base URL for the selected development environment.
class AppConfig {
  /// Prevents creating configuration instances.
  const AppConfig._();

  /// Returns the API base URL supplied at build or run time.
  ///
  /// For Android emulator, use http://10.0.2.2:3000/api/v1.
  /// For local web/desktop or host, use http://localhost:3000/api/v1.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );
}
