import 'package:flutter/material.dart';

Color _bg(String status) {
  switch (status) {
    case 'checked_in':
      return const Color(0xFFEFF6FF);
    case 'in_progress':
      return const Color(0xFFF5F3FF);
    case 'completed':
      return const Color(0xFFECFDF5);
    default:
      return const Color(0xFFFFFBEB);
  }
}

Color _fg(String status) {
  switch (status) {
    case 'checked_in':
      return const Color(0xFF1D4ED8);
    case 'in_progress':
      return const Color(0xFF6D28D9);
    case 'completed':
      return const Color(0xFF047857);
    default:
      return const Color(0xFFB45309);
  }
}

class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: _bg(status), borderRadius: BorderRadius.circular(10)),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _fg(status)),
      ),
    );
  }
}
