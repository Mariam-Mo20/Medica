import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../auth/auth_controller.dart';
import '../shared/widgets/app_buttons.dart';
import '../shared/widgets/app_fields.dart';
import '../shared/widgets/app_scaffold_template.dart';
import '../shared/widgets/async_states.dart';
import '../shared/widgets/date_input_formatter.dart';
import 'patient_models.dart';

class PatientFormScreen extends ConsumerStatefulWidget {
  final int? patientId;
  const PatientFormScreen({super.key, this.patientId});

  @override
  ConsumerState<PatientFormScreen> createState() => _PatientFormScreenState();
}

class _PatientFormScreenState extends ConsumerState<PatientFormScreen> {
  final _form = GlobalKey<FormState>();
  final fullName = TextEditingController();
  final dob = TextEditingController();
  final gender = TextEditingController();
  final phone = TextEditingController();
  final email = TextEditingController();
  final address = TextEditingController();

  bool loading = false;
  bool fetching = false;
  String? error;

  bool get isEdit => widget.patientId != null;

  @override
  void initState() {
    super.initState();
    if (isEdit) _fetchForEdit();
  }

  Future<void> _fetchForEdit() async {
    setState(() {
      fetching = true;
      error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get('/api/v1/patients/${widget.patientId}');
      final p = Patient.fromJson(Map<String, dynamic>.from(res.data as Map));
      fullName.text = p.fullName.trim();
      dob.text = _toDisplayDate(p.dateOfBirth);
      gender.text = p.gender ?? '';
      phone.text = p.phone ?? '';
      email.text = p.email ?? '';
      address.text = p.address ?? '';
    } on DioException catch (e) {
      error = e.response?.data.toString() ?? e.message ?? 'Failed to load patient';
    }
    if (mounted) setState(() => fetching = false);
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      loading = true;
      error = null;
    });

    final nameParts = fullName.text.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
    final firstName = nameParts.isNotEmpty ? nameParts.first : '';
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

    final payload = {
      'first_name': firstName,
      'last_name': lastName,
      'date_of_birth': _toBackendDate(dob.text.trim()),
      'gender': gender.text.trim().isEmpty ? null : gender.text.trim(),
      'phone': phone.text.trim().isEmpty ? null : phone.text.trim(),
      'email': email.text.trim().isEmpty ? null : email.text.trim(),
      'address': address.text.trim().isEmpty ? null : address.text.trim(),
    };

    try {
      final dio = ref.read(dioProvider);
      if (isEdit) {
        await dio.put('/api/v1/patients/${widget.patientId}', data: payload);
      } else {
        await dio.post('/api/v1/patients/', data: payload);
      }
      if (!mounted) return;
      final target = isEdit ? '/patients/${widget.patientId}' : '/patients';
      context.go(target);
    } on DioException catch (e) {
      setState(() => error = e.response?.data.toString() ?? e.message ?? 'Failed to save patient');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (fetching) return const Scaffold(body: LoadingState());
    if (error != null && isEdit && fullName.text.isEmpty) {
      return Scaffold(body: ErrorState(message: error!, onRetry: _fetchForEdit));
    }

    return AppScaffoldTemplate(
      title: isEdit ? 'Edit Patient' : 'Add Patient',
      subtitle: 'Single-column mobile form',
      body: Form(
        key: _form,
        child: Column(
          children: [
            AppTextField(
              controller: fullName,
              label: 'Full Name',
              validator: (v) {
                final parts = (v ?? '').trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
                if (parts.length < 2) return 'Enter first and last name';
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            AppTextField(
              controller: dob,
              label: 'Date of Birth',
              hintText: 'DD-MM-YYYY',
              keyboardType: TextInputType.number,
              inputFormatters: [DateInputFormatter()],
              maxLength: 10,
              validator: (v) {
                final value = (v ?? '').trim();
                if (value.isEmpty) return 'Date of birth is required';
                if (!RegExp(r'^\d{2}-\d{2}-\d{4}\$').hasMatch(value)) {
                  return 'Use DD-MM-YYYY';
                }
                if (!_isValidDisplayDate(value)) return 'Enter a valid date';
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            AppTextField(controller: gender, label: 'Gender'),
            const SizedBox(height: AppSpacing.md),
            AppTextField(controller: phone, label: 'Phone'),
            const SizedBox(height: AppSpacing.md),
            AppTextField(controller: email, label: 'Email'),
            const SizedBox(height: AppSpacing.md),
            AppTextField(controller: address, label: 'Address', maxLines: 2),
            if (error != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(error!, style: const TextStyle(color: AppColors.danger)),
            ],
            const SizedBox(height: AppSpacing.md),
            AppPrimaryButton(
              onPressed: loading ? null : _submit,
              child: loading ? const CircularProgressIndicator() : Text(isEdit ? 'Save Changes' : 'Create Patient'),
            ),
          ],
        ),
      ),
    );
  }

  String _toDisplayDate(String backendDate) {
    final parts = backendDate.split('-');
    if (parts.length != 3) return backendDate;
    final year = parts[0];
    final month = parts[1];
    final day = parts[2];
    if (year.length != 4 || month.length != 2 || day.length != 2) return backendDate;
    return '$day-$month-$year';
  }

  String _toBackendDate(String displayDate) {
    final parts = displayDate.split('-');
    if (parts.length != 3) return displayDate;
    final day = parts[0];
    final month = parts[1];
    final year = parts[2];
    return '$year-$month-$day';
  }

  bool _isValidDisplayDate(String value) {
    final parts = value.split('-');
    if (parts.length != 3) return false;

    final day = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final year = int.tryParse(parts[2]);
    if (day == null || month == null || year == null) return false;
    if (year < 1900 || year > 2100) return false;

    final date = DateTime.tryParse('${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}');
    if (date == null) return false;
    return date.year == year && date.month == month && date.day == day;
  }
}
