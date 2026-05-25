import 'package:flutter/material.dart';

import '../../../app/design_tokens.dart';

class AppScaffoldTemplate extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget body;
  final List<Widget>? actions;

  const AppScaffoldTemplate({
    super.key,
    required this.title,
    this.subtitle,
    required this.body,
    this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                    if (subtitle != null)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpacing.xs),
                        child: Text(subtitle!, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      ),
                  ],
                ),
              ),
              if (actions != null) ...actions!,
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          body,
        ],
      ),
    );
  }
}
