import 'package:flutter/material.dart';

class AppPrimaryButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;

  const AppPrimaryButton({super.key, required this.onPressed, required this.child});

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: double.infinity, child: FilledButton(onPressed: onPressed, child: child));
  }
}

class AppSecondaryButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;

  const AppSecondaryButton({super.key, required this.onPressed, required this.child});

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: double.infinity, child: OutlinedButton(onPressed: onPressed, child: child));
  }
}
