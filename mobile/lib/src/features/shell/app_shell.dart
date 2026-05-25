import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/design_tokens.dart';
import '../auth/auth_controller.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = [
      ('/dashboard', 'Dashboard', Icons.dashboard_outlined),
      ('/patients', 'Patients', Icons.people_outline),
      ('/appointments', 'Appointments', Icons.calendar_month_outlined),
      ('/notifications', 'Notifications', Icons.notifications_none),
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
        title: const Text('Medica'),
        actions: [
          IconButton(
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
          )
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: ListView(
            children: [
              const ListTile(title: Text('Medica', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary))),
              const Divider(),
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
            ],
          ),
        ),
      ),
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        type: BottomNavigationBarType.fixed,
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
