import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/design_tokens.dart';
import '../auth/auth_controller.dart';
import '../shared/widgets/app_cards.dart';
import '../shared/widgets/app_scaffold_template.dart';
import '../shared/widgets/async_states.dart';
import 'patient_models.dart';

class PatientDetailScreen extends ConsumerStatefulWidget {
  final int patientId;
  const PatientDetailScreen({super.key, required this.patientId});

  @override
  ConsumerState<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends ConsumerState<PatientDetailScreen> {
  bool loading = true;
  String? error;
  Patient? patient;
  List<MedicalRecord> records = [];

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
      final pRes = await dio.get('/api/v1/patients/${widget.patientId}');
      patient = Patient.fromJson(Map<String, dynamic>.from(pRes.data as Map));

      final rRes = await dio.get('/api/v1/medical-records/patient/${widget.patientId}');
      records = (rRes.data as List).map((e) => MedicalRecord.fromJson(Map<String, dynamic>.from(e))).toList();
    } on DioException catch (e) {
      error = e.response?.data.toString() ?? e.message ?? 'Failed to load patient';
    }
    if (mounted) setState(() => loading = false);
  }

  String _fmt(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('dd MMM yyyy, hh:mm a').format(dt.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: LoadingState());
    if (error != null) return Scaffold(body: ErrorState(message: error!, onRetry: _fetch));
    if (patient == null) return const Scaffold(body: EmptyState(message: 'Patient not found', icon: Icons.person_off_outlined));

    return AppScaffoldTemplate(
      title: patient!.fullName,
      subtitle: 'Patient details and visits',
      actions: [
        IconButton(onPressed: () => context.go('/patients/${patient!.id}/edit'), icon: const Icon(Icons.edit_outlined), tooltip: 'Edit patient'),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F7FC),
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(patient!.fullName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: AppSpacing.xs),
                Text('MRN ${patient!.medicalRecordNumber ?? '-'}', style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppSectionCard(
            title: 'Profile',
            child: Column(
              children: [
                _kv('Date of Birth', patient!.dateOfBirth),
                _kv('Phone', patient!.phone ?? '-'),
                _kv('Email', patient!.email ?? '-'),
                _kv('Address', patient!.address ?? '-'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppSectionCard(
            title: 'Visits',
            child: records.isEmpty
                ? const EmptyState(message: 'No visits found for this patient', icon: Icons.event_note_outlined)
                : Column(
                    children: [
                      for (final r in records)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Card(
                            margin: EdgeInsets.zero,
                            child: Padding(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(r.diagnosis ?? 'Medical Visit', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                  const SizedBox(height: 4),
                                  Text(_fmt(r.createdAt), style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(r.symptoms ?? '-'),
                                  const SizedBox(height: 4),
                                  Text(r.visitNotes ?? '-'),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w700)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
