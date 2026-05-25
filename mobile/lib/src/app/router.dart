import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/patients/patient_detail_screen.dart';
import '../features/patients/patient_form_screen.dart';
import '../features/patients/patients_screen.dart';
import '../features/shared/screens/placeholder_screen.dart';
import '../features/shell/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';
      if (!auth.authenticated && !isAuthRoute) return '/login';
      if (auth.authenticated && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),
      ShellRoute(
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/patients', builder: (_, __) => const PatientsScreen()),
          GoRoute(path: '/patients/new', builder: (_, __) => const PatientFormScreen()),
          GoRoute(path: '/patients/:id/edit', builder: (_, s) => PatientFormScreen(patientId: int.parse(s.pathParameters['id']!))),
          GoRoute(path: '/patients/:id', builder: (_, s) => PatientDetailScreen(patientId: int.parse(s.pathParameters['id']!))),
          GoRoute(path: '/appointments', builder: (_, __) => const PlaceholderScreen(title: 'Appointments', subtitle: 'Schedule and update status')),
          GoRoute(path: '/notifications', builder: (_, __) => const PlaceholderScreen(title: 'Notifications', subtitle: 'Inbox and unread updates')),
          GoRoute(path: '/more', builder: (_, __) => const PlaceholderScreen(title: 'More', subtitle: 'Settings and role-specific tools')),
        ],
      ),
    ],
  );
});
