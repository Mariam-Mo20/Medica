import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../shared/widgets/app_brand.dart';
import '../auth/auth_controller.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = [
      ('/dashboard', 'Dashboard', Icons.dashboard_outlined),
      ('/patients', 'Patients', Icons.people_outline),
      ('/appointments', 'Visits', Icons.calendar_month_outlined),
      ('/notifications', 'Alerts', Icons.notifications_none),
      ('/more', 'More', Icons.menu),
    ];
    final path = GoRouterState.of(context).uri.path;
    final idx = items.indexWhere((e) => path.startsWith(e.$1));
    final currentIndex = idx < 0 ? 0 : idx;

    final isNestedPatient = path.startsWith('/patients/') && path != '/patients';
    final isNestedAppointment = path.startsWith('/appointments/') && path != '/appointments';
    final showBack = isNestedPatient || isNestedAppointment;

    return Scaffold(
      appBar: AppBar(
        leading: showBack
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (isNestedPatient) {
                    context.go('/patients');
                    return;
                  }
                  if (isNestedAppointment) {
                    context.go('/appointments');
                    return;
                  }
                  context.pop();
                },
              )
            : null,
        title: const AppBrandText(size: 30),
      ),
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.md),
              const AppBrandText(size: 32),
              const SizedBox(height: AppSpacing.sm),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F7FC),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('City Clinic', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                      SizedBox(height: 4),
                      Text('Doctor account', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('About Medica'),
                onTap: () => Navigator.pop(context),
              ),
              ListTile(
                leading: const Icon(Icons.support_agent_outlined),
                title: const Text('Support'),
                onTap: () => Navigator.pop(context),
              ),
              const Spacer(),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.settings_outlined),
                title: const Text('Settings'),
                onTap: () {
                  Navigator.pop(context);
                  context.go('/more');
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Logout'),
                onTap: () {
                  Navigator.pop(context);
                  ref.read(authControllerProvider.notifier).logout();
                  context.go('/login');
                },
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        ),
      ),
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
        selectedFontSize: 12,
        unselectedFontSize: 11,
        iconSize: 21,
        onTap: (i) => context.go(items[i].$1),
        items: items
            .map((e) => BottomNavigationBarItem(
                  icon: Icon(e.$3),
                  label: e.$2,
                ))
            .toList(),
      ),
    );
  }
}
