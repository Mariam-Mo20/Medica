import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth_controller.dart';
import 'router.dart';
import 'theme.dart';

class MedicaApp extends ConsumerStatefulWidget {
  const MedicaApp({super.key});

  @override
  ConsumerState<MedicaApp> createState() => _MedicaAppState();
}

class _MedicaAppState extends ConsumerState<MedicaApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authControllerProvider.notifier).bootstrap());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Medica Mobile',
      theme: buildTheme(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
