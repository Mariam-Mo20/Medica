import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

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
        children: [
          AppSectionCard(
            title: 'Profile',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('MRN: ${patient!.medicalRecordNumber ?? '-'}'),
                Text('DOB: ${patient!.dateOfBirth}'),
                Text('Phone: ${patient!.phone ?? '-'}'),
                Text('Email: ${patient!.email ?? '-'}'),
                Text('Address: ${patient!.address ?? '-'}'),
              ],
            ),
          ),
          const SizedBox(height: 12),
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
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(r.diagnosis ?? 'Medical Visit', style: const TextStyle(fontWeight: FontWeight.w700)),
                                  const SizedBox(height: 4),
                                  Text(_fmt(r.createdAt), style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                                  const SizedBox(height: 6),
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
}
