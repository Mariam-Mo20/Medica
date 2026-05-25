import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../auth/auth_controller.dart';
import '../shared/widgets/app_buttons.dart';
import '../shared/widgets/app_scaffold_template.dart';
import '../shared/widgets/async_states.dart';
import 'patient_models.dart';

class PatientsScreen extends ConsumerStatefulWidget {
  const PatientsScreen({super.key});

  @override
  ConsumerState<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends ConsumerState<PatientsScreen> {
  final searchCtrl = TextEditingController();
  bool loading = true;
  String? error;
  List<Patient> patients = [];

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  Future<void> _fetchPatients() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final q = searchCtrl.text.trim();
      final Response res;
      if (q.length >= 2) {
        res = await dio.get('/api/v1/patients/search', queryParameters: {'q': q});
      } else {
        res = await dio.get('/api/v1/patients/', queryParameters: {'limit': 100});
      }
      final list = (res.data as List).map((e) => Patient.fromJson(Map<String, dynamic>.from(e))).toList();
      patients = list;
    } on DioException catch (e) {
      error = e.response?.data.toString() ?? e.message ?? 'Failed to load patients';
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffoldTemplate(
      title: 'Patients',
      subtitle: 'Search and manage patients',
      actions: [
        IconButton(
          onPressed: () => context.go('/patients/new'),
          icon: const Icon(Icons.person_add_alt_1),
          tooltip: 'Add patient',
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Patient directory', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: AppSpacing.xs),
                TextField(
                  controller: searchCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Search by name or phone',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (_) => _fetchPatients(),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (loading)
            const LoadingState()
          else if (error != null)
            ErrorState(message: error!, onRetry: _fetchPatients)
          else if (patients.isEmpty)
            const EmptyState(message: 'No patients found', icon: Icons.people_outline)
          else
            Column(
              children: [
                for (final p in patients)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      onTap: () => context.go('/patients/${p.id}'),
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.border),
                        ),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: const Color(0xFFE8F0FE),
                              child: Text(
                                (p.firstName.isNotEmpty ? p.firstName[0] : 'P').toUpperCase(),
                                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.fullName, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontSize: 16)),
                                  const SizedBox(height: 4),
                                  Text('MRN: ${p.medicalRecordNumber ?? '-'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right),
                          ],
                        ),
                      ),
                    ),
                  )
              ],
            ),
          const SizedBox(height: AppSpacing.md),
          AppPrimaryButton(
            onPressed: () => context.go('/patients/new'),
            child: const Text('Add New Patient'),
          ),
        ],
      ),
    );
  }
}
