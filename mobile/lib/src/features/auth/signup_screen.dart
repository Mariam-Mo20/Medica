import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../shared/widgets/app_brand.dart';
import '../shared/widgets/app_buttons.dart';
import '../shared/widgets/app_fields.dart';
import 'signup_flow_state.dart';

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
  final _confirmPassword = TextEditingController();

  @override
  void initState() {
    super.initState();
    final flow = ref.read(signupFlowProvider);
    _fullName.text = flow.fullName;
    _email.text = flow.email;
    _phone.text = flow.phone;
    _password.text = flow.password;
    _confirmPassword.text = flow.password;
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
              const Text('Create account', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
              const SizedBox(height: AppSpacing.xs),
              const Text('Step 1 of 3 - Personal details', style: TextStyle(color: AppColors.textMuted)),
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
                      controller: _fullName,
                      label: 'Full Name',
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Full name is required' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _email,
                      label: 'Email',
                      validator: (v) {
                        final value = (v ?? '').trim();
                        if (value.isEmpty) return 'Valid email required';
                        if (!value.contains('@') || !value.contains('.')) return 'Valid email required';
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(controller: _phone, label: 'Phone (optional)'),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _password,
                      label: 'Password',
                      obscure: true,
                      validator: (v) => (v == null || v.length < 6) ? 'Minimum 6 characters' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _confirmPassword,
                      label: 'Confirm Password',
                      obscure: true,
                      validator: (v) => (v != _password.text) ? 'Passwords do not match' : null,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppPrimaryButton(
                      onPressed: () {
                        if (!_form.currentState!.validate()) return;
                        ref.read(signupFlowProvider.notifier).setStep1(
                              email: _email.text.trim(),
                              password: _password.text,
                              fullName: _fullName.text.trim(),
                              phone: _phone.text.trim(),
                              invitationToken: '',
                            );
                        context.go('/signup/role');
                      },
                      child: const Text('Continue'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(onPressed: () => context.go('/login'), child: const Text('Already have an account? Login')),
            ],
          ),
        ),
      ),
    );
  }
}
