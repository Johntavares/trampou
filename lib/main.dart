import 'package:flutter/material.dart';
import 'screens/main_navigation_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GoParauapebasApp());
}

class GoParauapebasApp extends StatelessWidget {
  const GoParauapebasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GO Parauapebas',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const MainNavigationScreen(),
    );
  }
}
