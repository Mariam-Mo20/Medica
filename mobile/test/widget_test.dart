import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:medica_mobile/src/app/app.dart';

void main() {
  testWidgets('app boots', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MedicaApp()));
    await tester.pump();
    expect(find.text('Welcome back'), findsOneWidget);
  });
}
