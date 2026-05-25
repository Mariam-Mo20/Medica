import 'package:flutter/material.dart';

import '../../../app/design_tokens.dart';

class AppBrandText extends StatelessWidget {
  final double size;

  const AppBrandText({super.key, this.size = 28});

  @override
  Widget build(BuildContext context) {
    return Text(
      'Medica',
      style: TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w900,
        color: AppColors.primary,
        letterSpacing: 0.4,
      ),
    );
  }
}
