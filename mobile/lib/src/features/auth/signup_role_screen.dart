import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../shared/widgets/app_brand.dart';
import '../shared/widgets/app_buttons.dart';
import '../shared/widgets/app_fields.dart';
import 'auth_controller.dart';
import 'signup_flow_state.dart';

class SignupRoleScreen extends ConsumerStatefulWidget {
  const SignupRoleScreen({super.key});

  @override
  ConsumerState<SignupRoleScreen> createState() => _SignupRoleScreenState();
}

class _SignupRoleScreenState extends ConsumerState<SignupRoleScreen> {
  String _role = 'doctor';
  final _invite = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final flow = ref.read(signupFlowProvider);
    _invite.text = flow.invitationToken;
    if (flow.invitationToken.trim().isNotEmpty) _role = 'assistant';
  }

  Future<void> _continue() async {
    final flow = ref.read(signupFlowProvider);
    if (flow.email.isEmpty || flow.password.isEmpty || flow.fullName.isEmpty) {
      context.go('/signup');
      return;
    }

    if (_role == 'doctor') {
      ref.read(signupFlowProvider.notifier).setStep1(
            email: flow.email,
            password: flow.password,
            fullName: flow.fullName,
            phone: flow.phone,
            invitationToken: '',
          );
      context.go('/signup/clinic');
      return;
    }

    var token = _invite.text.trim();
    if (token.isEmpty) {
      setState(() => _error = 'Invitation token is required for assistant registration');
      return;
    }

    try {
      final parsed = Uri.tryParse(token);
      if (parsed != null && (parsed.scheme == 'http' || parsed.scheme == 'https')) {
        token = parsed.queryParameters['token'] ?? token;
      }
    } catch (_) {}

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dio = ref.read(dioProvider);
      final check = await dio.get('/api/v1/invitations/check', queryParameters: {'token': token});
      final valid = (check.data as Map)['valid'] == true;
      if (!valid) {
        setState(() => _error = ((check.data as Map)['message'] ?? 'Invalid invitation token').toString());
        return;
      }

      final res = await dio.post('/api/v1/auth/register', data: {
        'email': flow.email,
        'password': flow.password,
        'full_name': flow.fullName,
        'role': 'assistant',
        'phone': flow.phone.isEmpty ? null : flow.phone,
        'invitation_token': token,
      });

      final data = Map<String, dynamic>.from(res.data as Map);
      await ref.read(tokenStorageProvider).write(data['access_token'] as String, data['refresh_token'] as String);
      ref.read(signupFlowProvider.notifier).clear();
      ref.read(authControllerProvider.notifier).markAuthenticated();
      if (!mounted) return;
      context.go('/dashboard');
    } on DioException catch (e) {
      setState(() => _error = e.response?.data.toString() ?? e.message ?? 'Registration failed');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.xl),
          children: [
            const AppBrandText(size: 34),
            const SizedBox(height: AppSpacing.sm),
            const Text('Choose your role', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
            const SizedBox(height: AppSpacing.xs),
            const Text('Step 2 of 3 - How you join Medica', style: TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: AppSpacing.lg),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'doctor', label: Text('Doctor')),
                      ButtonSegment(value: 'assistant', label: Text('Assistant')),
                    ],
                    selected: {_role},
                    onSelectionChanged: (v) => setState(() => _role = v.first),
                  ),
                  if (_role == 'assistant') ...[
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(controller: _invite, label: 'Invitation Link or Token'),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  AppPrimaryButton(
                    onPressed: _loading ? null : _continue,
                    child: _loading
                        ? const CircularProgressIndicator()
                        : Text(_role == 'doctor' ? 'Continue to Clinic Setup' : 'Complete Registration'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton.icon(
              onPressed: () => context.go('/signup'),
              icon: const Icon(Icons.arrow_back, size: 16),
              label: const Text('Back to signup'),
            )
          ],
        ),
      ),
    );
  }
}
