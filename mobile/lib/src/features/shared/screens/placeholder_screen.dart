import 'package:flutter/material.dart';

import '../../../app/design_tokens.dart';
import '../widgets/app_cards.dart';
import '../widgets/app_scaffold_template.dart';

class PlaceholderScreen extends StatelessWidget {
  final String title;
  final String subtitle;

  const PlaceholderScreen({super.key, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return AppScaffoldTemplate(
      title: title,
      subtitle: subtitle,
      body: const AppSectionCard(
        title: 'Coming Next',
        child: Text(
          'Foundation in place. This screen will be implemented in the next phase using shared widgets and consistent async states.',
          style: TextStyle(color: AppColors.textMuted),
        ),
      ),
    );
  }
}
