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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Today at a glance', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          const SizedBox(height: AppSpacing.sm),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cards.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: AppSpacing.sm,
              crossAxisSpacing: AppSpacing.sm,
              childAspectRatio: 1.35,
            ),
            itemBuilder: (context, index) {
              final c = cards[index];
              return Container(
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.border),
                ),
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: const Color(0xFFE8F0FE), borderRadius: BorderRadius.circular(10)),
                      child: Icon(c.$3, color: AppColors.primary, size: 16),
                    ),
                    Text(c.$2, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                    Text(c.$1, style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Quick actions', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontSize: 17)),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.tonalIcon(
                        onPressed: () => context.go('/patients/new'),
                        icon: const Icon(Icons.person_add_alt_1),
                        label: const Text('New Patient'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: FilledButton.tonalIcon(
                        onPressed: () => context.go('/appointments'),
                        icon: const Icon(Icons.calendar_month_outlined),
                        label: const Text('New Visit'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Today focus', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontSize: 17)),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Review ${data!['today_appointments'] ?? 0} appointments and follow up with recent patient visits.',
                  style: const TextStyle(color: AppColors.textMuted, height: 1.35),
                ),
                const SizedBox(height: AppSpacing.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F7FC),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: const Text('Tip: Tap Patients to review records quickly before each visit.', style: TextStyle(fontWeight: FontWeight.w600)),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
