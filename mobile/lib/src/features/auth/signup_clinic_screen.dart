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

class SignupClinicScreen extends ConsumerStatefulWidget {
  const SignupClinicScreen({super.key});

  @override
  ConsumerState<SignupClinicScreen> createState() => _SignupClinicScreenState();
}

class _SignupClinicScreenState extends ConsumerState<SignupClinicScreen> {
  final _form = GlobalKey<FormState>();
  final _clinicName = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final flow = ref.read(signupFlowProvider);
    if (flow.email.isEmpty || flow.password.isEmpty || flow.fullName.isEmpty) {
      context.go('/signup');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dio = ref.read(dioProvider);
      final res = await dio.post('/api/v1/auth/register', data: {
        'email': flow.email,
        'password': flow.password,
        'full_name': flow.fullName,
        'role': 'doctor',
        'phone': flow.phone.isEmpty ? null : flow.phone,
        'clinic_name': _clinicName.text.trim(),
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
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.xl),
            children: [
              const AppBrandText(size: 34),
              const SizedBox(height: AppSpacing.sm),
              const Text('Create your clinic', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
              const SizedBox(height: AppSpacing.xs),
              const Text('Step 3 of 3 - Clinic setup', style: TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: AppSpacing.lg),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    AppTextField(
                      controller: _clinicName,
                      label: 'Clinic Name',
                      hintText: 'e.g. My Medical Clinic',
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Clinic name is required' : null,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    const Text(
                      'This will be your clinic name used across the system',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(_error!, style: const TextStyle(color: AppColors.danger)),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    AppPrimaryButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading ? const CircularProgressIndicator() : const Text('Create Clinic & Complete Registration'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton.icon(
                onPressed: () => context.go('/signup/role'),
                icon: const Icon(Icons.arrow_back, size: 16),
                label: const Text('Back to role selection'),
              )
            ],
          ),
        ),
      ),
    );
  }
}
