import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import 'auth_controller.dart';
import '../shared/widgets/app_buttons.dart';
import '../shared/widgets/app_fields.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _clinicName = TextEditingController();
  final _invitationToken = TextEditingController();
  String _role = 'doctor';
  bool loading = false;
  String? error;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final payload = {
        'email': _email.text.trim(),
        'password': _password.text,
        'full_name': _fullName.text.trim(),
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'role': _role,
        'clinic_name': _role == 'doctor' ? _clinicName.text.trim() : null,
        'invitation_token': _role == 'assistant' ? _invitationToken.text.trim() : null,
      };
      final res = await dio.post('/api/v1/auth/register', data: payload);
      final data = Map<String, dynamic>.from(res.data as Map);
      await ref.read(tokenStorageProvider).write(data['access_token'] as String, data['refresh_token'] as String);
      ref.read(authControllerProvider.notifier).markAuthenticated();
      if (!mounted) return;
      context.go('/dashboard');
    } on DioException catch (e) {
      setState(() => error = e.response?.data.toString() ?? e.message ?? 'Failed to sign up');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Card(
            margin: const EdgeInsets.all(AppSpacing.lg),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Form(
                key: _form,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Text('MEDICA', style: TextStyle(letterSpacing: 1.4, fontWeight: FontWeight.w900, color: AppColors.primary)),
                    const SizedBox(height: AppSpacing.xs),
                    const Text('Create account', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _fullName,
                      label: 'Full Name',
                      validator: (v) => (v == null || v.trim().split(RegExp(r'\s+')).length < 2) ? 'Enter first and last name' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _email,
                      label: 'Email',
                      validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(controller: _phone, label: 'Phone'),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _password,
                      label: 'Password',
                      obscure: true,
                      validator: (v) => (v == null || v.length < 6) ? 'Minimum 6 characters' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'doctor', label: Text('Doctor')),
                        ButtonSegment(value: 'assistant', label: Text('Assistant')),
                      ],
                      selected: {_role},
                      onSelectionChanged: (v) => setState(() => _role = v.first),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (_role == 'doctor')
                      AppTextField(
                        controller: _clinicName,
                        label: 'Clinic Name',
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Clinic name is required for doctors' : null,
                      ),
                    if (_role == 'assistant')
                      AppTextField(
                        controller: _invitationToken,
                        label: 'Invitation Token',
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Invitation token is required for assistants' : null,
                      ),
                    if (error != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(error!, style: const TextStyle(color: AppColors.danger)),
                    ],
                    const SizedBox(height: AppSpacing.md),
                    AppPrimaryButton(
                      onPressed: loading ? null : _submit,
                      child: loading ? const CircularProgressIndicator() : const Text('Sign up'),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    TextButton(onPressed: () => context.go('/login'), child: const Text('Already have an account? Login')),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
