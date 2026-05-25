import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../shared/widgets/app_brand.dart';
import '../shared/widgets/app_buttons.dart';
import '../shared/widgets/app_fields.dart';
import 'auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.xl),
            children: [
              const AppBrandText(size: 34),
              const SizedBox(height: AppSpacing.sm),
              const Text('Welcome back', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800)),
              const SizedBox(height: AppSpacing.xs),
              const Text('Sign in to manage your clinic and patient flow.', style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
              const SizedBox(height: AppSpacing.xl),
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
                      controller: _email,
                      label: 'Email',
                      validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppTextField(
                      controller: _password,
                      label: 'Password',
                      obscure: true,
                      validator: (v) => (v == null || v.isEmpty) ? 'Password required' : null,
                    ),
                    if (state.error != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(state.error!, style: const TextStyle(color: AppColors.danger)),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    AppPrimaryButton(
                      onPressed: state.loading
                          ? null
                          : () async {
                              if (!_form.currentState!.validate()) return;
                              final ok = await ref.read(authControllerProvider.notifier).login(_email.text.trim(), _password.text);
                              if (!context.mounted) return;
                              if (ok) context.go('/dashboard');
                            },
                      child: state.loading ? const CircularProgressIndicator() : const Text('Login'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => context.go('/signup'),
                child: const Text('First time here? Sign up'),
              )
            ],
          ),
        ),
      ),
    );
  }
}
