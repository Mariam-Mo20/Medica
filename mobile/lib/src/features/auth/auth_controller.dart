import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/storage/token_storage.dart';
import 'auth_state.dart';

class AuthController extends StateNotifier<AuthState> {
  AuthController(this.ref) : super(const AuthState());

  final Ref ref;

  Future<void> bootstrap() async {
    final token = await ref.read(tokenStorageProvider).readAccess();
    if (token == null || token.isEmpty) return;
    state = state.copyWith(authenticated: true);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.post('/api/v1/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = Map<String, dynamic>.from(res.data as Map);
      await ref.read(tokenStorageProvider).write(data['access_token'] as String, data['refresh_token'] as String);
      state = state.copyWith(loading: false, authenticated: true);
      return true;
    } on DioException catch (e) {
      state = state.copyWith(loading: false, error: e.response?.data.toString() ?? e.message);
      return false;
    }
  }

  Future<void> logout() async {
    await ref.read(tokenStorageProvider).clear();
    state = const AuthState();
  }

  void markAuthenticated() {
    state = state.copyWith(authenticated: true);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref);
});

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final dioProvider = Provider<Dio>((ref) {
  final dio = ApiClient.create(baseUrl: 'https://medica-be45.onrender.com');
  dio.interceptors.clear();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await ref.read(tokenStorageProvider).readAccess();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ),
  );
  return dio;
});
