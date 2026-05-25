class AuthState {
  final bool loading;
  final bool authenticated;
  final String? error;

  const AuthState({this.loading = false, this.authenticated = false, this.error});

  AuthState copyWith({bool? loading, bool? authenticated, String? error}) {
    return AuthState(
      loading: loading ?? this.loading,
      authenticated: authenticated ?? this.authenticated,
      error: error,
    );
  }
}
