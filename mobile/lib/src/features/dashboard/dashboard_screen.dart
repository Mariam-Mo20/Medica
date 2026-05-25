import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../auth/auth_controller.dart';
import '../shared/widgets/app_cards.dart';
import '../shared/widgets/app_scaffold_template.dart';
import '../shared/widgets/async_states.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  bool loading = true;
  String? error;
  Map<String, dynamic>? data;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get('/api/v1/dashboard/');
      data = Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      error = e.response?.data.toString() ?? e.message ?? 'Failed to load dashboard';
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: LoadingState());
    if (error != null) return Scaffold(body: ErrorState(message: error!, onRetry: _fetch));
    if (data == null) return const Scaffold(body: EmptyState(message: 'No dashboard data available'));

    final cards = [
      ('Total Patients', '${data!['total_patients'] ?? 0}', Icons.people_outline),
      ('Patients Today', '${data!['patients_today'] ?? 0}', Icons.person_add_alt_1),
      ('Appointments Today', '${data!['today_appointments'] ?? 0}', Icons.calendar_month_outlined),
      ('Completed', '${data!['completed_appointments'] ?? 0}', Icons.check_circle_outline),
    ];

    return AppScaffoldTemplate(
      title: 'Dashboard',
      subtitle: 'Today clinic overview',
      body: Column(
        children: [
          for (final c in cards)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: AppSectionCard(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F0FE),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(c.$3, color: AppColors.primary, size: 18),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.$1, style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(c.$2, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: AppSpacing.sm),
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Quick actions', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => context.go('/patients/new'),
                        icon: const Icon(Icons.person_add_alt_1),
                        label: const Text('New Patient'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => context.go('/appointments'),
                        icon: const Icon(Icons.calendar_month_outlined),
                        label: const Text('Appointments'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Today focus', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                const SizedBox(height: 6),
                Text(
                  'Review ${data!['today_appointments'] ?? 0} appointments and follow up with recent patient visits.',
                  style: const TextStyle(color: AppColors.textMuted, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
